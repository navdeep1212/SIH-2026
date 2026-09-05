import csv
import collections

results_file = 'anpr-city-platform/ml-service/ocr_output_v2/results.csv'
comparison_file = 'anpr-city-platform/ml-service/ocr_output_v2/comparison.csv'

# Read results.csv
results = []
with open(results_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        results.append(row)

# Read comparison.csv
comparison = []
with open(comparison_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        comparison.append(row)

# A. Number of images processed
images = set()
for r in results:
    images.add(r['image_filename'])
num_images = len(images)

# B. Number of plates detected
num_plates = len(comparison)

# C & D. OCR results and confidence per variant
variants = ['original', 'clahe', 'denoise', 'adaptive', 'otsu']
variant_stats = collections.defaultdict(lambda: {"conf_sum": 0.0, "count": 0, "non_empty": 0})

for r in results:
    var = r['variant']
    if var in variants:
        conf = float(r['ocr_confidence']) if r['ocr_confidence'] else 0.0
        text = r['ocr_text'] if r['ocr_text'] else ""
        variant_stats[var]["conf_sum"] += conf
        variant_stats[var]["count"] += 1
        if text.strip():
            variant_stats[var]["non_empty"] += 1

print(f"A. Images Processed: {num_images}")
print(f"B. Plates Detected: {num_plates}")
print("\nC & D. Variant Performance:")
for var in variants:
    s = variant_stats[var]
    avg_conf = s["conf_sum"] / s["count"] if s["count"] > 0 else 0
    print(f"  {var}: Avg Conf={avg_conf:.4f}, Non-Empty={s['non_empty']}/{s['count']}")

# E. Examples where variants disagree
disagreements = []
for row in comparison:
    texts = [row.get(f"{v}_text", "") for v in variants]
    if len(set(texts)) > 1:
        disagreements.append({
            "image": row['image_filename'],
            "texts": {v: row.get(f"{v}_text", "") for v in variants}
        })

print(f"\nE. Total Disagreements: {len(disagreements)}")
print("Example Disagreements (Top 5):")
for d in disagreements[:5]:
    print(f"  Image {d['image']}: {d['texts']}")

# F. Representative OCR outputs
print("\nF. Representative OCR Outputs (10):")
for i in range(min(10, len(results))):
    r = results[i]
    print(f"  Img: {r['image_filename']}, Var: {r['variant']}, Text: {r['ocr_text']}, Conf: {r['ocr_confidence']}")

