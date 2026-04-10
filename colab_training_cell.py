import os
import random
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from torchvision import models, transforms
from PIL import Image
from sklearn.model_selection import train_test_split

# ---------------------------------------------------------
# Hyperparameters & Configurations
# ---------------------------------------------------------
DATA_DIR = '.' # Running locally where the 10 camera model folders are stored
CHECKPOINT_DIR = './checkpoint'
BEST_MODEL_PATH = 'best_model.pth'

NUM_CLASSES = 10
IMAGES_PER_CLASS = 100
SEED = 42
TEST_SIZE = 0.2
PATCH_SIZE = 224
MAX_PATCHES_PER_IMAGE = 10
VAR_THRESHOLD = 500
BATCH_SIZE = 32
NUM_WORKERS = 0
EPOCHS = 5
LR = 1e-3
STEP_SIZE = 2
GAMMA = 0.5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CLASSES = [
    'HTC-1-M7', 'LG-Nexus-5x', 'Motorola-Droid-Maxx', 
    'Motorola-Nexus-6', 'Motorola-X', 'Samsung-Galaxy-Note3', 
    'Samsung-Galaxy-S4', 'Sony-NEX-7', 'iPhone-4s', 'iPhone-6'
]

# ---------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

os.makedirs(CHECKPOINT_DIR, exist_ok=True)

# ---------------------------------------------------------
# Data Loading & Image-Level Splitting
# ---------------------------------------------------------
all_images = []
all_labels = []

for label_idx, class_name in enumerate(CLASSES):
    class_dir = os.path.join(DATA_DIR, class_name)
    if os.path.isdir(class_dir):
        # Gather valid image files
        images = [f for f in os.listdir(class_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.tif', '.tiff'))]
        
        # Randomly sample exactly 100 images per class (fixed seed)
        sampled_images = random.sample(images, min(IMAGES_PER_CLASS, len(images)))
        
        for img_name in sampled_images:
            all_images.append(os.path.join(class_dir, img_name))
            all_labels.append(label_idx)
    else:
        print(f"Warning: Directory not found - {class_dir}")

# Split 80% Train, 20% Val at Image Level (Stratified)
train_imgs, val_imgs, train_lbls, val_lbls = train_test_split(
    all_images, all_labels, 
    test_size=TEST_SIZE, 
    stratify=all_labels, 
    random_state=SEED
)

# ---------------------------------------------------------
# Patch Extraction & Preloading to RAM
# ---------------------------------------------------------
# Preprocessing transformations (ImageNet normalization)
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

def extract_and_preload_patches(image_paths, labels, desc):
    patches_list = []
    labels_list = []
    
    print(f"Extracting patches for {desc} set...")
    start_t = time.time()
    
    for img_path, label in zip(image_paths, labels):
        try:
            img = Image.open(img_path).convert('RGB')
            img_arr = np.array(img)
            h, w, _ = img_arr.shape
            
            patches_extracted = 0
            
            # Grid extraction (No Overlap)
            for y in range(0, h - PATCH_SIZE + 1, PATCH_SIZE):
                for x in range(0, w - PATCH_SIZE + 1, PATCH_SIZE):
                    if patches_extracted >= MAX_PATCHES_PER_IMAGE:
                        break
                        
                    patch = img_arr[y:y+PATCH_SIZE, x:x+PATCH_SIZE, :]
                    
                    # Convert to grayscale to evaluate pixel variance
                    gray_patch = np.dot(patch[...,:3], [0.2989, 0.5870, 0.1140])
                    variance = np.var(gray_patch)
                    
                    # Keep patches with variance below threshold
                    if variance < VAR_THRESHOLD:
                        patch_img = Image.fromarray(patch)
                        patch_tensor = transform(patch_img)
                        
                        patches_list.append(patch_tensor)
                        labels_list.append(label)
                        patches_extracted += 1
                        
                if patches_extracted >= MAX_PATCHES_PER_IMAGE:
                    break
        except Exception as e:
            print(f"Error loading {img_path}: {e}")
            
    if len(patches_list) == 0:
        return torch.empty(0), torch.empty(0)
    
    X_tensor = torch.stack(patches_list)
    y_tensor = torch.tensor(labels_list, dtype=torch.long)
    print(f"Finished {desc} set in {time.time() - start_t:.2f}s | Shape: {X_tensor.shape}")
    return X_tensor, y_tensor

train_inputs, train_targets = extract_and_preload_patches(train_imgs, train_lbls, "Train")
val_inputs, val_targets = extract_and_preload_patches(val_imgs, val_lbls, "Validation")

# ---------------------------------------------------------
# Datasets and DataLoaders
# ---------------------------------------------------------
train_dataset = TensorDataset(train_inputs, train_targets)
val_dataset = TensorDataset(val_inputs, val_targets)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKERS)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)

# ---------------------------------------------------------
# Model Architecture
# ---------------------------------------------------------
print("Initializing EfficientNet-B0 model...")
# Pretrained EfficientNet-B0
model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

# Freeze entire backbone
for param in model.parameters():
    param.requires_grad = False

# Replace classifier head: Dropout(0.3) -> Linear(1280, 10)
model.classifier = nn.Sequential(
    nn.Dropout(p=0.3, inplace=True),
    nn.Linear(1280, NUM_CLASSES)
)

model = model.to(DEVICE)

# ---------------------------------------------------------
# Training Configuration
# ---------------------------------------------------------
criterion = nn.CrossEntropyLoss()

# Train only the classifier head
optimizer = optim.Adam(model.classifier.parameters(), lr=LR)
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=STEP_SIZE, gamma=GAMMA)

# ---------------------------------------------------------
# Training Loop
# ---------------------------------------------------------
best_val_acc = 0.0

print(f"Starting training on {DEVICE} for {EPOCHS} epochs...")

for epoch in range(1, EPOCHS + 1):
    start_time = time.time()
    
    # --- Train Phase ---
    model.train()
    train_loss = 0.0
    train_correct = 0
    train_total = 0
    
    for inputs, labels in train_loader:
        inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item() * inputs.size(0)
        _, preds = torch.max(outputs, 1)
        train_correct += torch.sum(preds == labels.data).item()
        train_total += labels.size(0)
        
    epoch_train_loss = train_loss / train_total if train_total > 0 else 0.0
    epoch_train_acc = train_correct / train_total if train_total > 0 else 0.0
    
    # --- Validation Phase ---
    model.eval()
    val_loss = 0.0
    val_correct = 0
    val_total = 0
    
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
            
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            val_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            val_correct += torch.sum(preds == labels.data).item()
            val_total += labels.size(0)
            
    epoch_val_loss = val_loss / val_total if val_total > 0 else 0.0
    epoch_val_acc = val_correct / val_total if val_total > 0 else 0.0
    
    # Step the learning rate scheduler
    scheduler.step()
    
    time_taken = time.time() - start_time
    
    # --- Logging ---
    print(
        f"Epoch {epoch}/{EPOCHS} | "
        f"Train Loss: {epoch_train_loss:.4f} | Train Acc: {epoch_train_acc:.4f} | "
        f"Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc:.4f} | "
        f"Time: {time_taken:.2f}s"
    )
          
    # --- Save Checkpoints ---
    checkpoint_path = os.path.join(CHECKPOINT_DIR, f'checkpoint_epoch_{epoch}.pth')
    torch.save({
        'epoch': epoch,
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'val_loss': epoch_val_loss,
        'val_acc': epoch_val_acc
    }, checkpoint_path)
    
    # Save Best Model separately
    if epoch_val_acc > best_val_acc:
        best_val_acc = epoch_val_acc
        torch.save(model.state_dict(), BEST_MODEL_PATH)

print(f"Training Custom Head Completed! Best Validation Accuracy: {best_val_acc:.4f}")
