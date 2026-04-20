"""
Rule-Based Confidentiality Risk Engine

A deterministic engine that evaluates software architecture designs
against predefined confidentiality rules. Each rule is a pure function
that receives parsed architecture data and returns detected risks.

To add a new rule:
  1. Create a function with signature:  def rule_name(components, connections, comp_map, roles) -> List[Risk]
  2. Append it to the RULES list at the bottom of this file.
"""

from typing import List, Dict, Callable, Optional
from app.models.schemas import Component, Connection, Risk, Role


# ─── Type alias for rule functions ──────────────────────────
RuleFunc = Callable[
    [List[Component], List[Connection], Dict[str, Component], List[Role]],
    List[Risk],
]


# ─────────────────────────────────────────────────────────────
# Rule 1 — Sensitive data over unencrypted connection → HIGH
# ─────────────────────────────────────────────────────────────
def rule_unencrypted_sensitive_data(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
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
    roles: List[Role]
) -> List[Risk]:
    """Flag HIGH risk when a frontend/api directly connects to a database."""
    risks: List[Risk] = []
    public_types = {"frontend"}
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
    roles: List[Role]
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
    roles: List[Role]
) -> List[Risk]:
    """Flag MEDIUM risk when a third-party service handles sensitive data."""
    risks: List[Risk] = []
    for conn in connections:
        src = comp_map.get(conn.source)
        tgt = comp_map.get(conn.target)
        if src and tgt:
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
    roles: List[Role]
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
    roles: List[Role]
) -> List[Risk]:
    """Flag LOW risk when data traverses 3+ hops without security validation."""
    risks: List[Risk] = []

    adjacency: Dict[str, List[str]] = {}
    for conn in connections:
        adjacency.setdefault(conn.source, []).append(conn.target)

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
                continue
            for neighbor in adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

    return risks


# ─────────────────────────────────────────────────────────────
# Rule 7 — Missing authentication for sensitive data → HIGH
# ─────────────────────────────────────────────────────────────
def rule_missing_authentication_sensitive_data(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for comp in components:
        if comp.stores_sensitive_data and not comp.has_authentication:
            risks.append(
                Risk(
                    rule="Missing Authentication for Sensitive Data",
                    description=f"Component '{comp.name}' stores sensitive data but lacks authentication.",
                    severity="HIGH",
                    affected_components=[comp.name],
                    recommendation="Implement robust authentication to protect sensitive data."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 8 — Unauthorized role-based access → HIGH
# ─────────────────────────────────────────────────────────────
def rule_unauthorized_role_access(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    """Extremely simplified placeholder for rule based on roles - usually flags roles missing from definitions."""
    risks: List[Risk] = []
    # If the system holds sensitive data and there are connections to those databases
    # but the roles array is completely empty, it implies unmanaged role access!
    has_sensitive = any(c.stores_sensitive_data for c in components)
    if has_sensitive and len(roles) == 0:
        risks.append(
            Risk(
                rule="Unauthorized Role-Based Access",
                description="The architecture lacks role definitions, making it impossible to restrict access.",
                severity="HIGH",
                affected_components=[c.name for c in components if c.stores_sensitive_data],
                recommendation="Define user and system roles, and apply RBAC policies to all sensitive flows."
            )
        )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 9 — Sensitive data flowing through untrusted components → HIGH
# ─────────────────────────────────────────────────────────────
def rule_untrusted_components(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for conn in connections:
        src = comp_map.get(conn.source)
        tgt = comp_map.get(conn.target)
        if not src or not tgt: continue
        
        flow_is_sensitive = src.stores_sensitive_data or tgt.stores_sensitive_data
        if flow_is_sensitive and (src.is_untrusted or tgt.is_untrusted):
            risks.append(
                Risk(
                    rule="Sensitive Data Flowing Through Untrusted Component",
                    description=f"Sensitive data involves an untrusted component (Source: '{conn.source}', Target: '{conn.target}').",
                    severity="HIGH",
                    affected_components=[conn.source, conn.target],
                    recommendation="Reroute sensitive data away from untrusted components or heavily sandbox the component."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 10 — Hardcoded credentials in code → CRITICAL / HIGH
# ─────────────────────────────────────────────────────────────
def rule_hardcoded_credentials(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for comp in components:
        if comp.has_hardcoded_credentials:
            risks.append(
                Risk(
                    rule="Hardcoded Credentials",
                    description=f"Component '{comp.name}' contains hardcoded credentials.",
                    severity="HIGH",
                    affected_components=[comp.name],
                    recommendation="Use external environment variables or a secure secret manager."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 11 — Logging of sensitive data → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_logging_sensitive_data(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for comp in components:
        if comp.logs_sensitive_data:
            risks.append(
                Risk(
                    rule="Logging of Sensitive Data",
                    description=f"Component '{comp.name}' logs sensitive data, potentially violating compliance.",
                    severity="MEDIUM",
                    affected_components=[comp.name],
                    recommendation="Scrub or mask all sensitive data before passing it to logging systems."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 12 — Overprivileged roles → HIGH
# ─────────────────────────────────────────────────────────────
def rule_overprivileged_roles(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for role in roles:
        if "*" in role.privileges or "admin" in [p.lower() for p in role.privileges]:
             risks.append(
                Risk(
                    rule="Overprivileged Roles",
                    description=f"Role '{role.name}' possesses overly broad ('*') or excessive administrative privileges.",
                    severity="HIGH",
                    affected_components=[],
                    recommendation="Implement Principle of Least Privilege (PoLP) and scope down role permissions."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 13 — Missing backend or secure gateway layer → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_missing_gateway_layer(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for comp in components:
        # If API is completely publicly exposed but not sitting behind a gateway
        # To simplify, we flag 'api' components that connect directly to DB but have no frontend
        # Because we need a way to assert "missing gateway".
        pass
    
    # We will flag if an architecture has BOTH backend and frontend but NO api/gateway
    types_present = {c.type for c in components}
    if "frontend" in types_present and "database" in types_present and "api" not in types_present and "backend" not in types_present:
        db_comps = [c.name for c in components if c.type == "database"]
        risks.append(
            Risk(
                rule="Missing Secure Gateway Layer",
                description="Architecture lacks an API or Backend gateway between frontend and data stores. (May duplicate Direct DB rule but targets layer presence).",
                severity="HIGH",
                affected_components=db_comps,
                recommendation="Deploy an API Gateway or Backend service to intermediate and secure traffic."
            )
        )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 14 — Multiple copies of sensitive data → LOW
# ─────────────────────────────────────────────────────────────
def rule_multiple_copies_sensitive_data(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    sensitive_stores = [c.name for c in components if c.stores_sensitive_data and c.type == "database"]
    if len(sensitive_stores) > 1:
        risks.append(
            Risk(
                rule="Multiple Copies of Sensitive Data",
                description=f"Sensitive data is stored across multiple databases: {', '.join(sensitive_stores)}.",
                severity="LOW",
                affected_components=sensitive_stores,
                recommendation="Consolidate sensitive data stores to reduce attack surface, or strictly mirror configurations."
            )
        )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 15 — Session token exposure → HIGH
# ─────────────────────────────────────────────────────────────
def rule_session_token_exposure(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for comp in components:
        if comp.exposes_session_tokens:
            risks.append(
                Risk(
                    rule="Session Token Exposure",
                    description=f"Component '{comp.name}' insecurely exposes session tokens (e.g. in URL or public storage).",
                    severity="HIGH",
                    affected_components=[comp.name],
                    recommendation="Store tokens in HTTPOnly secure cookies or private server state."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 16 — API requests without authorization headers → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_missing_auth_headers(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    for conn in connections:
        tgt = comp_map.get(conn.target)
        if tgt and tgt.type == "api" and conn.missing_authorization_headers:
            risks.append(
                Risk(
                    rule="API Requests Without Authorization Headers",
                    description=f"Connection to API '{conn.target}' from '{conn.source}' is missing authorization headers.",
                    severity="MEDIUM",
                    affected_components=[conn.source, conn.target],
                    recommendation="Always attach Authorization headers (e.g., Bearer tokens) to protected APIs."
                )
            )
    return risks


# ─────────────────────────────────────────────────────────────
# Rule 17 — Weak access control hierarchy → MEDIUM
# ─────────────────────────────────────────────────────────────
def rule_weak_access_control_hierarchy(
    components: List[Component],
    connections: List[Connection],
    comp_map: Dict[str, Component],
    roles: List[Role]
) -> List[Risk]:
    risks: List[Risk] = []
    # If all roles have identical privileges, the hierarchy is flat
    if len(roles) > 1:
        privs = [tuple(sorted(r.privileges)) for r in roles]
        if len(set(privs)) == 1:
            risks.append(
                Risk(
                    rule="Weak Access Control Hierarchy",
                    description="Multiple distinct roles share the exact same permissions, indicating a flat or broken hierarchy.",
                    severity="LOW",
                    affected_components=[],
                    recommendation="Delineate roles clearly with differing levels of authorization."
                )
            )
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
    rule_missing_authentication_sensitive_data,
    rule_unauthorized_role_access,
    rule_untrusted_components,
    rule_hardcoded_credentials,
    rule_logging_sensitive_data,
    rule_overprivileged_roles,
    rule_missing_gateway_layer,
    rule_multiple_copies_sensitive_data,
    rule_session_token_exposure,
    rule_missing_auth_headers,
    rule_weak_access_control_hierarchy,
]


def evaluate_architecture(
    components: List[Component],
    connections: List[Connection],
    roles: Optional[List[Role]] = None
) -> List[Risk]:
    """Run all registered rules against the architecture and return risks."""
    if roles is None:
        roles = []
    comp_map = {c.name: c for c in components}
    all_risks: List[Risk] = []
    for rule_fn in RULES:
        all_risks.extend(rule_fn(components, connections, comp_map, roles))
    return all_risks
