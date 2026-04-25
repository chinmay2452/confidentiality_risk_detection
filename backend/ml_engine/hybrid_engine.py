import json
from predictor import predict_severity

def map_rule_to_ml_features(rule_output: dict) -> dict:
    """
    Maps rule-based outputs to the feature schema expected by the ML model.
    This simulates the extraction logic from raw rule findings.
    """
    risk_type = rule_output.get("risk_type", "").lower()
    
    # Default baseline features
    features = {
        'attack_vector': 'Network',
        'attack_complexity': 'Low',
        'privileges_required': 'None',
        'user_interaction': 'None',
        'confidentiality_impact': 'None',
        'integrity_impact': 'None',
        'availability_impact': 'None'
    }
    
    # Heuristic mapping based on common vulnerability keywords
    if "unencrypted" in risk_type or "plaintext" in risk_type:
        features['confidentiality_impact'] = 'High'
    if "injection" in risk_type or "xss" in risk_type:
        features['integrity_impact'] = 'High'
        features['confidentiality_impact'] = 'Low'
    if "ddos" in risk_type or "rate limit" in risk_type or "dos" in risk_type:
        features['availability_impact'] = 'High'
    if "auth" in risk_type or "privilege" in risk_type:
        features['privileges_required'] = 'Low'
        features['confidentiality_impact'] = 'High'
        features['integrity_impact'] = 'High'
        
    return features

def evaluate_hybrid_risk(rule_output: dict) -> dict:
    """
    Combines rule-based severity with ML prediction using a confidence threshold.
    """
    rule_severity = rule_output.get("rule_severity", "Low")
    
    # 1. Convert Rule output to ML features
    ml_features = map_rule_to_ml_features(rule_output)
    
    # 2. Get ML Prediction
    try:
        ml_severity, ml_confidence = predict_severity(ml_features)
    except Exception as e:
        # Fallback strictly to rule if ML prediction fails
        return {
            "final_severity": rule_severity,
            "ml_prediction": "Error",
            "rule_severity": rule_severity,
            "confidence": 0.0,
            "decision_source": "rule"
        }
        
    # 3. Hybrid Decision Logic
    if rule_severity == ml_severity:
        final_severity = rule_severity
        decision_source = "hybrid (agree)"
    else:
        # Conflict Resolution: trust ML if highly confident, else trust rule
        if ml_confidence > 0.70:
            final_severity = ml_severity
            decision_source = "ml"
        else:
            final_severity = rule_severity
            decision_source = "rule"
            
    return {
        "final_severity": final_severity,
        "ml_prediction": ml_severity,
        "rule_severity": rule_severity,
        "confidence": round(float(ml_confidence), 4),
        "decision_source": decision_source
    }

if __name__ == "__main__":
    # Test simulation
    sample_rule = {
        "risk_type": "Unencrypted API",
        "rule_severity": "High",
        "component": "Auth Service"
    }
    
    print(f"Input Rule: {json.dumps(sample_rule, indent=2)}")
    result = evaluate_hybrid_risk(sample_rule)
    print(f"\nHybrid Output: {json.dumps(result, indent=2)}")
