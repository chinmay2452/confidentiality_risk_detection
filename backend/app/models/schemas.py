from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ─── Input Models ───────────────────────────────────────────

class Component(BaseModel):
    """A single component in the architecture."""
    name: str
    type: str  # frontend, backend, database, api, third-party
    stores_sensitive_data: bool = False
    has_authentication: bool = True


class Connection(BaseModel):
    """A data-flow connection between two components."""
    source: str
    target: str
    encrypted: bool = False
    has_authentication: bool = True


class ArchitectureInput(BaseModel):
    """Full architecture definition submitted for analysis."""
    components: List[Component]
    connections: List[Connection]


class ArchitectureCreate(BaseModel):
    """Payload for storing an architecture in the database."""
    name: str
    architecture: ArchitectureInput


# ─── Output Models ──────────────────────────────────────────

class Risk(BaseModel):
    """A single detected confidentiality risk."""
    rule: str
    description: str
    severity: str  # HIGH, MEDIUM, LOW
    affected_components: List[str]
    recommendation: str


class RiskReport(BaseModel):
    """Complete risk report returned after analysis."""
    architecture_name: Optional[str] = None
    total_risks: int
    high_risks: int
    medium_risks: int
    low_risks: int
    risks: List[Risk]
    analyzed_at: Optional[str] = None


class ArchitectureRecord(BaseModel):
    """An architecture record returned from the database."""
    id: str
    name: str
    architecture_json: dict
    created_at: str


class ReportRecord(BaseModel):
    """A risk report record returned from the database."""
    id: str
    architecture_id: str
    risks_json: dict
    created_at: str
