"""
API Routes for Architecture Analysis

Endpoints:
  POST /analyze           — Analyze architecture and return risk report
  POST /architectures     — Save architecture to Supabase
  GET  /reports/{id}      — Retrieve a stored risk report
  GET  /architectures     — List all saved architectures
  GET  /reports           — List all risk reports
"""

import json
import traceback
from typing import List
from fastapi import APIRouter, HTTPException
from app.models.schemas import ArchitectureInput, ArchitectureCreate, RiskReport, Risk
from app.services.analyzer import analyze_architecture
from app.services.mitigation_engine import generate_mitigation, MitigationReport

router = APIRouter()


@router.post("/analyze", response_model=RiskReport)
def analyze(payload: ArchitectureInput):
    """
    Analyze an architecture definition for confidentiality risks.
    Returns the risk report without persisting anything.
    """
    try:
        report = analyze_architecture(payload)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/architectures")
def create_architecture(payload: ArchitectureCreate):
    """
    Save an architecture definition to Supabase and run analysis.
    Returns the saved architecture id and the risk report.
    """
    try:
        from app.database import get_supabase_client

        supabase = get_supabase_client()

        # Store architecture
        arch_data = {
            "name": payload.name,
            "architecture_json": payload.architecture.model_dump(),
        }
        arch_result = supabase.table("architectures").insert(arch_data).execute()

        if not arch_result.data:
            raise HTTPException(status_code=500, detail="Failed to save architecture")

        architecture_id = arch_result.data[0]["id"]

        # Run analysis
        report = analyze_architecture(payload.architecture, name=payload.name)

        # Store report
        report_data = {
            "architecture_id": architecture_id,
            "risks_json": report.model_dump(),
        }
        report_result = supabase.table("risk_reports").insert(report_data).execute()

        return {
            "architecture_id": architecture_id,
            "report": report.model_dump(),
            "report_id": report_result.data[0]["id"] if report_result.data else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save: {str(e)}")


@router.get("/architectures")
def list_architectures():
    """Return all saved architectures from Supabase."""
    try:
        from app.database import get_supabase_client

        supabase = get_supabase_client()
        result = (
            supabase.table("architectures")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch architectures: {str(e)}")


@router.get("/reports/{report_id}")
def get_report(report_id: str):
    """Return a single risk report by its ID."""
    try:
        from app.database import get_supabase_client

        supabase = get_supabase_client()
        result = (
            supabase.table("risk_reports")
            .select("*")
            .eq("id", report_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return result.data[0]
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch report: {str(e)}")


@router.get("/reports")
def list_reports():
    """Return all risk reports from Supabase."""
    try:
        from app.database import get_supabase_client

        supabase = get_supabase_client()
        result = (
            supabase.table("risk_reports")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return result.data
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")


@router.post("/mitigate", response_model=MitigationReport)
def mitigate(payload: ArchitectureInput):
    """
    Analyze architecture and return a full mitigation report.
    Chains: architecture → rule engine → mitigation engine.
    """
    try:
        report = analyze_architecture(payload)
        mitigation = generate_mitigation(report.risks)
        return mitigation
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {str(e)}")


@router.post("/mitigate/from-risks", response_model=MitigationReport)
def mitigate_from_risks(risks: List[Risk]):
    """
    Generate mitigation report from a pre-computed list of risks.
    Useful when the client already has analysis results.
    """
    try:
        mitigation = generate_mitigation(risks)
        return mitigation
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Mitigation failed: {str(e)}")
