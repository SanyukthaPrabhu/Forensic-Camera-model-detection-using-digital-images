import cv2
import numpy as np
import torch
import torch.nn.functional as F

class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None

        # Hook functions
        def forward_hook(module, input, output):
            self.activations = output

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0]

        # Register hooks
        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_backward_hook(backward_hook)

    def generate_heatmap(self, input_tensor, class_idx=None):
        """
        Generates a Grad-CAM heatmap for the given input tensor.
        Returns:
            heatmap (np.ndarray): 2D numpy array with values in [0, 1]
        """
        self.model.zero_grad()
        
        # Forward pass
        output = self.model(input_tensor)
        
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()
            
        # Backward pass for specific class
        score = output[0, class_idx]
        score.backward(retain_graph=True)
        
        # Get gradients and activations
        gradients = self.gradients.cpu().data.numpy()[0]
        activations = self.activations.cpu().data.numpy()[0]
        
        # Global average pooling on gradients
        weights = np.mean(gradients, axis=(1, 2))
        
        # Weight activations
        heatmap = np.zeros(activations.shape[1:], dtype=np.float32)
        for i, w in enumerate(weights):
            heatmap += w * activations[i]
            
        # ReLU to keep only positive influence
        heatmap = np.maximum(heatmap, 0)
        
        # Normalize
        if np.max(heatmap) > 0:
            heatmap = heatmap / np.max(heatmap)
            
        return heatmap

def overlay_heatmap(original_img_pil, heatmap):
    """
    Overlays the heatmap on the original PIL image.
    Returns: BGR numpy array ready for cv2 encoding
    """
    img_cv = np.array(original_img_pil)[:, :, ::-1].copy() # Convert RGB to BGR
    
    # Resize heatmap to match original image size
    heatmap_resized = cv2.resize(heatmap, (img_cv.shape[1], img_cv.shape[0]))
    
    # Convert heatmap back to uint8 and apply colormap
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    
    # Overlay (0.6 intensity for heatmap, 0.4 for original)
    overlay = cv2.addWeighted(heatmap_colored, 0.4, img_cv, 0.6, 0)
    return overlay
