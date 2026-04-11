import os
import shutil
import random
from sklearn.model_selection import train_test_split

# Config
SOURCE_DIR = r'c:\Users\sanyu\Downloads\sp-society-camera-model-identification\train\train\FF++C32-Frames'
TARGET_DIR = r'c:\Users\sanyu\Downloads\sp-society-camera-model-identification\train\train\dataset_multiclass_raw'

CLASSES = ['Original', 'Deepfakes', 'Face2Face', 'FaceShifter', 'FaceSwap', 'NeuralTextures']
SAMPLES_PER_CLASS = 3000
TEST_SIZE = 0.2
SEED = 42

random.seed(SEED)

def get_image_files(directory):
    if not os.path.exists(directory):
        return []
    return [os.path.join(directory, f) for f in os.listdir(directory) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

def setup_directories():
    for split in ['train', 'val']:
        for cls in CLASSES:
            os.makedirs(os.path.join(TARGET_DIR, split, cls), exist_ok=True)

def copy_files(file_list, split, cls_name):
    for f in file_list:
        shutil.copy2(f, os.path.join(TARGET_DIR, split, cls_name, os.path.basename(f)))

def main():
    print(f"Preparing Multiclass dataset from {SOURCE_DIR}...")
    setup_directories()

    for cls in CLASSES:
        src_dir = os.path.join(SOURCE_DIR, cls)
        all_imgs = get_image_files(src_dir)
        print(f"Found {len(all_imgs)} frames for class: {cls}")
        
        if len(all_imgs) == 0:
            print(f"WARNING: No images found for {cls}. Skipping...")
            continue
            
        sampled = random.sample(all_imgs, min(SAMPLES_PER_CLASS, len(all_imgs)))
        print(f"Sampled {len(sampled)} frames for {cls}")

        train_imgs, val_imgs = train_test_split(sampled, test_size=TEST_SIZE, random_state=SEED)
        
        print(f"-> Train: {len(train_imgs)}, Val: {len(val_imgs)}")
        
        copy_files(train_imgs, 'train', cls)
        copy_files(val_imgs, 'val', cls)

    print(f"Multiclass dataset successfully prepared in {TARGET_DIR}")

if __name__ == '__main__':
    main()
