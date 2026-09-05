import os
import cv2
import numpy as np
import pandas as pd
import easyocr
from ultralytics import YOLO
from pathlib import Path
from PIL import Image

def get_preprocessing_variants(img):
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
    if not ocr_res:
        return "", 0.0
    sorted_res = sorted(ocr_res, key=lambda x: (x[0][0][0] + x[0][2][0]) / 2)
    combined_text = " ".join([res[1] for res in sorted_res])
    combined_conf = np.mean([res[2] for res in sorted_res])
    return combined_text.strip(), combined_conf

def main():
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

    print("Loading YOLO model...")
    model = YOLO(model_path)
    print("Initializing EasyOCR...")
    reader = easyocr.Reader(['en'], gpu=False)

    images = [f for f in os.listdir(val_images_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    # Limit to 5 for a quick test
    images = images[:5]
    print(f"Processing {len(images)} images for test...")

    all_results = []
    comparison_data = []

    for img_name in images:
        img_path = os.path.join(val_images_path, img_name)
        img = cv2.imread(img_path)
        if img is None: continue

        results = model.predict(source=img_path, conf=0.5, iou=0.5, verbose=False)
        result = results[0]
        boxes = result.boxes

        for i, box in enumerate(boxes):
            coords = box.xyxy[0].cpu().numpy().astype(int)
            box_conf = float(box.conf[0])
            h, w, _ = img.shape
            margin = 5
            x1, y1 = max(0, coords[0] - margin), max(0, coords[1] - margin)
            x2, y2 = min(w, coords[2] + margin), min(h, coords[3] + margin)
            crop = img[y1:y2, x1:x2]
            crop_h, crop_w = crop.shape[:2]

            variants = get_preprocessing_variants(crop)
            plate_comparison = {"image_filename": img_name, "box_confidence": box_conf}
            variant_results = []
            best_variant = None
            max_conf = -1.0

            for var_name, var_img in variants.items():
                crop_filename = f"{Path(img_name).stem}_plate_{i}_{var_name}.jpg"
                cv2.imwrite(os.path.join(crops_dir, crop_filename), var_img)
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
                if conf > max_conf:
                    max_conf = conf
                    best_variant = (var_name, text, var_img)

            all_results.extend(variant_results)
            comparison_data.append(plate_comparison)

            if best_variant:
                var_name, text, var_img = best_variant
                annotated_img = img.copy()
                cv2.rectangle(annotated_img, (coords[0], coords[1]), (coords[2], coords[3]), (0, 255, 0), 2)
                label = f"Var: {var_name} | OCR: {text} ({max_conf:.2f})"
                cv2.putText(annotated_img, label, (coords[0], coords[1]-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                ann_filename = f"{Path(img_name).stem}_plate_{i}_v2_res.jpg"
                cv2.imwrite(os.path.join(results_dir, ann_filename), annotated_img)

    pd.DataFrame(all_results).to_csv(results_csv, index=False)
    pd.DataFrame(comparison_data).to_csv(comparison_csv, index=False)
    print("Test completed successfully.")

if __name__ == "__main__":
    main()
