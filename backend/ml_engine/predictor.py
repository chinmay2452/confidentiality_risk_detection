import os
import joblib
import pandas as pd
import numpy as np

# Load models and encoders globally to avoid reloading on each prediction
MODELS_DIR = os.path.dirname(os.path.abspath(__file__))

try:
    model = joblib.load(os.path.join(MODELS_DIR, 'best_severity_model.joblib'))
    label_encoders = joblib.load(os.path.join(MODELS_DIR, 'label_encoders.joblib'))
    scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.joblib'))
    y_encoder = joblib.load(os.path.join(MODELS_DIR, 'y_encoder.joblib'))
    feature_names = joblib.load(os.path.join(MODELS_DIR, 'feature_names.joblib'))
except FileNotFoundError:
    model = None
    # Model will be loaded dynamically if missing at start

def load_resources():
    global model, label_encoders, scaler, y_encoder, feature_names
    if model is None:
        model = joblib.load(os.path.join(MODELS_DIR, 'best_severity_model.joblib'))
        label_encoders = joblib.load(os.path.join(MODELS_DIR, 'label_encoders.joblib'))
        scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.joblib'))
        y_encoder = joblib.load(os.path.join(MODELS_DIR, 'y_encoder.joblib'))
        feature_names = joblib.load(os.path.join(MODELS_DIR, 'feature_names.joblib'))

def predict_severity(input_features: dict) -> tuple:
    """
    Predicts the severity of a risk based on input features.
    
    Args:
        input_features (dict): A dictionary of features matching the training data.
                               e.g. {'attack_vector': 'Network', ...}
    Returns:
        tuple: (predicted_severity_label (str), confidence (float))
    """
    load_resources()
    
    # Create a DataFrame for a single row
    df = pd.DataFrame([input_features])
    
    # Ensure columns match expected feature names (add missing with defaults if necessary)
    for col in feature_names:
        if col not in df.columns:
            # Provide sensible defaults if a feature is missing
            # In a real scenario, you'd want stricter validation
            df[col] = 'None' if col in label_encoders else 0
            
    # Reorder to match training precisely
    df = df[feature_names]
    
    # Apply label encoders
    for col, le in label_encoders.items():
        # Handle unseen labels gracefully by mapping to the first class or a default 'None'
        # if the value isn't known to the encoder. For simplicity here:
        df[col] = df[col].apply(lambda x: x if x in le.classes_ else le.classes_[0])
        df[col] = le.transform(df[col])
        
    # Scale (if applicable, though we used it minimally)
    X = scaler.transform(df)
    
    # Predict
    pred_idx = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]
    
    # The confidence is the probability of the predicted class
    confidence = float(np.max(probabilities))
    
    # Decode the label back to "Low", "Medium", "High"
    predicted_label = y_encoder.inverse_transform([pred_idx])[0]
    
    return predicted_label, confidence

if __name__ == "__main__":
    # Test the predictor
    sample_risk = {
        'attack_vector': 'Network',
        'attack_complexity': 'Low',
        'privileges_required': 'None',
        'user_interaction': 'None',
        'confidentiality_impact': 'High',
        'integrity_impact': 'High',
        'availability_impact': 'High'
    }
    
    try:
        label, conf = predict_severity(sample_risk)
        print(f"Predicted Severity: {label} (Confidence: {conf:.2f})")
    except Exception as e:
        print(f"Error testing predictor: {e}. Ensure you have trained the model first.")
