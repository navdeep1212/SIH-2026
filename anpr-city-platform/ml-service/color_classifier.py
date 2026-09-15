"""
Vehicle Color Classifier:
Performs type-conditional body ROI extraction and dominant HSV color classification.
Speed: < 1 millisecond per vehicle on CPU.
"""
import cv2
import numpy as np
from vehicle_constants import VEHICLE_COLORS

def get_type_conditional_roi(crop: np.ndarray, vehicle_type: str) -> np.ndarray:
    """
    Extracts central vehicle body region while excluding
    windshield/sky glare (top) and road/tire shadow (bottom).
    """
    h, w = crop.shape[:2]
    if h < 10 or w < 10:
        return crop

    if vehicle_type in ("sedan", "suv"):
        y1, y2 = int(h * 0.25), int(h * 0.75)
        x1, x2 = int(w * 0.15), int(w * 0.85)
    elif vehicle_type in ("bus", "truck"):
        y1, y2 = int(h * 0.20), int(h * 0.70)
        x1, x2 = int(w * 0.10), int(w * 0.90)
    elif vehicle_type == "motorcycle":
        y1, y2 = int(h * 0.25), int(h * 0.75)
        x1, x2 = int(w * 0.20), int(w * 0.80)
    else:
        y1, y2 = int(h * 0.20), int(h * 0.80)
        x1, x2 = int(w * 0.20), int(w * 0.80)

    y1, y2 = max(0, y1), min(h, max(y1 + 5, y2))
    x1, x2 = max(0, x1), min(vw := w, max(x1 + 5, x2))
    return crop[y1:y2, x1:x2]

def classify_vehicle_color(crop: np.ndarray, vehicle_type: str = "sedan") -> tuple[str, float]:
    """
    Classifies the dominant vehicle color from vehicle crop.
    
    Returns:
        tuple: (color: str, confidence: float)
        where color is in VEHICLE_COLORS:
        'white', 'black', 'silver', 'gray', 'red', 'blue', 'yellow', 'green', 'orange', 'brown', 'unknown'
    """
    if crop is None or crop.size == 0:
        return "unknown", 0.0

    roi = get_type_conditional_roi(crop, vehicle_type)
    if roi.size == 0 or roi.shape[0] < 4 or roi.shape[1] < 4:
        return "unknown", 0.0

    # Downscale ROI for speed
    target_dim = 64
    rh, rw = roi.shape[:2]
    if max(rh, rw) > target_dim:
        scale = target_dim / float(max(rh, rw))
        roi = cv2.resize(roi, (max(8, int(rw * scale)), max(8, int(rh * scale))), interpolation=cv2.INTER_AREA)

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    h_channel = hsv[:, :, 0]
    s_channel = hsv[:, :, 1]
    v_channel = hsv[:, :, 2]

    total_pixels = roi.shape[0] * roi.shape[1]
    if total_pixels == 0:
        return "unknown", 0.0

    counts = {c: 0 for c in VEHICLE_COLORS if c != "unknown"}

    # Color segmentation rules
    is_black = (v_channel < 45)
    is_white = (~is_black) & (s_channel < 55) & (v_channel >= 170)
    is_silver = (~is_black) & (~is_white) & (s_channel < 45) & (v_channel >= 120) & (v_channel < 170)
    is_gray = (~is_black) & (~is_white) & (~is_silver) & (s_channel < 45) & (v_channel >= 45) & (v_channel < 120)
    is_white = (~is_black) & (s_channel < 60) & (v_channel >= 135)
    is_silver = (~is_black) & (~is_white) & (s_channel < 40) & (v_channel >= 100) & (v_channel < 135)
    is_gray = (~is_black) & (~is_white) & (~is_silver) & (s_channel < 40) & (v_channel >= 45) & (v_channel < 100)

    counts["black"] += int(np.count_nonzero(is_black))
    counts["white"] += int(np.count_nonzero(is_white))
    counts["silver"] += int(np.count_nonzero(is_silver))
    counts["gray"] += int(np.count_nonzero(is_gray))

    # Chromatic colors
    is_chromatic = (~is_black) & (~is_white) & (~is_silver) & (~is_gray) & (v_channel >= 40)

    is_red = is_chromatic & ((h_channel < 10) | (h_channel >= 168))
    is_orange_brown = is_chromatic & (h_channel >= 10) & (h_channel < 25)
    is_brown = is_orange_brown & (v_channel < 110)
    is_orange = is_orange_brown & (v_channel >= 110)
    is_yellow = is_chromatic & (h_channel >= 25) & (h_channel < 36)
    is_green = is_chromatic & (h_channel >= 36) & (h_channel < 85)
    is_blue = is_chromatic & (h_channel >= 85) & (h_channel < 135)

    counts["red"] += int(np.count_nonzero(is_red))
    counts["brown"] += int(np.count_nonzero(is_brown))
    counts["orange"] += int(np.count_nonzero(is_orange))
    counts["yellow"] += int(np.count_nonzero(is_yellow))
    counts["green"] += int(np.count_nonzero(is_green))
    counts["blue"] += int(np.count_nonzero(is_blue))

    dominant_color, dominant_count = max(counts.items(), key=lambda x: x[1])
    confidence = round(float(dominant_count) / float(total_pixels), 2)

    if confidence < 0.18 or dominant_count == 0:
        return "unknown", confidence

    return dominant_color, confidence

