from pydantic import BaseModel, Field
from typing import List, Literal, Optional
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


# ─── Draft/Input Activity Models (richer user input) ─────────

SensitivityLevel = Literal["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]


class Role(BaseModel):
    """A human or system actor interacting with the architecture."""
    name: str
    description: Optional[str] = None
    privileges: List[str] = Field(default_factory=list)


class DataFlow(BaseModel):
    """A richer data flow than Connection, suitable for user input workflows."""
    source: str
    target: str
    data_types: List[str] = Field(default_factory=list)
    sensitivity: SensitivityLevel = "INTERNAL"
    encrypted: bool = False
    auth_required: bool = True
    initiated_by_roles: List[str] = Field(default_factory=list)


class ArchitectureDraft(BaseModel):
    """
    Draft architecture captured from the user-input workflow.
    This is validated + converted into ArchitectureInput for analysis.
    """
    components: List[Component] = Field(default_factory=list)
    data_flows: List[DataFlow] = Field(default_factory=list)
    roles: List[Role] = Field(default_factory=list)


class DraftValidationResult(BaseModel):
    ok: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    normalized: Optional[ArchitectureDraft] = None


class ArchitectureModelResult(BaseModel):
    """
    Output of draft->model conversion.
    - `analysis_input` is compatible with existing /api/analyze.
    - `draft` is the normalized draft we stored/validated.
    """
    draft: ArchitectureDraft
    analysis_input: ArchitectureInput


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


# ─── Draft validation + conversion helpers ───────────────────

def _dedupe_keep_order(items: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for it in items:
        if it in seen:
            continue
        seen.add(it)
        out.append(it)
    return out


def validate_draft(draft: ArchitectureDraft) -> DraftValidationResult:
    errors: List[str] = []
    warnings: List[str] = []

    # Normalize: trim names and drop blank rows.
    components = [
        Component(
            name=c.name.strip(),
            type=c.type,
            stores_sensitive_data=bool(c.stores_sensitive_data),
            has_authentication=bool(c.has_authentication),
        )
        for c in draft.components
        if (c.name or "").strip()
    ]
    data_flows = [
        DataFlow(
            source=f.source.strip(),
            target=f.target.strip(),
            data_types=[t.strip() for t in (f.data_types or []) if t.strip()],
            sensitivity=f.sensitivity,
            encrypted=bool(f.encrypted),
            auth_required=bool(f.auth_required),
            initiated_by_roles=[r.strip() for r in (f.initiated_by_roles or []) if r.strip()],
        )
        for f in draft.data_flows
        if (f.source or "").strip() and (f.target or "").strip()
    ]
    roles = [
        Role(
            name=r.name.strip(),
            description=(r.description.strip() if r.description else None),
            privileges=[p.strip() for p in (r.privileges or []) if p.strip()],
        )
        for r in draft.roles
        if (r.name or "").strip()
    ]

    component_names = [c.name for c in components]
    role_names = [r.name for r in roles]

    if len(components) == 0:
        errors.append("Missing components: add at least one component with a name.")

    if len(set(component_names)) != len(component_names):
        errors.append("Duplicate component names found. Component names must be unique.")

    if len(set(role_names)) != len(role_names):
        errors.append("Duplicate role names found. Role names must be unique.")

    component_name_set = set(component_names)
    role_name_set = set(role_names)

    for i, f in enumerate(data_flows):
        if f.source not in component_name_set:
            errors.append(f"Data flow #{i+1} references unknown source component '{f.source}'.")
        if f.target not in component_name_set:
            errors.append(f"Data flow #{i+1} references unknown target component '{f.target}'.")
        unknown_roles = [r for r in f.initiated_by_roles if r not in role_name_set]
        for r in unknown_roles:
            errors.append(f"Data flow #{i+1} references unknown role '{r}'.")
        if f.source == f.target:
            warnings.append(f"Data flow #{i+1} has same source and target ('{f.source}').")

    # Mild guidance warnings
    if len(roles) == 0:
        warnings.append("No roles provided. Add roles if you want actor-based validation and reporting.")

    normalized = ArchitectureDraft(
        components=components,
        data_flows=data_flows,
        roles=roles,
    )

    # Normalize initiated_by_roles and privileges: de-dupe, keep order.
    normalized.roles = [
        Role(name=r.name, description=r.description, privileges=_dedupe_keep_order(r.privileges))
        for r in normalized.roles
    ]
    normalized.data_flows = [
        DataFlow(
            **f.model_dump(exclude={"initiated_by_roles"}),
            initiated_by_roles=_dedupe_keep_order(f.initiated_by_roles),
        )
        for f in normalized.data_flows
    ]

    return DraftValidationResult(ok=len(errors) == 0, errors=errors, warnings=warnings, normalized=normalized)


def draft_to_analysis_input(draft: ArchitectureDraft) -> ArchitectureInput:
    """
    Convert a validated/normalized draft into the existing analyzer input shape.
    Keeps existing analysis stable by mapping data_flows -> connections.
    """
    connections = [
        Connection(
            source=f.source,
            target=f.target,
            encrypted=f.encrypted,
            has_authentication=f.auth_required,
        )
        for f in draft.data_flows
    ]
    return ArchitectureInput(components=draft.components, connections=connections)
