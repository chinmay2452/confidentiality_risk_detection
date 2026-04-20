"""
Input Activity/Data Module Routes

Provides:
- Draft sessions (temporary, in-memory)
- Draft validation
- Draft -> analyzer model generation
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ArchitectureDraft,
    ArchitectureModelResult,
    DraftValidationResult,
    draft_to_analysis_input,
    validate_draft,
)
from app.services.input_store import store
from app.utils.diagram_export import draft_to_flowchart_nodes_edges

router = APIRouter()


@router.post("/input/sessions")
def create_session() -> dict:
    s = store.create()
    return {
        "session_id": s.id,
        "created_at": s.created_at.isoformat(),
        "updated_at": s.updated_at.isoformat(),
        "draft": s.draft.model_dump(),
    }


@router.get("/input/sessions/{session_id}")
def get_session(session_id: str) -> dict:
    s = store.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return {
        "session_id": s.id,
        "created_at": s.created_at.isoformat(),
        "updated_at": s.updated_at.isoformat(),
        "draft": s.draft.model_dump(),
    }


@router.put("/input/sessions/{session_id}")
def update_session(session_id: str, draft: ArchitectureDraft) -> dict:
    s = store.upsert(session_id, draft)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return {
        "session_id": s.id,
        "created_at": s.created_at.isoformat(),
        "updated_at": s.updated_at.isoformat(),
        "draft": s.draft.model_dump(),
    }


@router.post("/input/validate", response_model=DraftValidationResult)
def validate(draft: ArchitectureDraft):
    return validate_draft(draft)


@router.post("/input/model", response_model=ArchitectureModelResult)
def generate_model(draft: ArchitectureDraft):
    res = validate_draft(draft)
    if not res.ok or not res.normalized:
        raise HTTPException(status_code=422, detail={"errors": res.errors, "warnings": res.warnings})

    normalized = res.normalized
    analysis_input = draft_to_analysis_input(normalized)
    return ArchitectureModelResult(draft=normalized, analysis_input=analysis_input)


@router.post("/input/diagram")
def generate_diagram_payload(draft: ArchitectureDraft) -> dict:
    """
    Helper endpoint for diagram/activity-flow updates.
    Returns a generic nodes/edges payload from the draft.
    """
    res = validate_draft(draft)
    if not res.ok or not res.normalized:
        raise HTTPException(status_code=422, detail={"errors": res.errors, "warnings": res.warnings})
    return draft_to_flowchart_nodes_edges(res.normalized)

