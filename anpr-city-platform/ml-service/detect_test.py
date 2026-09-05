from ultralytics import YOLO
import easyocr
import cv2

# Pretrained general object detector for now — NOT fine-tuned on plates yet.
# This step is just to prove the plumbing works end-to-end.
model = YOLO("yolov8n.pt")  # auto-downloads on first run

image_path = "test_images/car1.jpg"
img = cv2.imread(image_path)

results = model(image_path)

reader = easyocr.Reader(['en'])

# yolov8n.pt is trained on COCO, which has no "license plate" class —
# so for this first test we detect the car, crop a lower-center region
# where plates usually sit, and try OCR on that. This is a placeholder,
# not the final detector.
for r in results:
    for box in r.boxes:
        cls = int(box.cls[0])
        label = model.names[cls]
        if label == "car":
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            h = y2 - y1
            plate_region = img[y2 - int(h*0.25):y2, x1:x2]
            cv2.imwrite("test_images/cropped_guess.jpg", plate_region)

            ocr_result = reader.readtext(plate_region)
            print(f"Car box: ({x1},{y1},{x2},{y2})")
            for (bbox, text, conf) in ocr_result:
                print(f"  OCR read: '{text}'  confidence={conf:.2f}")