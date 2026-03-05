"""
Rule-Based Confidentiality Risk Engine

A deterministic engine that evaluates software architecture designs
against predefined confidentiality rules. Each rule is a pure function
that receives parsed architecture data and returns detected risks.

To add a new rule:
  1. Create a function with signature:  def rule_name(components, connections, comp_map) -> List[Risk]
  2. Append it to the RULES list at the bottom of this file.
"""

from typing import List, Dict, Callable
from app.models.schemas import Component, Connection, Risk


# ─── Type alias for rule functions ──────────────────────────
RuleFunc = Callable[
    [List[Component], List[Connection], Dict[str, Component]],
    List[Risk],
]


# ─────────────────────────────────────────────────────────────
# Rule 1 — Sensitive data over unencrypted connection → HIGH
# ─────────────────────────────────────────────────────────────
def rule_unencrypted_sensitive_data(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag HIGH risk when sensitive data flows through an unencrypted connection."""
    risks: List[Risk] = []
    for conn in connections:
        src = comp_map.get(conn.source)
        tgt = comp_map.get(conn.target)
        if not conn.encrypted:
            src_sensitive = src and src.stores_sensitive_data
            tgt_sensitive = tgt and tgt.stores_sensitive_data
            if src_sensitive or tgt_sensitive:
                risks.append(
                    Risk(
                        rule="Unencrypted Sensitive Data Transfer",
                        description=(
                            f"Sensitive data flows between '{conn.source}' and "
                            f"'{conn.target}' over an unencrypted connection."
                        ),
                        severity="HIGH",
                        affected_components=[conn.source, conn.target],
                        recommendation=(
                            "Enable TLS/SSL encryption on this connection. "
                            "Use HTTPS for API calls and encrypted protocols for "
                            "database connections."
                        ),
                    )
                )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 2 — Public-facing component directly accesses DB → HIGH
# ─────────────────────────────────────────────────────────────
def rule_direct_db_access(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag HIGH risk when a frontend/api directly connects to a database."""
    risks: List[Risk] = []
    public_types = {"frontend", "api"}
    for conn in connections:
        src = comp_map.get(conn.source)
        tgt = comp_map.get(conn.target)
        if src and tgt:
            if src.type in public_types and tgt.type == "database":
                risks.append(
                    Risk(
                        rule="Direct Database Access from Public Component",
                        description=(
                            f"Public-facing component '{conn.source}' (type: {src.type}) "
                            f"directly accesses database '{conn.target}'."
                        ),
                        severity="HIGH",
                        affected_components=[conn.source, conn.target],
                        recommendation=(
                            "Introduce a backend/API layer between the public-facing "
                            "component and the database. Never expose the database "
                            "directly to client-side components."
                        ),
                    )
                )
            # Also check in the reverse direction
            if tgt.type in public_types and src.type == "database":
                risks.append(
                    Risk(
                        rule="Direct Database Access from Public Component",
                        description=(
                            f"Public-facing component '{conn.target}' (type: {tgt.type}) "
                            f"directly accesses database '{conn.source}'."
                        ),
                        severity="HIGH",
                        affected_components=[conn.target, conn.source],
                        recommendation=(
                            "Introduce a backend/API layer between the public-facing "
                            "component and the database. Never expose the database "
                            "directly to client-side components."
                        ),
                    )
                )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 3 — Sensitive data stored in frontend component → HIGH
# ─────────────────────────────────────────────────────────────
def rule_sensitive_data_in_frontend(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag HIGH risk when sensitive data is stored in a frontend component."""
    risks: List[Risk] = []
    for comp in components:
        if comp.type == "frontend" and comp.stores_sensitive_data:
            risks.append(
                Risk(
                    rule="Sensitive Data Stored in Frontend",
                    description=(
                        f"Frontend component '{comp.name}' stores sensitive data. "
                        "Client-side storage is inherently insecure."
                    ),
                    severity="HIGH",
                    affected_components=[comp.name],
                    recommendation=(
                        "Move sensitive data storage to the backend. Use secure "
                        "server-side sessions or encrypted tokens instead of "
                        "storing sensitive data on the client."
                    ),
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 4 — Third-party service accesses sensitive data → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_third_party_sensitive_access(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag MEDIUM risk when a third-party service handles sensitive data."""
    risks: List[Risk] = []
    for conn in connections:
        src = comp_map.get(conn.source)
        tgt = comp_map.get(conn.target)
        if src and tgt:
            # Third-party is source and target stores sensitive data
            if src.type == "third-party" and tgt.stores_sensitive_data:
                risks.append(
                    Risk(
                        rule="Third-Party Access to Sensitive Data",
                        description=(
                            f"Third-party service '{conn.source}' has access to "
                            f"sensitive data in '{conn.target}'."
                        ),
                        severity="MEDIUM",
                        affected_components=[conn.source, conn.target],
                        recommendation=(
                            "Minimize data shared with third-party services. "
                            "Use data masking, tokenization, or a proxy layer. "
                            "Review third-party security certifications."
                        ),
                    )
                )
            # Third-party is target and source stores sensitive data
            if tgt.type == "third-party" and src.stores_sensitive_data:
                risks.append(
                    Risk(
                        rule="Third-Party Access to Sensitive Data",
                        description=(
                            f"Sensitive data from '{conn.source}' is sent to "
                            f"third-party service '{conn.target}'."
                        ),
                        severity="MEDIUM",
                        affected_components=[conn.source, conn.target],
                        recommendation=(
                            "Minimize data shared with third-party services. "
                            "Use data masking, tokenization, or a proxy layer. "
                            "Review third-party security certifications."
                        ),
                    )
                )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 5 — Encryption without authentication → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_encryption_without_auth(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag MEDIUM risk when a connection is encrypted but lacks authentication."""
    risks: List[Risk] = []
    for conn in connections:
        if conn.encrypted and not conn.has_authentication:
            risks.append(
                Risk(
                    rule="Encryption Without Authentication",
                    description=(
                        f"Connection from '{conn.source}' to '{conn.target}' is "
                        "encrypted but has no authentication mechanism."
                    ),
                    severity="MEDIUM",
                    affected_components=[conn.source, conn.target],
                    recommendation=(
                        "Add authentication (API keys, OAuth, JWT) on top of "
                        "encryption. Encryption alone does not verify the "
                        "identity of communicating parties."
                    ),
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 6 — Multiple data hops without security validation → LOW
# ─────────────────────────────────────────────────────────────
def rule_multiple_hops(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
) -> List[Risk]:
    """Flag LOW risk when data traverses 3+ hops without security validation."""
    risks: List[Risk] = []

    # Build adjacency list
    adjacency: Dict[str, List[str]] = {}
    for conn in connections:
        adjacency.setdefault(conn.source, []).append(conn.target)

    # Find paths of length >= 3 using BFS from each component
    for start in adjacency:
        visited = set()
        queue = [(start, [start])]
        while queue:
            current, path = queue.pop(0)
            if len(path) >= 4:  # 4 nodes = 3 hops
                risks.append(
                    Risk(
                        rule="Multiple Data Hops Without Security Validation",
                        description=(
                            f"Data may traverse {len(path) - 1} hops through "
                            f"the path: {' → '.join(path)} without intermediate "
                            "security validation."
                        ),
                        severity="LOW",
                        affected_components=path,
                        recommendation=(
                            "Add security validation checkpoints at intermediate "
                            "hops. Consider input validation, re-authentication, "
                            "or integrity checks between services."
                        ),
                    )
                )
                continue  # Don't explore further from this path
            for neighbor in adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

    return risks


# ─── Rule Registry ──────────────────────────────────────────
# Add new rules by appending to this list.
RULES: List[RuleFunc] = [
    rule_unencrypted_sensitive_data,
    rule_direct_db_access,
    rule_sensitive_data_in_frontend,
    rule_third_party_sensitive_access,
    rule_encryption_without_auth,
    rule_multiple_hops,
]


def evaluate_architecture(
    components: List[Component],
    connections: List[Connection],
) -> List[Risk]:
    """Run all registered rules against the architecture and return risks."""
    comp_map = {c.name: c for c in components}
    all_risks: List[Risk] = []
    for rule_fn in RULES:
        all_risks.extend(rule_fn(components, connections, comp_map))
    return all_risks
