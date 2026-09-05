from ultralytics import YOLO
import os
from pathlib import Path
import numpy as np
from PIL import Image

def calculate_iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection
    return intersection / union if union > 0 else 0

def validate_detector():
    # Paths
    model_path = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform\runs\detect\runs\detect\plate_detector\weights\best.pt"
    val_images_path = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform\ml-service\datasets\plates\images\val"
    output_dir = "validation_output_iou05"
    conf_threshold = 0.5
    iou_threshold = 0.5

    # 1. Verify best.pt exists
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}")
        return

    # 2. Verify validation images exist
    if not os.path.exists(val_images_path):
        print(f"Error: Validation images directory not found at {val_images_path}")
        return

    # 3. Count validation images
    images = [f for f in os.listdir(val_images_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    total_images = len(images)
    print(f"Total validation images: {total_images}")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Load model
    model = YOLO(model_path)

    # Statistics
    images_with_detections = 0
    images_with_zero_detections = 0
    total_detections = 0
    all_confidences = []
    max_detections = 0
    images_with_overlaps = 0


    print("\nRunning inference...")
    for img_name in images:
        img_path = os.path.join(val_images_path, img_name)

        # Run inference
        results = model.predict(source=img_path, conf=conf_threshold, iou=iou_threshold, verbose=False)
        result = results[0]


        # Process detections
        detections = result.boxes
        num_detections = len(detections)
        max_detections = max(max_detections, num_detections)


        if num_detections > 0:
            images_with_detections += 1
            total_detections += num_detections

            # Check for overlaps
            if num_detections > 1:
                coords = detections.xyxy.cpu().numpy()
                has_overlap = False
                for i in range(num_detections):
                    for j in range(i + 1, num_detections):
                        if calculate_iou(coords[i], coords[j]) > iou_threshold:
                            has_overlap = True
                            break
                    if has_overlap: break
                if has_overlap:
                    images_with_overlaps += 1

            # Collect confidences
            confs = detections.conf.cpu().numpy()
            all_confidences.extend(confs)
        else:
            images_with_zero_detections += 1

        # Save annotated image
        # result.save() saves to 'runs/detect/predict' by default.
        # We'll use plot() to get the image and save it to our specific output_dir.
        annotated_img = result.plot()
        output_path = os.path.join(output_dir, img_name)
        Image.fromarray(annotated_img).save(output_path)

    # Calculate statistics
    avg_conf = np.mean(all_confidences) if all_confidences else 0
    min_conf = np.min(all_confidences) if all_confidences else 0
    max_conf = np.max(all_confidences) if all_confidences else 0

    print("\n--- Validation Statistics ---")
    print(f"Total validation images:       {total_images}")
    print(f"Images with >=1 detection:     {images_with_detections}")
    print(f"Images with zero detections:    {images_with_zero_detections}")
    print(f"Total detections:              {total_detections}")
    print(f"Average confidence:            {avg_conf:.4f}")
    print(f"Maximum detections on one image: {max_detections}")
    print(f"Images with overlapping detections: {images_with_overlaps}")
    print(f"Output directory:               {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    validate_detector()
