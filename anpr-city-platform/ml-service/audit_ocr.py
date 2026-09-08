import os
import cv2
import numpy as np
import polars as pl
import random
import base64
from pathlib import Path

def apply_clahe(img):
    """
    Replicates the CLAHE preprocessing used in the OCR pipeline.
    """
    # 1. Convert to grayscale if image is BGR
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img

    # 2. Enlargement (3x) using INTER_CUBIC as per detect_and_ocr.py
    h, w = gray.shape
    enlarged = cv2.resize(gray, (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)

    # 3. Apply CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    clahe_img = clahe.apply(enlarged)

    return clahe_img

def img_to_base64(img):
    """
    Converts an OpenCV image to a base64 encoded JPG string for HTML embedding.
    """
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

def main():
    # Paths relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ocr_output_dir = os.path.join(script_dir, "ocr_output")
    results_csv_path = os.path.join(ocr_output_dir, "results.csv")
    crops_dir = os.path.join(ocr_output_dir, "crops")
    report_path = os.path.join(ocr_output_dir, "audit_report.html")

    if not os.path.exists(results_csv_path):
        print(f"Error: Results CSV not found at {results_csv_path}")
        return

    # Load OCR results
    df = pl.read_csv(results_csv_path)

    # Randomly sample ~20 results for auditing
    sample_size = min(20, len(df))
    sampled_df = df.sample(n=sample_size)

    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>OCR Audit Report</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f8f9fa;
                color: #333;
                padding: 40px;
            }
            h1 { text-align: center; color: #2c3e50; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                border-radius: 8px;
                overflow: hidden;
            }
            th, td {
                border: 1px solid #dee2e6;
                padding: 15px;
                text-align: center;
                vertical-align: middle;
            }
            th {
                background-color: #e9ecef;
                font-weight: 600;
                color: #495057;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 0.05em;
            }
            img {
                max-width: 250px;
                height: auto;
                border: 1px solid #ddd;
                border-radius: 4px;
                transition: transform 0.2s;
            }
            img:hover { transform: scale(1.1); }
            .confidence {
                font-weight: bold;
                color: #444;
                font-size: 0.9rem;
            }
            .text-box {
                font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
                font-size: 1.3rem;
                background: #f1f3f5;
                padding: 8px 12px;
                border-radius: 6px;
                border: 1px solid #ced4da;
                display: inline-block;
                min-width: 120px;
            }
            .meta-info { font-size: 0.8rem; color: #888; margin-top: 4px; }
        </style>
    </head>
    <body>
        <h1>OCR Audit Report</h1>
        <p class="subtitle">Comparing original crops against CLAHE-preprocessed images used for OCR.</p>
        <table>
            <thead>
                <tr>
                    <th>Original Crop</th>
                    <th>CLAHE Preprocessed (What OCR saw)</th>
                    <th>OCR Text Output</th>
                    <th>Confidences</th>
                </tr>
            </thead>
            <tbody>
    """

    for row in sampled_df.iter_rows(named=True):
        img_name = row['image_filename']
        # Mapping results.csv image_filename to crops folder filename
        # Observed pattern: {image_stem}_plate_0.jpg
        crop_filename = f"{Path(img_name).stem}_plate_0.jpg"
        crop_path = os.path.join(crops_dir, crop_filename)

        if not os.path.exists(crop_path):
            print(f"Warning: Crop not found for {img_name} at {crop_path}")
            continue

        # Load original crop
        orig_img = cv2.imread(crop_path)
        if orig_img is None:
            print(f"Warning: Could not read image {crop_path}")
            continue

        # Generate CLAHE version (replicate the exact preprocessing pipeline)
        clahe_img = apply_clahe(orig_img)

        # Convert both to base64 for a portable HTML report
        orig_b64 = img_to_base64(orig_img)
        clahe_b64 = img_to_base64(clahe_img)

        ocr_text = row['ocr_text'] if row['ocr_text'] is not None else ""
        box_conf = row['box_confidence']
        ocr_conf = row['ocr_confidence']

        html_content += f"""
            <tr>
                <td>
                    <img src="data:image/jpeg;base64,{orig_b64}" alt="Original Crop">
                    <div class="meta-info">{crop_filename}</div>
                </td>
                <td>
                    <img src="data:image/jpeg;base64,{clahe_b64}" alt="CLAHE Version">
                </td>
                <td>
                    <span class="text-box">{ocr_text}</span>
                </td>
                <td>
                    Box Conf: <span class="confidence">{box_conf:.4f}</span><br>
                    OCR Conf: <span class="confidence">{ocr_conf:.4f}</span>
                </td>
            </tr>
        """

    html_content += """
            </tbody>
        </table>
    </body>
    </html>
    """

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Successfully generated audit report at: {report_path}")

if __name__ == "__main__":
    main()
