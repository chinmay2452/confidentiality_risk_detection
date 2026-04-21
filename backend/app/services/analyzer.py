"""
Architecture Analyzer Service

Orchestrates the flow: parse architecture → run rule engine → build report.
"""

from datetime import datetime, timezone
from app.models.schemas import ArchitectureInput, RiskReport
from app.services.rule_engine import evaluate_architecture


def analyze_architecture(architecture: ArchitectureInput, name: str = "Untitled") -> RiskReport:
    """
    Analyze an architecture definition and produce a risk report.

    Steps:
        1. Parse the architecture components and connections.
        2. Run the rule engine against the parsed data.
        3. Build and return a structured risk report.
    """
    # Step 1 & 2: evaluate
    risks = evaluate_architecture(architecture.components, architecture.connections, architecture.roles)

    # Step 3: classify
    high = sum(1 for r in risks if r.severity == "HIGH")
    medium = sum(1 for r in risks if r.severity == "MEDIUM")
    low = sum(1 for r in risks if r.severity == "LOW")

    return RiskReport(
        architecture_name=name,
        total_risks=len(risks),
        high_risks=high,
        medium_risks=medium,
        low_risks=low,
        risks=risks,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )
