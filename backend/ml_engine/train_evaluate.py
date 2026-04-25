import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import GridSearchCV
from dataset_loader import get_preprocessed_data

def evaluate_model(y_true, y_pred, model_name):
    """
    Evaluates a model and returns standard metrics.
    """
    acc = accuracy_score(y_true, y_pred)
    # Using weighted average since it's a multi-class classification
    prec = precision_score(y_true, y_pred, average='weighted', zero_division=0)
    rec = recall_score(y_true, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    
    print(f"--- {model_name} Evaluation ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("-" * 30)
    
    return {'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': f1, 'cm': cm}

def train_and_evaluate():
    X_train, X_test, y_train, y_test, feature_names = get_preprocessed_data()
    
    print("Training Random Forest...")
    rf = RandomForestClassifier(random_state=42)
    # Basic hyperparameter tuning
    rf_params = {'n_estimators': [50, 100], 'max_depth': [None, 10, 20]}
    rf_grid = GridSearchCV(rf, rf_params, cv=3, scoring='f1_weighted', n_jobs=-1)
    rf_grid.fit(X_train, y_train)
    best_rf = rf_grid.best_estimator_
    
    rf_preds = best_rf.predict(X_test)
    rf_metrics = evaluate_model(y_test, rf_preds, "Random Forest")
    
    print("Training XGBoost...")
    xgb = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    xgb_params = {'n_estimators': [50, 100], 'max_depth': [3, 5, 7], 'learning_rate': [0.01, 0.1]}
    xgb_grid = GridSearchCV(xgb, xgb_params, cv=3, scoring='f1_weighted', n_jobs=-1)
    xgb_grid.fit(X_train, y_train)
    best_xgb = xgb_grid.best_estimator_
    
    xgb_preds = best_xgb.predict(X_test)
    xgb_metrics = evaluate_model(y_test, xgb_preds, "XGBoost")
    
    # Compare and save best model
    if rf_metrics['f1'] >= xgb_metrics['f1']:
        print("Random Forest is the better model.")
        best_model = best_rf
        best_model_name = "RandomForest"
    else:
        print("XGBoost is the better model.")
        best_model = best_xgb
        best_model_name = "XGBoost"
        
    models_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(models_dir, 'best_severity_model.joblib')
    
    # Save the model
    joblib.dump(best_model, model_path)
    # Also save the model name so the predictor knows what it is
    joblib.dump(best_model_name, os.path.join(models_dir, 'model_info.joblib'))
    
    print(f"Saved best model ({best_model_name}) to {model_path}")
    
    # Save feature names to ensure prediction inputs match
    joblib.dump(feature_names, os.path.join(models_dir, 'feature_names.joblib'))

if __name__ == "__main__":
    train_and_evaluate()
