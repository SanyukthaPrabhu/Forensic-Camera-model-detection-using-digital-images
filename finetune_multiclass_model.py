import os
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

# Config
DATA_DIR = r'c:\Users\sanyu\Downloads\sp-society-camera-model-identification\train\train\dataset_multiclass_faces'
CHECKPOINT_PATH = 'best_multiclass_model.pth'   # Resume from existing model
MODEL_SAVE_PATH  = 'best_multiclass_model.pth'   # Save back to same file

BATCH_SIZE = 32
EPOCHS     = 10
LR         = 1e-5          # Fine-tune with a very small learning rate

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def main():
    print(f"Using device: {DEVICE}")

    # ── Stronger Data Augmentation ──────────────────────────────────────────
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(p=0.1),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.3, contrast=0.3,
                                   saturation=0.2, hue=0.05),
            transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
            transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    image_datasets = {
        x: datasets.ImageFolder(os.path.join(DATA_DIR, x), data_transforms[x])
        for x in ['train', 'val']
    }
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
        for x in ['train', 'val']
    }
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
    class_names   = image_datasets['train'].classes
    num_classes   = len(class_names)
    print(f"Classes ({num_classes}): {class_names}")
    print(f"Train: {dataset_sizes['train']} | Val: {dataset_sizes['val']}")

    # ── Load EfficientNet-B0 and resume from checkpoint ─────────────────────
    print("\nLoading EfficientNet-B0 architecture...")
    model = models.efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4, inplace=True),
        nn.Linear(1280, num_classes)
    )
    if os.path.exists(CHECKPOINT_PATH):
        model.load_state_dict(torch.load(CHECKPOINT_PATH, map_location=DEVICE))
        print(f"Resumed from checkpoint: {CHECKPOINT_PATH}")
    else:
        print("WARNING: No checkpoint found — starting from scratch!")

    # ── Unfreeze deeper layers for richer feature fine-tuning ───────────────
    for param in model.parameters():
        param.requires_grad = False        # Freeze everything first

    for layer_idx in [6, 7, 8]:           # Unfreeze 3 last conv blocks
        for param in model.features[layer_idx].parameters():
            param.requires_grad = True

    for param in model.classifier.parameters():
        param.requires_grad = True         # Always train the classifier head

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"Trainable params: {trainable:,} / {total:,}")

    model = model.to(DEVICE)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=LR
    )
    # Auto-reduce LR when val accuracy stops improving
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', factor=0.5, patience=2, verbose=True
    )

    best_acc = 0.0

    # ── Training Loop ────────────────────────────────────────────────────────
    for epoch in range(EPOCHS):
        print(f'\nEpoch {epoch+1}/{EPOCHS}')
        print('-' * 30)

        for phase in ['train', 'val']:
            model.train() if phase == 'train' else model.eval()

            running_loss     = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(DEVICE)
                labels = labels.to(DEVICE)

                optimizer.zero_grad()
                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)
                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss     += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc  = running_corrects.double() / dataset_sizes[phase]
            print(f'{phase.capitalize():5s}  Loss: {epoch_loss:.4f}  Acc: {epoch_acc:.4f} ({epoch_acc*100:.1f}%)')

            if phase == 'val':
                scheduler.step(epoch_acc)
                if epoch_acc > best_acc:
                    best_acc = epoch_acc
                    torch.save(model.state_dict(), MODEL_SAVE_PATH)
                    print(f"  --> ✅ New best saved! Val Acc: {best_acc*100:.2f}%")

    print(f'\nFine-tuning complete! Best Val Acc: {best_acc*100:.2f}%')

if __name__ == '__main__':
    start = time.time()
    main()
    print(f"Total time: {time.time()-start:.1f}s")
