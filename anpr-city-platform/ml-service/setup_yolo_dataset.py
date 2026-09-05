import os
import shutil
from pathlib import Path

def validate_label(label_path):
    """Checks if the label file contains valid YOLO format data."""
    try:
        with open(label_path, 'r') as f:
            lines = f.readlines()
            if not lines:
                return False, "Empty file"
            for line in lines:
                parts = line.strip().split()
                if len(parts) != 5:
                    return False, f"Wrong number of columns: {len(parts)}"

                cls, x, y, w, h = map(float, parts)
                if int(cls) != 0:
                    return False, f"Invalid class: {cls}"
                for val in [x, y, w, h]:
                    if not (0 <= val <= 1):
                        return False, f"Coordinate out of range: {val}"
        return True, None
    except Exception as e:
        return False, str(e)

def setup_dataset():
    # Paths
    root_dir = Path("anpr-city-platform/ml-service/datasets")
    src_dir = root_dir / "plates_roboflow_export"
    dst_dir = root_dir / "plates"

    # Target directory structure
    dirs = [
        dst_dir / "images/train",
        dst_dir / "images/val",
        dst_dir / "labels/train",
        dst_dir / "labels/val",
    ]

    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

    # Mapping source to destination
    mapping = {
        "train/images": "images/train",
        "train/labels": "labels/train",
        "valid/images": "images/val",
        "valid/labels": "labels/val",
    }

    # Copy files
    for src_sub, dst_sub in mapping.items():
        src_path = src_dir / src_sub
        dst_path = dst_dir / dst_sub
        if src_path.exists():
            for file in src_path.iterdir():
                shutil.copy2(file, dst_path / file.name)

    # Write data.yaml
    yaml_content = """path: .
train: images/train
val: images/val
nc: 1
names:
  0: license_plate
"""
    with open(dst_dir / "data.yaml", "w") as f:
        f.write(yaml_content)

    # Validation
    summary = {
        "train_images": 0,
        "train_labels": 0,
        "val_images": 0,
        "val_labels": 0,
        "missing_labels": 0,
        "invalid_labels": 0,
        "total_images": 0
    }

    # Validate Train
    train_imgs = list((dst_dir / "images/train").glob("*"))
    summary["train_images"] = len(train_imgs)
    summary["total_images"] += len(train_imgs)

    for img in train_imgs:
        label_name = img.stem + ".txt"
        label_path = dst_dir / "labels/train" / label_name
        if label_path.exists():
            summary["train_labels"] += 1
            valid, err = validate_label(label_path)
            if not valid:
                summary["invalid_labels"] += 1
                print(f"Invalid label: {label_path} - {err}")
        else:
            summary["missing_labels"] += 1

    # Validate Val
    val_imgs = list((dst_dir / "images/val").glob("*"))
    summary["val_images"] = len(val_imgs)
    summary["total_images"] += len(val_imgs)

    for img in val_imgs:
        label_name = img.stem + ".txt"
        label_path = dst_dir / "labels/val" / label_name
        if label_path.exists():
            summary["val_labels"] += 1
            valid, err = validate_label(label_path)
            if not valid:
                summary["invalid_labels"] += 1
                print(f"Invalid label: {label_path} - {err}")
        else:
            summary["missing_labels"] += 1

    # Print summary
    print("\n--- Dataset Final Summary ---")
    print(f"Train Images:    {summary['train_images']}")
    print(f"Train Labels:    {summary['train_labels']}")
    print(f"Val Images:      {summary['val_images']}")
    print(f"Val Labels:      {summary['val_labels']}")
    print(f"Missing Labels:  {summary['missing_labels']}")
    print(f"Invalid Labels:  {summary['invalid_labels']}")
    print(f"Total Images:    {summary['total_images']}")

if __name__ == "__main__":
    setup_dataset()
