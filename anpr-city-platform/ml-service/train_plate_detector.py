from ultralytics import YOLO
import os
from pathlib import Path

def train_plate_detector():
    # 1. Load the pretrained model
    # Model path is relative to the CWD (ml-service)
    model_path = "yolov8n.pt"
    if not os.path.exists(model_path):
        print(f"Error: Pretrained model {model_path} not found.")
        return

    model = YOLO(model_path)

    # 2. Train the model
    # Data path is relative to CWD: datasets/plates/data.yaml
    # Project/name creates runs/detect/plate_detector
    results = model.train(
        data="datasets/plates/data.yaml",
        epochs=50,
        imgsz=640,
        batch=8,
        project="runs/detect",
        name="plate_detector",
        exist_ok=True
    )

    # 3. Extract metrics
    # The results object from train() contains the training summary
    metrics = results.results_dict

    precision = metrics.get('metrics/precision(B)', 0)
    recall = metrics.get('metrics/recall(B)', 0)
    map50 = metrics.get('metrics/mAP50(B)', 0)
    map50_95 = metrics.get('metrics/mAP50-95(B)', 0)

    # Weights path
    best_model_path = "runs/detect/plate_detector/weights/best.pt"
    exists = os.path.exists(best_model_path)

    print("\n--- Training Report ---")
    print(f"Training completed successfully: {exists}")
    print(f"best.pt path: {best_model_path}")
    print(f"Final Precision: {precision:.4f}")
    print(f"Final Recall:    {recall:.4f}")
    print(f"mAP50:           {map50:.4f}")
    print(f"mAP50-95:        {map50_95:.4f}")
    print(f"Epochs completed: 50")

if __name__ == "__main__":
    train_plate_detector()
