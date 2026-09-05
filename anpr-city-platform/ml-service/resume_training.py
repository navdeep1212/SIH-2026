from ultralytics import YOLO
import os

def resume_training():
    # Path to the last checkpoint relative to ml-service directory
    last_pt = "../runs/detect/runs/detect/plate_detector/weights/last.pt"

    if not os.path.exists(last_pt):
        print(f"Error: {last_pt} not found")
        return

    print(f"Loading model from {last_pt} for resume...")
    model = YOLO(last_pt)

    # Attempt to resume with conservative settings and explicit data path
    # The data path in data.yaml is 'datasets/plates', so it should be relative to CWD (ml-service)
    try:
        model.train(
            resume=True,
            data="datasets/plates/data.yaml",
            batch=4,
            workers=0,
            imgsz=640,
            cache=False
        )
    except Exception as e:
        print(f"Training failed: {e}")

if __name__ == "__main__":
    resume_training()
