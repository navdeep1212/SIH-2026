import os
import shutil
from pathlib import Path

def is_valid_yolo_label(label_path):
    """
    Checks if a label file is valid YOLO detection format.
    Returns (is_valid, reason)
    """
    try:
        with open(label_path, 'r') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]

            if not lines:
                return False, "empty"

            for line in lines:
                parts = line.split()
                if len(parts) != 5:
                    return False, "malformed"

                try:
                    cls = int(parts[0])
                    coords = [float(x) for x in parts[1:]]
                except ValueError:
                    return False, "non-numeric"

                if cls != 0:
                    return False, "wrong_class"

                for coord in coords:
                    if not (0.0 <= coord <= 1.0):
                        return False, "out_of_range"

        return True, None
    except Exception as e:
        return False, f"error: {str(e)}"

def clean_dataset():
    root_dir = Path("anpr-city-platform/ml-service/datasets")
    plates_dir = root_dir / "plates"
    quarantine_dir = root_dir / "plates_quarantine"

    # Setup quarantine folders
    q_train = quarantine_dir / "train"
    q_val = quarantine_dir / "val"
    q_train.mkdir(parents=True, exist_ok=True)
    q_val.mkdir(parents=True, exist_ok=True)

    stats = {
        "empty_removed": 0,
        "malformed_removed": 0,
        "train_imgs_initial": 0,
        "val_imgs_initial": 0,
    }

    splits = {
        "train": {
            "img_dir": plates_dir / "images/train",
            "lbl_dir": plates_dir / "labels/train",
            "q_dir": q_train
        },
        "val": {
            "img_dir": plates_dir / "images/val",
            "lbl_dir": plates_dir / "labels/val",
            "q_dir": q_val
        }
    }

    for split_name, paths in splits.items():
        img_dir = paths["img_dir"]
        lbl_dir = paths["lbl_dir"]
        q_dir = paths["q_dir"]

        images = list(img_dir.glob("*"))
        if split_name == "train":
            stats["train_imgs_initial"] = len(images)
        else:
            stats["val_imgs_initial"] = len(images)

        for img_path in images:
            label_path = lbl_dir / (img_path.stem + ".txt")

            if not label_path.exists():
                # Requirement 11 says verify every image has a label,
                # but the user's specific cleaning task focuses on invalid labels.
                # We'll treat missing labels as malformed for the sake of this script.
                valid, reason = False, "missing"
            else:
                valid, reason = is_valid_yolo_label(label_path)

            if not valid:
                # Quarantine
                if reason == "empty":
                    stats["empty_removed"] += 1
                else:
                    stats["malformed_removed"] += 1

                # Move label if it exists
                if label_path.exists():
                    shutil.move(str(label_path), str(q_dir / label_path.name))

                # Move image
                shutil.move(str(img_path), str(q_dir / img_path.name))

    # Final Verification & Reporting
    final_train_imgs = len(list((plates_dir / "images/train").glob("*")))
    final_train_lbls = len(list((plates_dir / "labels/train").glob("*")))
    final_val_imgs = len(list((plates_dir / "images/val").glob("*")))
    final_val_lbls = len(list((plates_dir / "labels/val").glob("*")))

    # Check for missing labels in remaining set
    missing_labels = 0
    for img in (plates_dir / "images/train").glob("*"):
        if not (plates_dir / "labels/train" / (img.stem + ".txt")).exists():
            missing_labels += 1
    for img in (plates_dir / "images/val").glob("*"):
        if not (plates_dir / "labels/val" / (img.stem + ".txt")).exists():
            missing_labels += 1

    # Check for extra labels
    extra_labels = 0
    for lbl in (plates_dir / "labels/train").glob("*.txt"):
        # check if any image matches
        if not any((plates_dir / "images/train" / f"{lbl.stem}{ext}").exists() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            extra_labels += 1
    for lbl in (plates_dir / "labels/val").glob("*.txt"):
        if not any((plates_dir / "images/val" / f"{lbl.stem}{ext}").exists() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
            extra_labels += 1

    print("\n--- Dataset Cleaning Report ---")
    print(f"Invalid empty labels removed:   {stats['empty_removed']}")
    print(f"Malformed labels removed:     {stats['malformed_removed']}")
    print(f"Train images remaining:       {final_train_imgs}")
    print(f"Train labels remaining:       {final_train_lbls}")
    print(f"Val images remaining:         {final_val_imgs}")
    print(f"Val labels remaining:         {final_val_lbls}")
    print(f"Missing labels:               {missing_labels}")
    print(f"Extra labels:                 {extra_labels}")

    # Final verification of remaining labels
    all_valid = True
    for lbl in (plates_dir / "labels/train").glob("*.txt"):
        if not is_valid_yolo_label(lbl)[0]:
            all_valid = False
            break
    for lbl in (plates_dir / "labels/val").glob("*.txt"):
        if not is_valid_yolo_label(lbl)[0]:
            all_valid = False
            break

    print(f"All remaining labels valid:    {all_valid}")

if __name__ == "__main__":
    clean_dataset()
