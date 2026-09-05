import os
import hashlib
from pathlib import Path
from PIL import Image

def get_image_hash(img_path):
    """Compute MD5 hash of the image file for exact duplicate detection."""
    hasher = hashlib.md5()
    with open(img_path, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def prepare_images():
    base_dir = Path("anpr-city-platform/ml-service/datasets")
    sources = ["google_images", "State-wise_OLX", "video_images"]
    output_dir = base_dir / "plates_clean"
    output_dir.mkdir(parents=True, exist_ok=True)

    extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    all_images = []

    print("Scanning source folders...")
    for source in sources:
        source_path = base_dir / source
        if not source_path.exists():
            print(f"Warning: Source folder {source_path} not found.")
            continue

        for ext in extensions:
            all_images.extend(list(source_path.rglob(f"*{ext}")))
            all_images.extend(list(source_path.rglob(f"*{ext.upper()}")))

    total_found = len(all_images)
    print(f"Found {total_found} candidate images.")

    seen_hashes = set()
    unique_images = []

    print("Removing exact duplicates...")
    for img_path in all_images:
        try:
            img_hash = get_image_hash(img_path)
            if img_hash not in seen_hashes:
                seen_hashes.add(img_hash)
                unique_images.append(img_path)
        except Exception as e:
            print(f"Error hashing {img_path}: {e}")

    duplicates_removed = total_found - len(unique_images)
    print(f"Removed {duplicates_removed} exact duplicates.")

    print("Processing and cleaning images...")
    final_count = 0
    for i, img_path in enumerate(unique_images, 1):
        try:
            with Image.open(img_path) as img:
                # Convert to RGB (handles PNG alpha, WebP, etc.)
                img = img.convert("RGB")

                # Resize if long side > 1280px
                w, h = img.size
                if max(w, h) > 1280:
                    if w > h:
                        new_w = 1280
                        new_h = int(h * (1280 / w))
                    else:
                        new_h = 1280
                        new_w = int(w * (1280 / h))
                    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

                # Save as JPG
                target_name = f"img_{i:04d}.jpg"
                img.save(output_dir / target_name, "JPEG", quality=95)
                final_count += 1
        except Exception as e:
            print(f"Error processing {img_path}: {e}")

    print("\n--- Summary ---")
    print(f"Total images found:   {total_found}")
    print(f"Duplicates removed:   {duplicates_removed}")
    print(f"Final clean count:    {final_count}")
    print(f"Clean images saved to: {output_dir}")

if __name__ == "__main__":
    prepare_images()
