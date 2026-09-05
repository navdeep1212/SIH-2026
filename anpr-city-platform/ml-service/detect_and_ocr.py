import os
import cv2
import numpy as np
import pandas as pd
import easyocr
from ultralytics import YOLO
from pathlib import Path
from PIL import Image

def get_preprocessing_variants(img):
    """
    Generates multiple preprocessing variants for a plate crop.
    """
    variants = {}

    # Basic setup: Convert to grayscale and enlarge
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Enlargement (3x) using INTER_CUBIC
    h, w = gray.shape
    enlarged = cv2.resize(gray, (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)

    # Variant A: Original/enlarged
    variants['original'] = enlarged

    # Variant B: Grayscale + CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    clahe_img = clahe.apply(enlarged)
    variants['clahe'] = clahe_img

    # Variant C: Grayscale + CLAHE + mild denoising
    denoised = cv2.fastNlMeansDenoising(clahe_img, None, 10, 7, 21)
    variants['denoise'] = denoised

    # Variant D: Grayscale + adaptive threshold
    # Using Gaussian adaptive thresholding
    adaptive = cv2.adaptiveThreshold(enlarged, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY, 11, 2)
    variants['adaptive'] = adaptive

    # Variant E: Grayscale + Otsu threshold
    _, otsu = cv2.threshold(enlarged, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants['otsu'] = otsu

    return variants

def process_ocr_blocks(ocr_res):
    """
    Sorts OCR blocks from left to right and concatenates text.
    """
    if not ocr_res:
        return "", 0.0

    # ocr_res is a list of ([box], text, conf)
    # Box is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    # We sort by the average X coordinate of the box
    sorted_res = sorted(ocr_res, key=lambda x: (x[0][0][0] + x[0][2][0]) / 2)

    combined_text = " ".join([res[1] for res in sorted_res])
    combined_conf = np.mean([res[2] for res in sorted_res])

    return combined_text.strip(), combined_conf

def main():
    # Absolute paths
    base_dir = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform"
    model_path = os.path.join(base_dir, r"runs\detect\runs\detect\plate_detector\weights\best.pt")
    val_images_path = os.path.join(base_dir, r"ml-service\datasets\plates\images\val")

    output_base = os.path.join(base_dir, r"ml-service\ocr_output_v2")
    crops_dir = os.path.join(output_base, "crops")
    results_dir = os.path.join(output_base, "results")
    results_csv = os.path.join(output_base, "results.csv")
    comparison_csv = os.path.join(output_base, "comparison.csv")

    os.makedirs(crops_dir, exist_ok=True)
    os.makedirs(results_dir, exist_ok=True)

    # Initialize models
    print("Loading YOLO model...")
    model = YOLO(model_path)

    print("Initializing EasyOCR with allowlist...")
    # allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    reader = easyocr.Reader(['en'], gpu=False)

    images = [f for f in os.listdir(val_images_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    print(f"Processing {len(images)} images...")

    all_results = []
    comparison_data = []

    for img_name in images:
        print(f"Processing {img_name}...")
        img_path = os.path.join(val_images_path, img_name)

        img = cv2.imread(img_path)
        if img is None: continue

        # 1. Detection
        results = model.predict(source=img_path, conf=0.5, iou=0.5, verbose=False)
        result = results[0]
        boxes = result.boxes

        if len(boxes) == 0: continue

        for i, box in enumerate(boxes):
            coords = box.xyxy[0].cpu().numpy().astype(int)
            box_conf = float(box.conf[0])

            # Crop
            h, w, _ = img.shape
            margin = 5
            x1, y1 = max(0, coords[0] - margin), max(0, coords[1] - margin)
            x2, y2 = min(w, coords[2] + margin), min(h, coords[3] + margin)
            crop = img[y1:y2, x1:x2]
            crop_h, crop_w = crop.shape[:2]

            # Generate preprocessing variants
            variants = get_preprocessing_variants(crop)

            plate_comparison = {
                "image_filename": img_name,
                "box_confidence": box_conf
            }

            variant_results = []
            best_variant = None
            max_conf = -1.0

            for var_name, var_img in variants.items():
                # Save processed crop
                crop_filename = f"{Path(img_name).stem}_plate_{i}_{var_name}.jpg"
                cv2.imwrite(os.path.join(crops_dir, crop_filename), var_img)

                # OCR
                ocr_res = reader.readtext(var_img, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                text, conf = process_ocr_blocks(ocr_res)

                variant_results.append({
                    "image_filename": img_name,
                    "box_confidence": box_conf,
                    "crop_width": crop_w,
                    "crop_height": crop_h,
                    "variant": var_name,
                    "ocr_text": text,
                    "ocr_confidence": conf
                })

                plate_comparison[f"{var_name}_text"] = text
                plate_comparison[f"{var_name}_confidence"] = conf

                # Heuristic for "Best" visualization: just highest confidence for now,
                # but we report all.
                if conf > max_conf:
                    max_conf = conf
                    best_variant = (var_name, text, var_img)

            all_results.extend(variant_results)
            comparison_data.append(plate_comparison)

            # Save best visualization
            if best_variant:
                var_name, text, var_img = best_variant
                annotated_img = img.copy()
                cv2.rectangle(annotated_img, (coords[0], coords[1]), (coords[2], coords[3]), (0, 255, 0), 2)
                label = f"Var: {var_name} | OCR: {text} ({max_conf:.2f})"
                cv2.putText(annotated_img, label, (coords[0], coords[1]-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                ann_filename = f"{Path(img_name).stem}_plate_{i}_v2_res.jpg"
                cv2.imwrite(os.path.join(results_dir, ann_filename), annotated_img)

    # Save CSVs
    pd.DataFrame(all_results).to_csv(results_csv, index=False)
    pd.DataFrame(comparison_data).to_csv(comparison_csv, index=False)

    # Summary Statistics
    print("\n=== OCR v2 Experiment Summary ===")
    print(f"Total input images: {len(images)}")
    print(f"Plates detected: {len(comparison_data)}")
    print(f"OCR attempts: {len(all_results)}")

    # Non-empty results
    non_empty = [r for r in all_results if r['ocr_text']]
    print(f"Non-empty OCR results: {len(non_empty)}")

    # Avg conf per variant
    for var in ['original', 'clahe', 'denoise', 'adaptive', 'otsu']:
        v_confs = [r['ocr_confidence'] for r in all_results if r['variant'] == var]
        avg = np.mean(v_confs) if v_confs else 0
        print(f"Avg confidence ({var}): {avg:.4f}")

    # Valid outputs (A-Z 0-9 only)
    def is_alnum(s):
        return s.isalnum() if s else False

    valid_count = sum(1 for r in all_results if is_alnum(r['ocr_text']))
    print(f"Outputs containing only A-Z/0-9: {valid_count}")

    # Examples where variants disagree
    disagreements = 0
    for row in comparison_data:
        texts = [row[f"{v}_text"] for v in ['original', 'clahe', 'denoise', 'adaptive', 'otsu']]
        if len(set(texts)) > 1:
            disagreements += 1
    print(f"Plates where variants disagree: {disagreements}")

    print(f"\nExperiment completed. Results in: {output_base}")

if __name__ == "__main__":
    main()
