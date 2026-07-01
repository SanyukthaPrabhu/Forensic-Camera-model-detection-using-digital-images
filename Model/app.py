import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
from collections import Counter
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from facenet_pytorch import MTCNN

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from Vercel frontend

# Config
BEST_MODEL_PATH = 'best_model_finetuned.pth'
REAL_FAKE_MODEL_PATH = 'best_real_fake_model.pth'
MULTICLASS_MODEL_PATH = 'best_multiclass_model.pth'
NUM_CLASSES = 10
PATCH_SIZE = 224
MAX_PATCHES_PER_IMAGE = 10
VAR_THRESHOLD = 500          # forensic threshold — fallback used for high-variance images
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

DEEPFAKE_CLASSES = ['Deepfakes', 'Face2Face', 'FaceShifter', 'FaceSwap', 'NeuralTextures', 'Original']
NUM_DEEPFAKE_CLASSES = len(DEEPFAKE_CLASSES)

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
    print(f"  [OK] {BEST_MODEL_PATH} loaded successfully.")
else:
    print(f"  [WARN] {BEST_MODEL_PATH} not found -- using random weights!")
model = model.to(DEVICE)
model.eval()

# Load Real/Fake model
print(f"Loading Real/Fake model on {DEVICE}...")
real_fake_model = models.efficientnet_b0()
num_ftrs = real_fake_model.classifier[1].in_features
real_fake_model.classifier = nn.Sequential(
    nn.Dropout(p=0.4, inplace=True),
    nn.Linear(num_ftrs, 1),
    nn.Sigmoid()
)
if os.path.exists(REAL_FAKE_MODEL_PATH):
    real_fake_model.load_state_dict(torch.load(REAL_FAKE_MODEL_PATH, map_location=DEVICE))
    print(f"  [OK] {REAL_FAKE_MODEL_PATH} loaded successfully.")
else:
    print(f"  [WARN] {REAL_FAKE_MODEL_PATH} not found -- using random weights!")
real_fake_model = real_fake_model.to(DEVICE)
real_fake_model.eval()

# Load Multi-class Deepfake model
print(f"Loading Multi-class Deepfake model on {DEVICE}...")
multiclass_model = models.efficientnet_b0()
num_ftrs_mc = multiclass_model.classifier[1].in_features
multiclass_model.classifier = nn.Sequential(
    nn.Dropout(p=0.4, inplace=True),
    nn.Linear(num_ftrs_mc, NUM_DEEPFAKE_CLASSES)
)
if os.path.exists(MULTICLASS_MODEL_PATH):
    multiclass_model.load_state_dict(torch.load(MULTICLASS_MODEL_PATH, map_location=DEVICE))
    print(f"  [OK] {MULTICLASS_MODEL_PATH} loaded successfully ({NUM_DEEPFAKE_CLASSES} classes).")
else:
    print(f"  [WARN] {MULTICLASS_MODEL_PATH} not found -- using random weights!")
multiclass_model = multiclass_model.to(DEVICE)
multiclass_model.eval()

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

            # --- Live Face Extraction for Real/Fake Inference ---
            face_tensor = mtcnn(img)
            rf_prob_val = 0.5  # Neutral default
            authenticity_label = "NO FACE DETECTED"
            is_real = True

            if face_tensor is not None:
                # MTCNN yields 0-255 uint8 tensor. Normalize it using standard pipeline
                face_img_pil = transforms.ToPILImage()(face_tensor.byte())
                face_input = transform(face_img_pil).unsqueeze(0).to(DEVICE)

                rf_output = real_fake_model(face_input)
                rf_prob_val = float(rf_output.cpu().item())
                is_real = rf_prob_val >= 0.5
                authenticity_label = "REAL" if is_real else "FAKE"

            rf_confidence = rf_prob_val if is_real else (1.0 - rf_prob_val)

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
            'authenticity_confidence': f"{rf_confidence * 100:.2f}%",
            'is_forgery': not is_real,
            'raw_score': f"{rf_prob_val:.4f}",
            'patches_processed': patches_extracted,
            'used_fallback': used_fallback,
            'class_scores': class_scores
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────
# ROUTE: health-check used by frontend to verify server is up
# ─────────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':        'ok',
        'device':        str(DEVICE),
        'camera_classes': CLASSES,
        'num_classes':   NUM_CLASSES,
    })


# ─────────────────────────────────────────────────────────────────
# ROUTE: Multi-class Deepfake Detection  → POST /predict_fake
# ─────────────────────────────────────────────────────────────────
@app.route('/predict_fake', methods=['POST'])
def predict_fake():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        img = Image.open(file.stream).convert('RGB')

        # Try to detect and extract face
        face_tensor = mtcnn(img)

        if face_tensor is None:
            return jsonify({
                'authenticity': 'NO FACE DETECTED',
                'authenticity_confidence': '50.00%',
                'is_forgery': False,
                'predicted_fake_class': 'NO FACE DETECTED',
                'raw_score': '0.5000',
                'fake_class_scores': {cls: '0.0%' for cls in DEEPFAKE_CLASSES}
            })

        # Preprocess extracted face
        face_img_pil = transforms.ToPILImage()(face_tensor.byte())
        face_input = transform(face_img_pil).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            outputs = multiclass_model(face_input)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]

        probs_np = probs.cpu().numpy()
        top_idx = int(probs_np.argmax())
        predicted_class = DEEPFAKE_CLASSES[top_idx]
        confidence = float(probs_np[top_idx])

        is_forgery = predicted_class != 'Original'

        fake_class_scores = {DEEPFAKE_CLASSES[i]: f"{float(probs_np[i])*100:.1f}%" for i in range(NUM_DEEPFAKE_CLASSES)}

        return jsonify({
            'predicted_fake_class': predicted_class,
            'authenticity': 'FAKE' if is_forgery else 'REAL',
            'authenticity_confidence': f"{confidence * 100:.2f}%",
            'is_forgery': is_forgery,
            'raw_score': f"{float(probs_np[0]):.4f}",
            'fake_class_scores': fake_class_scores
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)