import os
import sys
import csv
import cv2
import numpy as np
import easyocr
from ultralytics import YOLO
from pathlib import Path
from plate_validator import normalize_plate

MAX_MISSING_FRAMES = 15  # Grace period: ~0.5 sec at 30fps
MIN_FRAMES_TRACKED = 5   # Filter out false-positive blips seen < 5 frames

_MODEL = None
_READER = None

def get_yolo_model(model_path: str):
    global _MODEL
    if _MODEL is None:
        _MODEL = YOLO(model_path)
    return _MODEL

def get_easyocr_reader():
    global _READER
    if _READER is None:
        _READER = easyocr.Reader(['en'], gpu=False)
    return _READER

def get_preprocessing_variants(img):
    """
    Generates multiple preprocessing variants for a plate crop.
    Reused exactly from detect_and_ocr.py / detect_video.py.
    """
    variants = {}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    enlarged = cv2.resize(gray, (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)
    variants['original'] = enlarged

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    clahe_img = clahe.apply(enlarged)
    variants['clahe'] = clahe_img

    denoised = cv2.fastNlMeansDenoising(clahe_img, None, 10, 7, 21)
    variants['denoise'] = denoised

    adaptive = cv2.adaptiveThreshold(enlarged, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 11, 2)
    variants['adaptive'] = adaptive

    _, otsu = cv2.threshold(enlarged, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants['otsu'] = otsu

    return variants

def process_ocr_blocks(ocr_res):
    """
    Sorts OCR blocks from left to right and concatenates text.
    Reused exactly from detect_and_ocr.py / detect_video.py.
    """
    if not ocr_res:
        return "", 0.0

    sorted_res = sorted(ocr_res, key=lambda x: (x[0][0][0] + x[0][2][0]) / 2)
    combined_text = " ".join([res[1] for res in sorted_res])
    combined_conf = float(np.mean([res[2] for res in sorted_res]))

    return combined_text.strip(), combined_conf

def select_best_reading(readings):
    """
    Selection logic per track_id using strict priority order:
    1. Among all readings for this track where matches_format == True, if any exist,
       pick the one with highest confidence among those.
    2. Only if NO reading for this track ever matched format, fall back to picking
       highest raw confidence overall.
    """
    if not readings:
        return {"text": "UNKNOWN", "confidence": 0.0, "matches_format": False}

    valid_readings = [r for r in readings if r.get("matches_format", False)]
    if valid_readings:
        best = max(valid_readings, key=lambda r: r["confidence"])
        return {
            "text": best["text"],
            "confidence": best["confidence"],
            "matches_format": True
        }
    else:
        best = max(readings, key=lambda r: r["confidence"])
        return {
            "text": best["text"],
            "confidence": best["confidence"],
            "matches_format": False
        }

def format_timestamp(seconds):
    """
    Formats seconds float to HH:MM:SS.mmm string.
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def print_candidate_readings(tid, readings, best_reading):
    """
    Prints the full list of candidate readings considered for a finalized track.
    """
    print(f"  Candidate readings considered for Track {tid} ({len(readings)} total reads):", flush=True)
    if not readings:
        print("    (No OCR readings recorded)", flush=True)
        return

    summary = {}
    for r in readings:
        key = (r["text"], r["matches_format"])
        if key not in summary:
            summary[key] = {"text": r["text"], "confidence": r["confidence"], "matches_format": r["matches_format"], "count": 1}
        else:
            summary[key]["count"] += 1
            if r["confidence"] > summary[key]["confidence"]:
                summary[key]["confidence"] = r["confidence"]

    sorted_candidates = sorted(summary.values(), key=lambda x: (not x["matches_format"], -x["confidence"]))

    best_text = best_reading["text"]
    best_fmt = best_reading["matches_format"]
    best_conf = best_reading["confidence"]

    for cand in sorted_candidates:
        is_winner = (cand["text"] == best_text and cand["matches_format"] == best_fmt and abs(cand["confidence"] - best_conf) < 1e-5)
        winner_mark = " -> WINNER (Selected Best Reading)" if is_winner else ""
        print(f"    - Text: '{cand['text']}', Conf: {cand['confidence']:.4f}, Matched Format: {cand['matches_format']} (Seen {cand['count']}x){winner_mark}", flush=True)

def process_video(video_path: str, camera_id: str = "CAM_01", verbose: bool = True) -> list[dict]:
    """
    Processes a video file using YOLOv8 detection, ByteTrack tracking, EasyOCR,
    and plate_validator, returning a list of finalized vehicle detection event dicts.
    """
    base_dir = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform"
    model_path = os.path.join(base_dir, r"runs\detect\runs\detect\plate_detector\weights\best.pt")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"YOLO model weights not found at '{model_path}'")

    model = get_yolo_model(model_path)
    reader = get_easyocr_reader()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file '{video_path}'")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tracks = {}
    all_seen_track_ids = set()
    finalized_events = []
    frame_count = 0

    if verbose:
        print(f"Starting tracking... (FPS: {fps:.2f}, Total Frames: {total_video_frames}, Grace Period: {MAX_MISSING_FRAMES} frames, Min Seen: {MIN_FRAMES_TRACKED} frames)", flush=True)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        frame_count += 1

        results = model.track(source=frame, conf=0.5, iou=0.5, persist=True, tracker="bytetrack.yaml", verbose=False)
        result = results[0]
        boxes = result.boxes

        frame_visible_track_ids = set()

        if boxes is not None and len(boxes) > 0:
            for box in boxes:
                track_id = None
                if box.id is not None and len(box.id) > 0:
                    raw_id = box.id[0]
                    track_id = int(raw_id.item() if hasattr(raw_id, 'item') else raw_id)

                if track_id is None:
                    continue

                frame_visible_track_ids.add(track_id)

                coords = box.xyxy[0].cpu().numpy().astype(int)
                h, w, _ = frame.shape
                margin = 5
                x1, y1 = max(0, coords[0] - margin), max(0, coords[1] - margin)
                x2, y2 = min(w, coords[2] + margin), min(h, coords[3] + margin)
                crop = frame[y1:y2, x1:x2]

                if crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
                    continue

                variants = get_preprocessing_variants(crop)

                if track_id not in tracks:
                    tracks[track_id] = {
                        "readings": [],
                        "first_frame_seen": frame_count - 1,
                        "last_frame_seen": frame_count - 1,
                        "frames_seen_count": 1,
                        "frames_missing": 0
                    }
                    all_seen_track_ids.add(track_id)
                else:
                    tracks[track_id]["last_frame_seen"] = frame_count - 1
                    tracks[track_id]["frames_seen_count"] += 1
                    tracks[track_id]["frames_missing"] = 0

                for var_name, var_img in variants.items():
                    ocr_res = reader.readtext(var_img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                    raw_text, conf = process_ocr_blocks(ocr_res)
                    if raw_text:
                        corrected_text, was_corrected, matches_format = normalize_plate(raw_text)
                        if corrected_text:
                            tracks[track_id]["readings"].append({
                                "text": corrected_text,
                                "confidence": conf,
                                "matches_format": matches_format,
                                "frame": frame_count,
                                "variant": var_name
                            })

        # Process missing counters and finalize tracks exceeding grace period
        active_tids = list(tracks.keys())
        for tid in active_tids:
            if tid not in frame_visible_track_ids:
                tracks[tid]["frames_missing"] += 1

            if tracks[tid]["frames_missing"] > MAX_MISSING_FRAMES:
                best_reading = select_best_reading(tracks[tid]["readings"])
                total_seen = tracks[tid]["frames_seen_count"]
                plate = best_reading["text"]
                conf = best_reading["confidence"]
                matched_fmt = best_reading["matches_format"]

                if total_seen >= MIN_FRAMES_TRACKED:
                    first_secs = tracks[tid]["first_frame_seen"] / fps if fps > 0 else 0.0
                    last_secs = tracks[tid]["last_frame_seen"] / fps if fps > 0 else 0.0
                    first_ts = format_timestamp(first_secs)
                    last_ts = format_timestamp(last_secs)

                    event = {
                        "plate_text": plate if plate else "UNKNOWN",
                        "confidence": round(float(conf), 4),
                        "camera_id": camera_id,
                        "first_seen_timestamp": first_ts,
                        "last_seen_timestamp": last_ts,
                        "matched_format": matched_fmt
                    }
                    finalized_events.append(event)

                    if verbose:
                        print(f"[FINALIZED] Track {tid} | Plate: {plate} | Conf: {conf:.4f} | Matched Format: {matched_fmt} | Total frames seen: {total_seen}", flush=True)
                        print_candidate_readings(tid, tracks[tid]["readings"], best_reading)
                else:
                    if verbose:
                        print(f"[DISCARDED] Track {tid} | Plate: {plate} | Conf: {conf:.4f} | Matched Format: {matched_fmt} | Total frames seen: {total_seen} (< {MIN_FRAMES_TRACKED} frames)", flush=True)
                        print_candidate_readings(tid, tracks[tid]["readings"], best_reading)

                del tracks[tid]

        if verbose:
            current_active = sorted(list(tracks.keys()))
            t_strings = []
            for tid in current_active:
                best_reading = select_best_reading(tracks[tid]["readings"])
                t_text = best_reading["text"]
                t_conf = best_reading["confidence"]
                t_fmt = best_reading["matches_format"]
                t_strings.append(f"T{tid}={t_text}({t_conf:.2f}, fmt={t_fmt})")
            t_str = " ".join(t_strings)
            print(f"Frame {frame_count} | Active tracks: {current_active} | {t_str}", flush=True)

    # End of video finalization
    remaining_tids = sorted(list(tracks.keys()))
    for tid in remaining_tids:
        best_reading = select_best_reading(tracks[tid]["readings"])
        total_seen = tracks[tid]["frames_seen_count"]
        plate = best_reading["text"]
        conf = best_reading["confidence"]
        matched_fmt = best_reading["matches_format"]

        if total_seen >= MIN_FRAMES_TRACKED:
            first_secs = tracks[tid]["first_frame_seen"] / fps if fps > 0 else 0.0
            last_secs = tracks[tid]["last_frame_seen"] / fps if fps > 0 else 0.0
            first_ts = format_timestamp(first_secs)
            last_ts = format_timestamp(last_secs)

            event = {
                "plate_text": plate if plate else "UNKNOWN",
                "confidence": round(float(conf), 4),
                "camera_id": camera_id,
                "first_seen_timestamp": first_ts,
                "last_seen_timestamp": last_ts,
                "matched_format": matched_fmt
            }
            finalized_events.append(event)

            if verbose:
                print(f"[FINALIZED] Track {tid} | Plate: {plate} | Conf: {conf:.4f} | Matched Format: {matched_fmt} | Total frames seen: {total_seen}", flush=True)
                print_candidate_readings(tid, tracks[tid]["readings"], best_reading)
        else:
            if verbose:
                print(f"[DISCARDED] Track {tid} | Plate: {plate} | Conf: {conf:.4f} | Matched Format: {matched_fmt} | Total frames seen: {total_seen} (< {MIN_FRAMES_TRACKED} frames)", flush=True)
                print_candidate_readings(tid, tracks[tid]["readings"], best_reading)

        del tracks[tid]

    cap.release()

    if verbose:
        print("\n========================================", flush=True)
        print("VIDEO PROCESSING COMPLETE", flush=True)
        print("========================================", flush=True)
        print(f"Video: {video_path}", flush=True)
        print(f"FPS: {fps:.2f}", flush=True)
        print(f"Total frames: {frame_count}", flush=True)
        print(f"Unique track IDs/events: {len(all_seen_track_ids)}", flush=True)
        print(f"Events written: {len(finalized_events)}", flush=True)
        print("========================================\n", flush=True)

    return finalized_events
