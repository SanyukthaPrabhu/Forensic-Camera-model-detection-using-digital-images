# Forensic Camera Model Identification - Training Results

This document contains the training details and accuracy metrics resulting from executing the `colab_training_cell.py` script. The script successfully processed the dataset and trained the custom EfficientNet-B0 classifier head.

## Dataset & Processing Stats
- **Train Set Patches Extracted:** 7,880 patches (Time taken: ~409.02s)
- **Validation Set Patches Extracted:** 1,939 patches (Time taken: ~128.13s)
- **Patch Size:** $224 \times 224 \times 3$
- **Model Architecture:** EfficientNet-B0 (Pretrained ImageNet1K, Backbone Frozen)
- **Hardware Device:** CPU

## Training Configuration
- **Optimizer:** Adam (Learning Rate: 1e-3)
- **Scheduler:** StepLR (Step size: 2, Gamma: 0.5)
- **Batch Size:** 32
- **Epochs:** 5

---

## Epoch Results

| Epoch | Train Loss | Train Accuracy | Validation Loss | Validation Accuracy | Time Taken |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1/5** | 1.6006 | 48.74% | 1.3110 | 60.55% | 572.91s |
| **2/5** | 1.2059 | 61.45% | 1.1942 | 61.84% | 610.97s |
| **3/5** | 1.1046 | 64.57% | 1.1356 | 63.64% | 588.39s |
| **4/5** | 1.0668 | 65.67% | 1.1228 | 64.52% | 626.82s |
| **5/5** | 1.0345 | 66.05% | 1.0979 | 64.52% | 655.21s |

<br/>

> **Best Validation Accuracy:** 64.52%

The best performing model's weights have been saved under `best_model.pth`. Furthermore, the full states for each epoch are stored in the `./checkpoint/` directory as `checkpoint_epoch_{X}.pth`.
