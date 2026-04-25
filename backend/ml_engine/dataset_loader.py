import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib

def generate_synthetic_cve_data(n_samples=5000):
    """
    Generates a realistic dataset mimicking CVSS v3 vulnerability features.
    """
    np.random.seed(42)
    
    data = {
        'attack_vector': np.random.choice(['Network', 'Adjacent', 'Local', 'Physical'], n_samples, p=[0.6, 0.1, 0.2, 0.1]),
        'attack_complexity': np.random.choice(['Low', 'High'], n_samples, p=[0.8, 0.2]),
        'privileges_required': np.random.choice(['None', 'Low', 'High'], n_samples, p=[0.5, 0.3, 0.2]),
        'user_interaction': np.random.choice(['None', 'Required'], n_samples, p=[0.6, 0.4]),
        'confidentiality_impact': np.random.choice(['None', 'Low', 'High'], n_samples, p=[0.2, 0.3, 0.5]),
        'integrity_impact': np.random.choice(['None', 'Low', 'High'], n_samples, p=[0.2, 0.3, 0.5]),
        'availability_impact': np.random.choice(['None', 'Low', 'High'], n_samples, p=[0.2, 0.3, 0.5]),
    }
    
    df = pd.DataFrame(data)
    
    # Synthesize a numeric CVSS score based loosely on the above parameters
    def calculate_score(row):
        score = 0
        score += 3 if row['attack_vector'] == 'Network' else (1 if row['attack_vector'] == 'Adjacent' else 0)
        score += 1 if row['attack_complexity'] == 'Low' else 0
        score += 2 if row['privileges_required'] == 'None' else (1 if row['privileges_required'] == 'Low' else 0)
        score += 1 if row['user_interaction'] == 'None' else 0
        score += 3 if row['confidentiality_impact'] == 'High' else (1 if row['confidentiality_impact'] == 'Low' else 0)
        score += 3 if row['integrity_impact'] == 'High' else (1 if row['integrity_impact'] == 'Low' else 0)
        score += 3 if row['availability_impact'] == 'High' else (1 if row['availability_impact'] == 'Low' else 0)
        # Normalize to 0-10
        score = (score / 16.0) * 10
        # Add some noise
        score = np.clip(score + np.random.normal(0, 0.5), 0, 10)
        return round(score, 1)

    df['cvss_score'] = df.apply(calculate_score, axis=1)
    
    # Map cvss_score to Low, Medium, High based on prompt
    # If 0-3 -> Low, 4-6 -> Medium, 7-10 -> High
    def map_severity(score):
        if score <= 3.9:
            return 'Low'
        elif score <= 6.9:
            return 'Medium'
        else:
            return 'High'
            
    df['severity'] = df['cvss_score'].apply(map_severity)
    
    return df

def preprocess_data(df):
    """
    Preprocesses the dataset: encodes categoricals, scales numeric features.
    """
    # Separate features and target
    X = df.drop(columns=['severity', 'cvss_score'])
    y = df['severity']
    
    # We will use label encoders for categorical features
    label_encoders = {}
    for col in X.columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col])
        label_encoders[col] = le
        
    # We also need a label encoder for the target variable for XGBoost
    y_encoder = LabelEncoder()
    y_encoded = y_encoder.fit_transform(y)
        
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.3, random_state=42)
    
    # We don't have numeric features in X right now, but if we did, we'd scale them here.
    # We'll just set up a dummy scaler for compatibility if needed.
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    return X_train, X_test, y_train, y_test, label_encoders, scaler, y_encoder

def get_preprocessed_data():
    df = generate_synthetic_cve_data()
    X_train, X_test, y_train, y_test, label_encoders, scaler, y_encoder = preprocess_data(df)
    
    # Save encoders for future prediction
    models_dir = os.path.dirname(os.path.abspath(__file__))
    joblib.dump(label_encoders, os.path.join(models_dir, 'label_encoders.joblib'))
    joblib.dump(scaler, os.path.join(models_dir, 'scaler.joblib'))
    joblib.dump(y_encoder, os.path.join(models_dir, 'y_encoder.joblib'))
    
    return X_train, X_test, y_train, y_test, list(df.columns[:-2])

if __name__ == "__main__":
    X_train, X_test, y_train, y_test, feature_names = get_preprocessed_data()
    print(f"Data shape - X_train: {X_train.shape}, X_test: {X_test.shape}")
    print("Preprocessing complete and encoders saved.")
