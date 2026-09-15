"""
Vehicle Type Classifier:
Maps YOLO COCO classes and aspect-geometry heuristics into canonical VEHICLE_TYPES.
"""
from vehicle_constants import VEHICLE_TYPES

def classify_vehicle_type(yolo_class_id: int, bbox_w: int, bbox_h: int) -> tuple[str, float]:
    """
    Classifies vehicle type into canonical types:
    'sedan', 'suv', 'bus', 'truck', 'motorcycle', 'unknown'
    
    Args:
        yolo_class_id (int): COCO class ID from YOLOv8 (2: car, 3: motorcycle, 5: bus, 7: truck)
        bbox_w (int): Bounding box width
        bbox_h (int): Bounding box height
        
    Returns:
        tuple: (vehicle_type: str, confidence: float)
    """
    if yolo_class_id == 3:
        return "motorcycle", 0.95
    elif yolo_class_id == 5:
        return "bus", 0.95
    elif yolo_class_id == 7:
        return "truck", 0.95
    elif yolo_class_id == 2:  # 'car' in COCO
        if bbox_w <= 0 or bbox_h <= 0:
            return "sedan", 0.80

        ratio = bbox_h / float(bbox_w)
        # SUV/Crossover heuristic:
        # Taller boxy profile relative to width (ratio >= 0.88) and substantial vertical presence (bbox_h >= 110)
        if ratio >= 0.88 and bbox_h >= 110:
            return "suv", 0.85
        else:
            return "sedan", 0.88

    return "unknown", 0.50
