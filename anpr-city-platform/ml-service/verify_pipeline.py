import time
from video_processor import process_video

if __name__ == "__main__":
    t0 = time.time()
    video_path = "test_video/test4.mp4"
    events = process_video(video_path, camera_id="CAM_01", verbose=True)
    elapsed = time.time() - t0

    print(f"\n==========================================")
    print(f"BENCHMARK REPORT: {video_path}")
    print(f"Total Execution Time: {elapsed:.2f}s")
    print(f"Total Vehicles Detected: {len(events)}")
    print(f"==========================================")
    for i, e in enumerate(events):
        v_type = e["vehicle_type"]
        v_col = e["vehicle_color"]
        c_conf = e["color_confidence"] * 100
        p_text = e["plate_text"]
        p_conf = e["confidence"]
        fmt = e["matched_format"]
        ts = e["first_seen_timestamp"]
        print(f"[{i+1:02d}] {ts} | Type: {v_type:10s} | Color: {v_col:8s} ({c_conf:2.0f}%) | Plate: {p_text:12s} | Conf: {p_conf:.2f} | Fmt: {fmt}")
    print(f"==========================================\n")

