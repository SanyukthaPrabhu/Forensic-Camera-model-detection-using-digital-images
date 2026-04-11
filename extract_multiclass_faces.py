import os
import torch
from facenet_pytorch import MTCNN
from PIL import Image
from tqdm import tqdm
import torchvision.transforms as T

SOURCE_DIR = r'c:\Users\sanyu\Downloads\sp-society-camera-model-identification\train\train\dataset_multiclass_raw'
TARGET_DIR = r'c:\Users\sanyu\Downloads\sp-society-camera-model-identification\train\train\dataset_multiclass_faces'

CLASSES = ['Original', 'Deepfakes', 'Face2Face', 'FaceShifter', 'FaceSwap', 'NeuralTextures']

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

mtcnn = MTCNN(image_size=224, margin=30, keep_all=False, post_process=False, device=device)

def process_directory(split, cls_name):
    src = os.path.join(SOURCE_DIR, split, cls_name)
    tgt = os.path.join(TARGET_DIR, split, cls_name)
    os.makedirs(tgt, exist_ok=True)
    
    if not os.path.exists(src):
        print(f"Skipping {src} (does not exist)")
        return
        
    valid_files = [f for f in os.listdir(src) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    success_count = 0
    fail_count = 0
    
    for filename in tqdm(valid_files, desc=f"Extracting {split}/{cls_name}"):
        img_path = os.path.join(src, filename)
        save_path = os.path.join(tgt, filename)
        
        try:
            img = Image.open(img_path).convert('RGB')
            face_tensor = mtcnn(img)
            
            if face_tensor is not None:
                face_img = T.ToPILImage()(face_tensor.byte())
                face_img.save(save_path)
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            fail_count += 1

    print(f"[{split}/{cls_name}] Success: {success_count} | Failed: {fail_count}")

def main():
    print(f"Initializing MTCNN Face Extractor on {device}...")
    
    for split in ['train', 'val']:
        for cls in CLASSES:
            process_directory(split, cls)
            
    print(f"Extraction completed to {TARGET_DIR}!")

if __name__ == '__main__':
    main()
