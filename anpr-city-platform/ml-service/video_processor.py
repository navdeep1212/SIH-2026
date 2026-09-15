import os
import sys
import csv
import time
import math
import cv2
import numpy as np
import torch
import easyocr
from ultralytics import YOLO
from pathlib import Path
from plate_validator import normalize_plate, consensus_plate_readings
from vehicle_constants import VEHICLE_TYPES, VEHICLE_COLORS
from type_classifier import classify_vehicle_type
from color_classifier import classify_vehicle_color

# Allocate PyTorch CPU threads for maximum throughput without starving the system
_NUM_THREADS = min(8, max(1, (os.cpu_count() or 4) - 2))
torch.set_num_threads(_NUM_THREADS)

# ANPR Pipeline Hyperparameters (Full-Frame Lossless Processing)
FRAME_STRIDE = 1         # Full temporal resolution: 100% of frames processed
MAX_MISSING_FRAMES = 12  # Grace period before finalizing track
MIN_FRAMES_TRACKED = 5   # Minimum frames to establish track
MAX_INFERENCE_DIM = 1280 # Scale limit for vehicle detection
VEHICLE_CLASS_IDS = [2, 3, 5, 7]  # Car, Motorcycle, Bus, Truck

IGNORED_WORDS = {
    'CAMERA', 'CAM', 'TATA', 'ASHOK', 'LEYLAND', 'SERVICE', 'MARUTI',
    'HONDA', 'TOYOTA', 'HYUNDAI', 'MAHINDRA', 'SUZUKI', 'PASS', 'STOP', 'GOODS'
}

_VEHICLE_MODEL = None
_PLATE_MODEL = None
_READER = None

def get_vehicle_model():
    """Returns the YOLOv8 vehicle detector (COCO classes: car, motorcycle, bus, truck)."""
    global _VEHICLE_MODEL
    if _VEHICLE_MODEL is None:
        model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "yolov8n.pt")
        if not os.path.exists(model_path):
            model_path = "yolov8n.pt"
        _VEHICLE_MODEL = YOLO(model_path)
    return _VEHICLE_MODEL

def get_plate_model():
    """Returns the specialized YOLOv8 license plate detector."""
    global _PLATE_MODEL
    if _PLATE_MODEL is None:
        candidates = [
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "plate_detector_best.pt"),
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt"),
            "plate_detector_best.pt"
        ]
        chosen = next((p for p in candidates if os.path.exists(p)), "plate_detector_best.pt")
        _PLATE_MODEL = YOLO(chosen)
    return _PLATE_MODEL

def get_easyocr_reader():
    global _READER
    if _READER is None:
        _READER = easyocr.Reader(['en'], gpu=False)
    return _READER

def compute_sharpness(gray_img: np.ndarray) -> float:
    """Computes Laplacian variance as a blur / sharpness metric."""
    if gray_img is None or gray_img.size == 0:
        return 0.0
    return float(cv2.Laplacian(gray_img, cv2.CV_64F).var())

def process_multiline_ocr(ocr_res):
    """
    Groups OCR bounding boxes into vertical lines (top to bottom),
    and left-to-right within each line. Corrects 2-line Indian plates
    on buses, trucks, and two-wheelers.
    """
    if not ocr_res:
        return "", 0.0

    items = []
    for r in ocr_res:
        pts = np.array(r[0])
        cy = float(np.mean(pts[:, 1]))
        cx = float(np.mean(pts[:, 0]))
        h = float(np.max(pts[:, 1]) - np.min(pts[:, 1]))
        items.append((cy, cx, h, r[1], float(r[2])))

    avg_h = np.mean([it[2] for it in items]) if items else 20
    items.sort(key=lambda it: it[0])

    lines = []
    current_line = []
    last_y = None

    for it in items:
        if last_y is None or abs(it[0] - last_y) < avg_h * 0.55:
            current_line.append(it)
            last_y = it[0] if last_y is None else (last_y + it[0]) / 2.0
        else:
            current_line.sort(key=lambda x: x[1])
            lines.append(current_line)
            current_line = [it]
            last_y = it[0]

    if current_line:
        current_line.sort(key=lambda x: x[1])
        lines.append(current_line)

    flat_texts = []
    all_confs = []
    for line in lines:
        for it in line:
            flat_texts.append(it[3])
            all_confs.append(it[4])

    combined_text = " ".join(flat_texts).strip()
    avg_conf = float(np.mean(all_confs)) if all_confs else 0.0
    return combined_text, avg_conf

def lossless_decompose_plate(crop: np.ndarray) -> list[tuple[str, np.ndarray]]:
    """
    Applies multi-scale lossless image decomposition and super-resolution
    to license plate crops for optimal OCR character extraction under challenging
    illumination, specular reflections, and resolution constraints.
    """
    if crop is None or crop.size == 0:
        return []

    th, tw = crop.shape[:2]
    if th < 8 or tw < 16:
        return []

    # 1. Super-Resolution Upscaling using Lanczos4 sinc reconstruction
    target_h = max(90, min(140, int(round(th * max(1.5, 90.0 / float(th))))))
    scale = target_h / float(th)
    target_w = int(round(tw * scale))
    hd_bgr = cv2.resize(crop, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(hd_bgr, cv2.COLOR_BGR2GRAY)

    variants = []

    # Variant 1: Morphological Illumination Decomposition (Top-Hat & Black-Hat)
    k_dim = max(5, int(target_h * 0.12)) | 1
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_dim, k_dim))
    top_hat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
    black_hat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    decomp = cv2.add(gray, top_hat)
    decomp = cv2.subtract(decomp, black_hat)
    variants.append(("morph_decomp", decomp))

    # Variant 2: Bilateral Denoised + Unsharp Edge Enhancement with Multi-Scale CLAHE
    bilateral = cv2.bilateralFilter(decomp, d=5, sigmaColor=35, sigmaSpace=35)
    blurred = cv2.GaussianBlur(bilateral, (0, 0), sigmaX=1.5)
    unsharp = cv2.addWeighted(bilateral, 1.5, blurred, -0.5, 0)
    clahe_unsharp = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(6, 6)).apply(unsharp)
    variants.append(("clahe_unsharp", clahe_unsharp))

    # Variant 3: Standard Adaptive CLAHE on pristine grayscale
    clahe_std = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(gray)
    variants.append(("clahe_std", clahe_std))

    # Variant 4: Adaptive Otsu Binarized Decomposition
    _, otsu = cv2.threshold(bilateral, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(("otsu_binary", otsu))

    # Variant 5: Inverted Polarity
    inverted = cv2.bitwise_not(clahe_unsharp)
    variants.append(("inverted", inverted))

    return variants

def run_ocr_on_plate_crop(crop: np.ndarray, reader) -> list[tuple[str, float, bool]]:
    """
    Evaluates raw lossless plate crop across decomposed image representations.
    Returns list of candidate readings: [(normalized_text, confidence, matches_format), ...]
    """
    variants = lossless_decompose_plate(crop)
    if not variants:
        return []

    readings = []
    for name, img_var in variants:
        res = reader.readtext(img_var, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[](){}|-_ ')
        txt, conf = process_multiline_ocr(res)
        if not txt:
            continue

        words = txt.upper().split()
        if any(w in IGNORED_WORDS for w in words):
            continue

        norm_txt, was_corr, is_match = normalize_plate(txt)
        if norm_txt and len(norm_txt) >= 4:
            readings.append((norm_txt, conf, is_match))
            # If high-confidence format match is found on this variant, early stop variants for this crop
            if is_match and conf >= 0.85:
                break

    return readings

def finalize_track(
    tid: int,
    t_info: dict,
    fps: float,
    camera_id: str,
    reader,
    verbose: bool
) -> tuple[dict | None, int]:
    """
    Evaluates plate crops via lossless decomposition OCR, executes multi-frame consensus,
    aggregates attribute votes, and produces finalized detection event if valid.
    """
    is_active_vehicle = (
        len(t_info["candidate_crops"]) > 0 or
        (t_info["frames_seen_count"] >= 8 and t_info["max_w"] >= 200 and t_info["max_h"] >= 160)
    )

    if not is_active_vehicle:
        return None, 0

    all_readings = []
    ocr_calls = 0

    # Evaluate up to 4 top candidate crops across the vehicle's trajectory
    crops_to_evaluate = t_info["candidate_crops"][:4]
    for _, crop, frame_idx in crops_to_evaluate:
        ocr_calls += 1
        readings = run_ocr_on_plate_crop(crop, reader)
        all_readings.extend(readings)

        # Early exit if we already have confirmed matches from multiple frames
        confirmed_matches = [r for r in all_readings if r[2] and r[1] >= 0.80]
        if len(confirmed_matches) >= 2:
            break

    # Multi-frame consensus voting
    best_text, best_conf, best_match = consensus_plate_readings(all_readings)

    # Determine consensus vehicle type
    final_type = t_info["vehicle_type"]
    if t_info.get("type_votes"):
        final_type = max(t_info["type_votes"].items(), key=lambda x: x[1])[0]

    # Determine consensus vehicle color
    final_color = t_info["vehicle_color"]
    final_color_conf = t_info["color_confidence"]
    if t_info.get("color_votes"):
        best_col, weight = max(t_info["color_votes"].items(), key=lambda x: x[1])
        if best_col != "unknown":
            final_color = best_col

    first_secs = t_info["first_raw_frame"] / fps if fps > 0 else 0.0
    last_secs = t_info["last_raw_frame"] / fps if fps > 0 else 0.0

    event = {
        "plate_text": best_text,
        "license_plate": best_text,
        "plate_number": best_text,
        "confidence": round(float(best_conf), 4),
        "vehicle_type": final_type,
        "vehicle_color": final_color,
        "color_confidence": round(float(final_color_conf), 2),
        "camera_id": camera_id,
        "first_seen_timestamp": format_timestamp(first_secs),
        "last_seen_timestamp": format_timestamp(last_secs),
        "matched_format": best_match
    }

    is_valid_anpr = best_match and best_text != "UNREADABLE" and len(best_text) >= 4
    if is_valid_anpr:
        if verbose:
            print(f"[FINALIZED] Vehicle {tid} | Type: {event['vehicle_type']} | Color: {event['vehicle_color']} ({event['color_confidence']*100:.0f}%) | Plate: {best_text} ({best_conf:.2f}, fmt={best_match})", flush=True)
        return event, ocr_calls

    return None, ocr_calls

def format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def process_video(video_path: str, camera_id: str = "CAM_01", verbose: bool = True) -> list[dict]:
    """
    Executes the high-accuracy full-frame ANPR & vehicle attribute recognition pipeline:
    1. Tracks vehicles with ByteTrack across 100% of video frames.
    2. Classifies Vehicle Type (Sedan, SUV, Bus, Truck, Motorcycle) and Color via trajectory voting.
    3. Detects license plates with geometric constraints and CCTV HUD exclusion.
    4. Evaluates plates through Lanczos super-resolution and morphological lossless decomposition.
    5. Formats and validates license plates using state-anchored Indian standards and multi-frame consensus.
    """
    vehicle_model = get_vehicle_model()
    plate_model = get_plate_model()
    reader = get_easyocr_reader()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file '{video_path}'")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tracks = {}
    all_seen_track_ids = set()
    finalized_events = []
    ocr_calls_made = 0

    raw_frame_idx = 0
    sampled_frame_count = 0
    start_time = time.time()

    if verbose:
        print(f"Starting Intelligent ANPR Pipeline... (FPS: {fps:.2f}, Frames: {total_video_frames}, Stride: {FRAME_STRIDE}, Threads: {_NUM_THREADS})", flush=True)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        raw_frame_idx += 1

        # Frame Stride: Process every FRAME_STRIDE-th frame (1 = 100% of frames)
        if (raw_frame_idx - 1) % FRAME_STRIDE != 0:
            continue

        sampled_frame_count += 1

        max_dim = max(orig_h, orig_w)
        if max_dim > MAX_INFERENCE_DIM:
            scale = MAX_INFERENCE_DIM / float(max_dim)
            new_w = int(round(orig_w * scale))
            new_h = int(round(orig_h * scale))
            resized_frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        else:
            scale = 1.0
            resized_frame = frame

        # Stage 1: Detect and Track Vehicles
        results = vehicle_model.track(
            source=resized_frame,
            classes=VEHICLE_CLASS_IDS,
            imgsz=640,
            conf=0.25,
            iou=0.45,
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )
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

                coords = box.xyxy[0].cpu().numpy().astype(float)
                margin = 4
                x1 = max(0, int(round(coords[0] / scale)) - margin)
                y1 = max(0, int(round(coords[1] / scale)) - margin)
                x2 = min(orig_w, int(round(coords[2] / scale)) + margin)
                y2 = min(orig_h, int(round(coords[3] / scale)) + margin)
                vehicle_crop = frame[y1:y2, x1:x2]

                if vehicle_crop.size == 0 or vehicle_crop.shape[0] < 10 or vehicle_crop.shape[1] < 10:
                    continue

                bw = x2 - x1
                bh = y2 - y1
                cx = (x1 + x2) / 2.0
                cy = (y1 + y2) / 2.0
                v_area = bw * bh
                raw_cls_id = int(box.cls[0].item() if hasattr(box.cls[0], 'item') else box.cls[0])

                # Classify Vehicle Type and Color
                v_type, _ = classify_vehicle_type(raw_cls_id, bw, bh)
                v_color, v_color_conf = classify_vehicle_color(vehicle_crop, v_type)

                if track_id not in tracks:
                    tracks[track_id] = {
                        "readings": [],
                        "first_raw_frame": raw_frame_idx,
                        "last_raw_frame": raw_frame_idx,
                        "frames_seen_count": 1,
                        "frames_missing": 0,
                        "vehicle_type": v_type,
                        "type_votes": {v_type: 1} if v_type != "unknown" else {},
                        "vehicle_color": v_color,
                        "color_votes": {v_color: v_color_conf * math.sqrt(v_area)} if v_color != "unknown" else {},
                        "color_confidence": v_color_conf,
                        "last_center": (cx, cy),
                        "max_w": bw,
                        "max_h": bh,
                        "last_area": v_area,
                        "candidate_crops": []
                    }
                    all_seen_track_ids.add(track_id)
                else:
                    # ID-Switch Safeguard: Detect abnormal velocity/area jumps
                    last_cx, last_cy = tracks[track_id]["last_center"]
                    last_area = tracks[track_id]["last_area"]
                    dist = math.hypot(cx - last_cx, cy - last_cy)
                    area_ratio = v_area / float(last_area) if last_area > 0 else 1.0

                    if dist > 200 and (area_ratio > 3.5 or area_ratio < 0.28):
                        if verbose:
                            print(f"[ID-SWITCH DETECTED] Track {track_id} jumped {dist:.1f}px (area ratio {area_ratio:.2f}). Resetting buffer.", flush=True)
                        tracks[track_id]["candidate_crops"] = []
                        tracks[track_id]["readings"] = []

                    tracks[track_id]["last_raw_frame"] = raw_frame_idx
                    tracks[track_id]["frames_seen_count"] += 1
                    tracks[track_id]["frames_missing"] = 0
                    tracks[track_id]["last_center"] = (cx, cy)
                    tracks[track_id]["max_w"] = max(tracks[track_id]["max_w"], bw)
                    tracks[track_id]["max_h"] = max(tracks[track_id]["max_h"], bh)
                    tracks[track_id]["last_area"] = v_area

                    if v_type != "unknown":
                        tracks[track_id]["type_votes"][v_type] = tracks[track_id]["type_votes"].get(v_type, 0) + 1
                    if v_color != "unknown":
                        tracks[track_id]["color_votes"][v_color] = tracks[track_id]["color_votes"].get(v_color, 0.0) + (v_color_conf * math.sqrt(v_area))

                    if v_color_conf > tracks[track_id]["color_confidence"] and v_color != "unknown":
                        tracks[track_id]["vehicle_color"] = v_color
                        tracks[track_id]["color_confidence"] = v_color_conf
                    if tracks[track_id]["vehicle_type"] == "unknown" and v_type != "unknown":
                        tracks[track_id]["vehicle_type"] = v_type

                # Plate detection on vehicle crop
                if bw >= 50 and bh >= 50:
                    pres = plate_model(vehicle_crop, conf=0.20, verbose=False)
                    pboxes = pres[0].boxes
                    if pboxes is not None and len(pboxes) > 0:
                        for pb in pboxes:
                            conf_pb = float(pb.conf[0])
                            px1, py1, px2, py2 = [int(round(v)) for v in pb.xyxy[0].cpu().numpy()]
                            pw, ph = px2 - px1, py2 - py1
                            p_area = pw * ph

                            # Geometric filters:
                            # 1. Aspect ratio
                            ar = pw / float(ph) if ph > 0 else 0
                            # 2. Area relative to vehicle
                            area_ratio = p_area / float(v_area) if v_area > 0 else 1.0
                            # 3. Exclude top 10% CCTV HUD watermark
                            global_y = y1 + py1
                            if global_y < orig_h * 0.10:
                                continue

                            if 1.1 <= ar <= 5.5 and 0.005 <= area_ratio <= 0.20 and pw >= 25 and ph >= 10:
                                margin_x = max(6, int(round(pw * 0.10)))
                                margin_y = max(4, int(round(ph * 0.12)))
                                mx1 = max(0, px1 - margin_x)
                                my1 = max(0, py1 - margin_y)
                                mx2 = min(vehicle_crop.shape[1], px2 + margin_x)
                                my2 = min(vehicle_crop.shape[0], py2 + margin_y)
                                pcrop = vehicle_crop[my1:my2, mx1:mx2]

                                gray_p = cv2.cvtColor(pcrop, cv2.COLOR_BGR2GRAY)
                                lap_var = compute_sharpness(gray_p)
                                score = p_area * math.sqrt(max(1.0, lap_var)) * conf_pb

                                tracks[track_id]["candidate_crops"].append((score, pcrop, raw_frame_idx))
                                tracks[track_id]["candidate_crops"].sort(key=lambda c: c[0], reverse=True)
                                tracks[track_id]["candidate_crops"] = tracks[track_id]["candidate_crops"][:8]

        # Finalize disappeared tracks
        active_tids = list(tracks.keys())
        for tid in active_tids:
            if tid not in frame_visible_track_ids:
                tracks[tid]["frames_missing"] += 1

            if tracks[tid]["frames_missing"] > MAX_MISSING_FRAMES:
                event, calls = finalize_track(tid, tracks[tid], fps, camera_id, reader, verbose)
                ocr_calls_made += calls
                if event is not None:
                    finalized_events.append(event)
                del tracks[tid]

    # Finalize remaining tracks at video end
    for tid in list(tracks.keys()):
        event, calls = finalize_track(tid, tracks[tid], fps, camera_id, reader, verbose)
        ocr_calls_made += calls
        if event is not None:
            finalized_events.append(event)
        del tracks[tid]

    cap.release()

    total_processing_time = time.time() - start_time
    proc_fps = raw_frame_idx / total_processing_time if total_processing_time > 0 else 0.0

    if verbose:
        print("\n========================================", flush=True)
        print("ANPR & ATTRIBUTE EXTRACTION COMPLETE", flush=True)
        print("========================================", flush=True)
        print(f"Video: {video_path}", flush=True)
        print(f"Total video frames: {total_video_frames} (Sampled: {sampled_frame_count})", flush=True)
        print(f"OCR calls made: {ocr_calls_made}", flush=True)
        print(f"Total processing time: {total_processing_time:.2f}s", flush=True)
        print(f"Effective processing speed: {proc_fps:.2f} FPS", flush=True)
        print(f"Unique vehicles tracked: {len(all_seen_track_ids)}", flush=True)
        print(f"Finalized events: {len(finalized_events)}", flush=True)
        print("========================================\n", flush=True)

    return finalized_events
