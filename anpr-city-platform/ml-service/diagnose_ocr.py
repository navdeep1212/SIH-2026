import pandas as pd
import os
from pathlib import Path

def diagnose_ocr():
    csv_path = "anpr-city-platform/ml-service/ocr_output/results.csv"
    if not os.path.exists(csv_path):
        print(f"Error: CSV not found at {csv_path}")
        return

    df = pd.read_csv(csv_path)

    # Ensure ocr_confidence is numeric
    df['ocr_confidence'] = pd.to_numeric(df['ocr_confidence'], errors='coerce').fillna(0)

    # Sort by confidence
    df_sorted = df.sort_values(by='ocr_confidence', ascending=False)

    # Selection
    n = 5
    high_conf = df_sorted.head(n)
    low_conf = df_sorted.tail(n)

    # Medium confidence: take from the middle
    mid_start = len(df_sorted) // 2
    medium_conf = df_sorted.iloc[mid_start : mid_start + n]

    print("\n=== OCR Diagnostic Selection ===\n")

    print(f"--- High Confidence (Top {n}) ---")
    for idx, row in high_conf.iterrows():
        # Derive crop filename based on logic in detect_and_ocr.py
        # crop_filename = f"{Path(img_name).stem}_plate_{i}.jpg"
        # We don't have the index 'i' in the CSV, but we can check the crops directory
        print(f"Img: {row['image_filename']} | Text: {row['ocr_text']} | Conf: {row['ocr_confidence']:.4f}")

    print(f"\n--- Medium Confidence (Middle {n}) ---")
    for idx, row in medium_conf.iterrows():
        print(f"Img: {row['image_filename']} | Text: {row['ocr_text']} | Conf: {row['ocr_confidence']:.4f}")

    print(f"\n--- Low Confidence (Bottom {n}) ---")
    for idx, row in low_conf.iterrows():
        print(f"Img: {row['image_filename']} | Text: {row['ocr_text']} | Conf: {row['ocr_confidence']:.4f}")

if __name__ == "__main__":
    diagnose_ocr()
