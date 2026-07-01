import torch
from torchvision import models

path = 'best_multiclass_model.pth'
state_dict = torch.load(path, map_location='cpu')

for name, param in state_dict.items():
    if 'classifier' in name and 'weight' in name:
        print(f"{name}: {param.shape}")
