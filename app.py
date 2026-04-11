import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
from collections import Counter
from flask import Flask, request, jsonify, render_template
from facenet_pytorch import MTCNN
import base64
import cv2
from grad_cam import GradCAM, overlay_heatmap

app = Flask(__name__)

# Config
BEST_MODEL_PATH = 'best_model_finetuned.pth'
REAL_FAKE_MODEL_PATH = 'best_real_fake_model.pth'
NUM_CLASSES = 10
PATCH_SIZE = 224
MAX_PATCHES_PER_IMAGE = 10
VAR_THRESHOLD = 500          # forensic threshold — fallback used for high-variance images
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

CLASSES = [
    'HTC-1-M7', 'LG-Nexus-5x', 'Motorola-Droid-Maxx',
    'Motorola-Nexus-6', 'Motorola-X', 'Samsung-Galaxy-Note3',
    'Samsung-Galaxy-S4', 'Sony-NEX-7', 'iPhone-4s', 'iPhone-6'
]

# Load model once at startup
print(f"Loading model on {DEVICE}...")
model = models.efficientnet_b0()
model.classifier = nn.Sequential(
    nn.Dropout(p=0.3, inplace=True),
    nn.Linear(1280, NUM_CLASSES)
)
if os.path.exists(BEST_MODEL_PATH):
    model.load_state_dict(torch.load(BEST_MODEL_PATH, map_location=DEVICE))
    print("best_model.pth loaded successfully.")
else:
    print("WARNING: best_model.pth not found — using random weights!")
model = model.to(DEVICE)
model.eval()

MULTICLASS_MODEL_PATH = 'best_multiclass_model.pth'
MULTICLASS_CLASSES = ['Deepfakes', 'Face2Face', 'FaceShifter', 'FaceSwap', 'NeuralTextures', 'Original']

# Load Multiclass model
print(f"Loading Multiclass model on {DEVICE}...")
multiclass_model = models.efficientnet_b0()
num_ftrs = multiclass_model.classifier[1].in_features
multiclass_model.classifier = nn.Sequential(
    nn.Dropout(p=0.4, inplace=True),
    nn.Linear(num_ftrs, 6)
)
if os.path.exists(MULTICLASS_MODEL_PATH):
    multiclass_model.load_state_dict(torch.load(MULTICLASS_MODEL_PATH, map_location=DEVICE))
    print("best_multiclass_model.pth loaded successfully.")
else:
    print("WARNING: best_multiclass_model.pth not found — using random weights!")
multiclass_model = multiclass_model.to(DEVICE)
multiclass_model.eval()

# Initialize Grad-CAM
grad_cam = GradCAM(multiclass_model, multiclass_model.features[-1])

# Init Face Detector
print("Initializing MTCNN Face Detector...")
mtcnn = MTCNN(image_size=224, margin=30, keep_all=False, post_process=False, device=DEVICE)

transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        img = Image.open(file.stream).convert('RGB')
        img_arr = np.array(img)
        h, w, _ = img_arr.shape

        if h < PATCH_SIZE or w < PATCH_SIZE:
            return jsonify({'error': f'Image too small ({w}x{h} px). Need at least {PATCH_SIZE}x{PATCH_SIZE}.'}), 400

        # Extract all non-overlapping grid patches + compute variance
        all_candidates = []
        for y in range(0, h - PATCH_SIZE + 1, PATCH_SIZE):
            for x in range(0, w - PATCH_SIZE + 1, PATCH_SIZE):
                patch = img_arr[y:y+PATCH_SIZE, x:x+PATCH_SIZE, :]
                gray = np.dot(patch[..., :3], [0.2989, 0.5870, 0.1140])
                variance = float(np.var(gray))
                all_candidates.append((variance, patch))

        if len(all_candidates) == 0:
            return jsonify({'error': 'Could not extract any patches from this image.'}), 400

        # Prefer low-variance patches (forensic uniform regions)
        passing = [(v, p) for v, p in all_candidates if v < VAR_THRESHOLD]

        # Fallback: if none pass threshold, use lowest-variance ones available
        used_fallback = False
        if len(passing) == 0:
            passing = sorted(all_candidates, key=lambda x: x[0])
            used_fallback = True

        passing = passing[:MAX_PATCHES_PER_IMAGE]
        patches_extracted = len(passing)

        patches_list = [transform(Image.fromarray(p)) for _, p in passing]

        with torch.no_grad():
            X_tensor = torch.stack(patches_list).to(DEVICE)
            
            # Camera Identification
            outputs = model(X_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)
            preds_list = preds.cpu().numpy().tolist()
            
        # --- Live Face Extraction for Multiclass inference ---
        face_tensor = mtcnn(img)
        rf_confidence = 0.0
        authenticity_label = "NO FACE DETECTED"
        deepfake_type = None
        heatmap_base64 = None

        if face_tensor is not None:
            # MTCNN yields 0-255 uint8 tensor. Normalize it using standard pipeline
            face_img_pil = transforms.ToPILImage()(face_tensor.byte())
            face_input = transform(face_img_pil).unsqueeze(0).to(DEVICE)
            face_input.requires_grad = True
            
            mc_output = multiclass_model(face_input)
            mc_probs = torch.nn.functional.softmax(mc_output, dim=1)[0]
            max_prob, predicted_idx = torch.max(mc_probs, 0)
            
            predicted_type = MULTICLASS_CLASSES[predicted_idx.item()]
            rf_confidence = float(max_prob.cpu().item())
            
            if predicted_type == 'Original':
                authenticity_label = "REAL"
            else:
                authenticity_label = "FAKE"
                deepfake_type = predicted_type
                
                try:
                    heatmap = grad_cam.generate_heatmap(face_input, predicted_idx.item())
                    overlay = overlay_heatmap(face_img_pil, heatmap)
                    _, buffer = cv2.imencode('.jpg', overlay)
                    heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
                except Exception as ex:
                    print(f"Heatmap error: {ex}")

        # Image-level: majority vote across patches
        majority_vote = Counter(preds_list).most_common(1)[0][0]
        predicted_class = CLASSES[majority_vote]

        avg_probs = torch.mean(probs, dim=0).cpu().numpy()
        confidence = float(avg_probs[majority_vote])
        class_scores = {CLASSES[i]: f"{float(avg_probs[i])*100:.1f}%" for i in range(NUM_CLASSES)}

        return jsonify({
            'predicted_class': predicted_class,
            'confidence': f"{confidence * 100:.2f}%",
            'authenticity': authenticity_label,
            'deepfake_type': deepfake_type,
            'heatmap_base64': heatmap_base64,
            'authenticity_confidence': f"{rf_confidence * 100:.2f}%",
            'patches_processed': patches_extracted,
            'used_fallback': used_fallback,
            'class_scores': class_scores
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=5000)
