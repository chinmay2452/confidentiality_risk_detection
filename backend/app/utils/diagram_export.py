from __future__ import annotations

from typing import Dict, List

from app.models.schemas import ArchitectureDraft


def draft_to_flowchart_nodes_edges(draft: ArchitectureDraft) -> Dict[str, List[dict]]:
    """
    Minimal helper for downstream diagramming (flowchart/activity diagram updates).
    Returns a generic nodes/edges structure that can be consumed by Mermaid,
    React Flow, etc., without locking you into a specific tool.
    """
    nodes = [
        {
            "id": c.name,
            "label": c.name,
            "type": c.type,
            "stores_sensitive_data": c.stores_sensitive_data,
        }
        for c in draft.components
        if c.name
    ]

    edges = [
        {
            "id": f"{f.source}__{f.target}__{i}",
            "source": f.source,
            "target": f.target,
            "sensitivity": f.sensitivity,
            "encrypted": f.encrypted,
            "auth_required": f.auth_required,
            "data_types": f.data_types,
            "initiated_by_roles": f.initiated_by_roles,
        }
        for i, f in enumerate(draft.data_flows)
        if f.source and f.target
    ]

    return {"nodes": nodes, "edges": edges}

