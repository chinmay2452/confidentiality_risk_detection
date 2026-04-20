from typing import List, Dict, Tuple
from app.models.schemas import Risk

class EvaluationMetrics:
    def __init__(self, tp: int, fp: int, fn: int):
        self.tp = tp
        self.fp = fp
        self.fn = fn

    @property
    def precision(self) -> float:
        if self.tp + self.fp == 0:
            return 0.0
        return self.tp / (self.tp + self.fp)

    @property
    def recall(self) -> float:
        if self.tp + self.fn == 0:
            return 0.0
        return self.tp / (self.tp + self.fn)

    @property
    def f1_score(self) -> float:
        p = self.precision
        r = self.recall
        if p + r == 0:
            return 0.0
        return 2 * (p * r) / (p + r)

    @property
    def accuracy(self) -> float:
        # Without true negatives naturally defined for "risks not present", we use the set-based accuracy
        # or Jaccard index: TP / (TP + FP + FN)
        total = self.tp + self.fp + self.fn
        if total == 0:
            return 1.0
        return self.tp / total

def extract_risk_signature(risk: Risk) -> Tuple[str, Tuple[str, ...]]:
    """Create a normalized signature for matching risks: (rule_name, sorted(affected_components))."""
    return (risk.rule, tuple(sorted(risk.affected_components)))

def evaluate_predictions(expected_risks: List[Risk], predicted_risks: List[Risk]) -> EvaluationMetrics:
    """Compare predictions against ground truth and compute metrics."""
    
    expected_sigs = set(extract_risk_signature(r) for r in expected_risks)
    predicted_sigs = set(extract_risk_signature(r) for r in predicted_risks)
    
    tp = len(expected_sigs.intersection(predicted_sigs))
    fp = len(predicted_sigs - expected_sigs)
    fn = len(expected_sigs - predicted_sigs)
    
    return EvaluationMetrics(tp=tp, fp=fp, fn=fn)

def print_metrics(metrics: EvaluationMetrics, case_name: str = "Overall"):
    print(f"\n{'='*40}")
    print(f"Evaluation Metrics: {case_name}")
    print(f"{'='*40}")
    print(f"True Positives (TP): {metrics.tp}")
    print(f"False Positives (FP): {metrics.fp}")
    print(f"False Negatives (FN): {metrics.fn}")
    print(f"Accuracy:           {metrics.accuracy * 100:.2f}%")
    print(f"Precision:          {metrics.precision * 100:.2f}%")
    print(f"Recall:             {metrics.recall * 100:.2f}%")
    print(f"F1 Score:           {metrics.f1_score * 100:.2f}%")
    print(f"{'='*40}")
