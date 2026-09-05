from ultralytics import YOLO
import os
import numpy as np

def calculate_iou(box1, box2):
    # box = [x1, y1, x2, y2]
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0

def diagnostic_detector():
    # Absolute paths for reliability
    model_path = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform\runs\detect\runs\detect\plate_detector\weights\best.pt"
    val_images_path = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform\ml-service\datasets\plates\images\val"
    conf_threshold = 0.5
    iou_threshold_limit = 0.5 # Consider boxes as overlapping if IoU > 0.5

    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return

    if not os.path.exists(val_images_path):
        print(f"Error: Validation images directory not found at {val_images_path}")
        return

    images = [f for f in os.listdir(val_images_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    model = YOLO(model_path)

    images_with_duplicates = 0
    max_detections = 0
    duplicate_confidences = []

    print("\nRunning diagnostic inference...")
    for img_name in images:
        img_path = os.path.join(val_images_path, img_name)
        results = model.predict(source=img_path, conf=conf_threshold, verbose=False)
        result = results[0]

        boxes = result.boxes
        num_detections = len(boxes)
        max_detections = max(max_detections, num_detections)

        if num_detections > 1:
            # Check for overlaps
            coords = boxes.xyxy.cpu().numpy()
            confs = boxes.conf.cpu().numpy()

            has_overlap = False
            for i in range(num_detections):
                for j in range(i + 1, num_detections):
                    iou = calculate_iou(coords[i], coords[j])
                    if iou > iou_threshold_limit:
                        has_overlap = True
                        duplicate_confidences.append((confs[i], confs[j], iou))

            if has_overlap:
                images_with_duplicates += 1

    print("\n--- Diagnostic Report ---")
    print(f"Images with duplicate/overlapping detections (IoU > {iou_threshold_limit}): {images_with_duplicates}")
    print(f"Maximum number of detections on a single image: {max_detections}")
    if duplicate_confidences:
        print(f"Confidence values of overlapping pairs (top 5):")
        # Sort by IoU descending
        duplicate_confidences.sort(key=lambda x: x[2], reverse=True)
        for c1, c2, iou in duplicate_confidences[:5]:
            print(f"  Conf1: {c1:.4f}, Conf2: {c2:.4f}, IoU: {iou:.4f}")
    else:
        print("No overlapping detections found.")

    print("\n--- NMS Analysis ---")
    print("NMS is applied by default in YOLOv8 predict().")
    print("Default IoU threshold for NMS is 0.7.")
    print("If overlapping boxes are appearing with IoU < 0.7, they survive NMS.")

if __name__ == "__main__":
    diagnostic_detector()
