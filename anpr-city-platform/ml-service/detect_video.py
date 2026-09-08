import os
import sys
import csv
from video_processor import process_video

def main():
    if len(sys.argv) < 2:
        print("Usage: python detect_video.py <video_path>", flush=True)
        sys.exit(1)

    video_arg = sys.argv[1]
    base_dir = r"C:\Users\navde\OneDrive\Desktop\SIH 2026\anpr-city-platform"
    script_dir = os.path.dirname(os.path.abspath(__file__))

    possible_paths = [
        video_arg,
        os.path.join(os.getcwd(), video_arg),
        os.path.join(script_dir, video_arg),
        os.path.join(base_dir, video_arg),
        video_arg.replace("test_videos", "test_video"),
        os.path.join(script_dir, video_arg.replace("test_videos", "test_video")),
        os.path.join(base_dir, "ml-service", video_arg.replace("test_videos", "test_video")),
    ]

    video_path = None
    for p in possible_paths:
        if os.path.isfile(p):
            video_path = os.path.abspath(p)
            break

    if not video_path:
        print(f"Error: Video file not found at '{video_arg}'", flush=True)
        sys.exit(1)

    print(f"Processing video: {video_path}", flush=True)

    output_csv_path = os.path.join(script_dir, "detection_events.csv")
    headers = ["plate_text", "confidence", "camera_id", "first_seen_timestamp", "last_seen_timestamp", "matched_format"]

    # Clear and initialize CSV
    with open(output_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

    # Call reusable process_video pipeline
    events = process_video(video_path, camera_id="CAM_01", verbose=True)

    # Write finalized events to CSV for CLI output
    with open(output_csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        for evt in events:
            row = dict(evt)
            row["confidence"] = f"{evt['confidence']:.4f}"
            row["matched_format"] = "true" if evt["matched_format"] else "false"
            writer.writerow(row)

    print(f"CSV: {output_csv_path}", flush=True)
    print("Final CSV Contents (ml-service/detection_events.csv):", flush=True)
    if os.path.exists(output_csv_path):
        with open(output_csv_path, "r", encoding="utf-8") as f:
            print(f.read(), flush=True)

if __name__ == "__main__":
    main()
