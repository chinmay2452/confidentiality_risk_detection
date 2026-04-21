"""
Mitigation Recommendation Engine

For every detected risk, this module provides:
  - A primary fix recommendation (already in the Risk object)
  - Additional detailed mitigation steps
  - Implementation priority & estimated effort
  - Mitigation category (encryption, access-control, architecture, etc.)

The engine is deterministic and rule-keyed: each rule name maps to a
structured MitigationAdvice object.
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from app.models.schemas import Risk


# ─── Output Models ──────────────────────────────────────────

class MitigationStep(BaseModel):
    """A single actionable mitigation step."""
    action: str
    detail: str
    tool_or_reference: Optional[str] = None


class MitigationAdvice(BaseModel):
    """Full mitigation advice for a single detected risk."""
    rule: str
    severity: str
    category: str  # encryption, access-control, architecture, data-handling, secrets, monitoring
    priority: str  # CRITICAL, HIGH, MEDIUM, LOW  (action priority, not same as severity)
    effort: str    # LOW, MEDIUM, HIGH  (implementation effort)
    primary_fix: str
    steps: List[MitigationStep] = Field(default_factory=list)
    affected_components: List[str] = Field(default_factory=list)
    description: str = ""


class MitigationReport(BaseModel):
    """Full mitigation report for all detected risks."""
    total_risks: int
    mitigations: List[MitigationAdvice]
    critical_actions: int  # number of CRITICAL priority items
    high_actions: int
    medium_actions: int
    low_actions: int
    health_score: float  # 0-100, higher is better
    health_grade: str    # A, B, C, D, F


# ─── Mitigation Knowledge Base ──────────────────────────────

MITIGATION_KB: Dict[str, dict] = {
    "Unencrypted Sensitive Data Transfer": {
        "category": "encryption",
        "priority": "CRITICAL",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Enable TLS/SSL on all data connections",
                detail="Configure TLS 1.2+ for all connections carrying sensitive data. Use certificate pinning for mobile clients.",
                tool_or_reference="Let's Encrypt / AWS ACM / Nginx TLS config"
            ),
            MitigationStep(
                action="Use HTTPS for all API endpoints",
                detail="Redirect all HTTP traffic to HTTPS. Set HSTS headers with a minimum max-age of 31536000.",
                tool_or_reference="OWASP Transport Layer Protection Cheat Sheet"
            ),
            MitigationStep(
                action="Encrypt database connections",
                detail="Enable SSL mode on database connection strings (e.g., sslmode=require for PostgreSQL).",
                tool_or_reference="PostgreSQL SSL / MySQL TLS documentation"
            ),
        ],
    },
    "Direct Database Access from Public Component": {
        "category": "architecture",
        "priority": "CRITICAL",
        "effort": "HIGH",
        "steps": [
            MitigationStep(
                action="Introduce a backend API layer",
                detail="Deploy a REST or GraphQL backend service between the frontend and database. All data queries should route through this layer.",
                tool_or_reference="FastAPI / Express.js / Spring Boot"
            ),
            MitigationStep(
                action="Implement parameterized queries",
                detail="Use ORM or parameterized SQL to prevent injection attacks at the API layer.",
                tool_or_reference="SQLAlchemy / Prisma / Hibernate"
            ),
            MitigationStep(
                action="Add rate limiting and input validation",
                detail="Apply rate limiting middleware and validate/sanitize all incoming request parameters.",
                tool_or_reference="express-rate-limit / SlowAPI"
            ),
        ],
    },
    "Sensitive Data Stored in Frontend": {
        "category": "data-handling",
        "priority": "CRITICAL",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Move sensitive data storage to backend",
                detail="Remove all sensitive data from localStorage, sessionStorage, and client-side code. Store on server and retrieve via authenticated API calls.",
                tool_or_reference="OWASP Secure Coding Practices"
            ),
            MitigationStep(
                action="Use secure HTTP-only cookies for session data",
                detail="Store session tokens in HTTP-only, Secure, SameSite cookies rather than JavaScript-accessible storage.",
                tool_or_reference="MDN HTTP Cookies documentation"
            ),
            MitigationStep(
                action="Implement Content Security Policy",
                detail="Add CSP headers to prevent XSS attacks that could exfiltrate client-side data.",
                tool_or_reference="CSP Evaluator by Google"
            ),
        ],
    },
    "Third-Party Access to Sensitive Data": {
        "category": "data-handling",
        "priority": "HIGH",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Minimize data shared with third parties",
                detail="Apply data minimization principles — share only the fields strictly required by the third-party service.",
                tool_or_reference="GDPR Article 5(1)(c) — Data Minimisation"
            ),
            MitigationStep(
                action="Use data masking or tokenization",
                detail="Replace sensitive values with tokens or masked versions before sending to external services.",
                tool_or_reference="HashiCorp Vault / AWS Macie"
            ),
            MitigationStep(
                action="Review third-party security certifications",
                detail="Require SOC 2 Type II, ISO 27001, or equivalent certification from all third-party data processors.",
                tool_or_reference="Vendor risk assessment questionnaire"
            ),
        ],
    },
    "Encryption Without Authentication": {
        "category": "access-control",
        "priority": "HIGH",
        "effort": "LOW",
        "steps": [
            MitigationStep(
                action="Add authentication mechanism",
                detail="Implement API key, OAuth 2.0, or mutual TLS authentication on all encrypted connections.",
                tool_or_reference="OAuth 2.0 / JWT / mTLS"
            ),
            MitigationStep(
                action="Implement request signing",
                detail="Use HMAC signatures or JWT tokens to verify the identity of both client and server.",
                tool_or_reference="AWS Signature v4 / HMAC-SHA256"
            ),
        ],
    },
    "Multiple Data Hops Without Security Validation": {
        "category": "architecture",
        "priority": "MEDIUM",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Add intermediate security checkpoints",
                detail="Implement re-authentication or token validation at each service boundary in the data flow.",
                tool_or_reference="Service mesh (Istio / Linkerd)"
            ),
            MitigationStep(
                action="Implement integrity checks",
                detail="Use message signing or checksums to verify data integrity between hops.",
                tool_or_reference="HMAC / Digital Signatures"
            ),
        ],
    },
    "Missing Authentication for Sensitive Data": {
        "category": "access-control",
        "priority": "CRITICAL",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Implement robust authentication",
                detail="Add multi-factor authentication (MFA) for accessing components storing sensitive data.",
                tool_or_reference="Auth0 / Firebase Auth / Keycloak"
            ),
            MitigationStep(
                action="Enforce role-based access control",
                detail="Define granular RBAC policies and enforce them at the application and database layers.",
                tool_or_reference="Casbin / AWS IAM / PostgreSQL Row-Level Security"
            ),
        ],
    },
    "Unauthorized Role-Based Access": {
        "category": "access-control",
        "priority": "HIGH",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Define user and system roles",
                detail="Create a role hierarchy (admin, editor, viewer, service-account) with clearly documented permissions.",
                tool_or_reference="NIST RBAC Model"
            ),
            MitigationStep(
                action="Apply Principle of Least Privilege",
                detail="Grant each role only the minimum permissions necessary. Audit role assignments quarterly.",
                tool_or_reference="CIS Controls v8"
            ),
        ],
    },
    "Sensitive Data Flowing Through Untrusted Component": {
        "category": "architecture",
        "priority": "CRITICAL",
        "effort": "HIGH",
        "steps": [
            MitigationStep(
                action="Reroute sensitive data flows",
                detail="Remove untrusted components from sensitive data paths. Use trusted proxies or service mesh sidecars.",
                tool_or_reference="Istio / Envoy proxy"
            ),
            MitigationStep(
                action="Sandbox untrusted components",
                detail="If the component cannot be removed, isolate it in a sandboxed network segment with strict ingress/egress rules.",
                tool_or_reference="Docker network isolation / AWS VPC"
            ),
            MitigationStep(
                action="Encrypt data end-to-end",
                detail="Apply end-to-end encryption so untrusted intermediaries cannot read the payload.",
                tool_or_reference="Signal Protocol / NaCl / libsodium"
            ),
        ],
    },
    "Hardcoded Credentials": {
        "category": "secrets",
        "priority": "CRITICAL",
        "effort": "LOW",
        "steps": [
            MitigationStep(
                action="Move credentials to environment variables",
                detail="Remove all hardcoded passwords, API keys, and tokens. Load them from environment variables or a .env file (excluded from VCS).",
                tool_or_reference="python-dotenv / direnv"
            ),
            MitigationStep(
                action="Use a secrets manager",
                detail="For production, use a dedicated secrets manager to inject credentials at runtime.",
                tool_or_reference="HashiCorp Vault / AWS Secrets Manager / GCP Secret Manager"
            ),
            MitigationStep(
                action="Scan for leaked secrets",
                detail="Add pre-commit hooks and CI checks to detect accidentally committed secrets.",
                tool_or_reference="git-secrets / truffleHog / Gitleaks"
            ),
        ],
    },
    "Logging of Sensitive Data": {
        "category": "monitoring",
        "priority": "HIGH",
        "effort": "LOW",
        "steps": [
            MitigationStep(
                action="Scrub sensitive data from logs",
                detail="Implement log sanitization filters to mask or redact PII, credentials, and tokens before writing to log output.",
                tool_or_reference="structlog filters / logback masking"
            ),
            MitigationStep(
                action="Restrict log access",
                detail="Limit who can access application logs. Use separate log storage with audit trails.",
                tool_or_reference="ELK Stack RBAC / CloudWatch Logs"
            ),
        ],
    },
    "Overprivileged Roles": {
        "category": "access-control",
        "priority": "HIGH",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Implement Principle of Least Privilege",
                detail="Review each role's permissions and remove wildcard ('*') or admin-level access. Create specific scoped permissions.",
                tool_or_reference="NIST SP 800-53 AC-6"
            ),
            MitigationStep(
                action="Conduct periodic access reviews",
                detail="Quarterly review all role assignments and privilege escalation paths.",
                tool_or_reference="Access certification tools / IAM audit"
            ),
        ],
    },
    "Missing Secure Gateway Layer": {
        "category": "architecture",
        "priority": "HIGH",
        "effort": "HIGH",
        "steps": [
            MitigationStep(
                action="Deploy an API Gateway",
                detail="Add an API Gateway or reverse proxy to intermediate all traffic between frontend and backend services.",
                tool_or_reference="Kong / AWS API Gateway / Nginx"
            ),
            MitigationStep(
                action="Add WAF protection",
                detail="Configure a Web Application Firewall in front of the gateway to filter malicious requests.",
                tool_or_reference="AWS WAF / Cloudflare WAF / ModSecurity"
            ),
        ],
    },
    "Multiple Copies of Sensitive Data": {
        "category": "data-handling",
        "priority": "MEDIUM",
        "effort": "HIGH",
        "steps": [
            MitigationStep(
                action="Consolidate data stores",
                detail="Reduce the number of databases storing sensitive data. Use a single source of truth with read replicas if needed.",
                tool_or_reference="Database federation / CQRS pattern"
            ),
            MitigationStep(
                action="Mirror security configurations",
                detail="If multiple copies are necessary, ensure identical encryption, access control, and audit configurations.",
                tool_or_reference="Terraform / Ansible for config parity"
            ),
        ],
    },
    "Session Token Exposure": {
        "category": "secrets",
        "priority": "CRITICAL",
        "effort": "LOW",
        "steps": [
            MitigationStep(
                action="Store tokens in HTTP-only secure cookies",
                detail="Never expose session tokens in URLs, localStorage, or client-side JavaScript. Use HttpOnly + Secure + SameSite cookies.",
                tool_or_reference="OWASP Session Management Cheat Sheet"
            ),
            MitigationStep(
                action="Implement token rotation",
                detail="Rotate session tokens on privilege changes and set short expiration times.",
                tool_or_reference="Refresh token rotation pattern"
            ),
        ],
    },
    "API Requests Without Authorization Headers": {
        "category": "access-control",
        "priority": "HIGH",
        "effort": "LOW",
        "steps": [
            MitigationStep(
                action="Enforce authorization headers on all endpoints",
                detail="Configure API middleware to reject requests without valid Authorization headers (Bearer token, API key).",
                tool_or_reference="FastAPI Security / Express passport.js"
            ),
            MitigationStep(
                action="Implement API key management",
                detail="Issue, track, and rotate API keys. Revoke compromised keys immediately.",
                tool_or_reference="API key management platform"
            ),
        ],
    },
    "Weak Access Control Hierarchy": {
        "category": "access-control",
        "priority": "MEDIUM",
        "effort": "MEDIUM",
        "steps": [
            MitigationStep(
                action="Differentiate role permissions",
                detail="Define distinct privilege sets for each role level. Ensure admin, editor, and viewer have clearly separated capabilities.",
                tool_or_reference="RBAC best practices"
            ),
            MitigationStep(
                action="Implement role inheritance",
                detail="Use hierarchical roles where higher roles inherit lower-level permissions plus their specific additions.",
                tool_or_reference="Casbin / Spring Security role hierarchy"
            ),
        ],
    },
}


# ─── Engine ─────────────────────────────────────────────────

def generate_mitigation(risks: List[Risk]) -> MitigationReport:
    """
    Generate a comprehensive mitigation report for all detected risks.
    Each risk is mapped to structured mitigation advice from the knowledge base.
    """
    mitigations: List[MitigationAdvice] = []

    for risk in risks:
        kb_entry = MITIGATION_KB.get(risk.rule)

        if kb_entry:
            advice = MitigationAdvice(
                rule=risk.rule,
                severity=risk.severity,
                category=kb_entry["category"],
                priority=kb_entry["priority"],
                effort=kb_entry["effort"],
                primary_fix=risk.recommendation,
                steps=kb_entry["steps"],
                affected_components=risk.affected_components,
                description=risk.description,
            )
        else:
            # Fallback for rules not in the KB
            advice = MitigationAdvice(
                rule=risk.rule,
                severity=risk.severity,
                category="general",
                priority="HIGH" if risk.severity == "HIGH" else "MEDIUM",
                effort="MEDIUM",
                primary_fix=risk.recommendation,
                steps=[
                    MitigationStep(
                        action="Review and remediate",
                        detail=f"Analyze the risk '{risk.rule}' and apply the recommended fix: {risk.recommendation}",
                        tool_or_reference="Security review process"
                    )
                ],
                affected_components=risk.affected_components,
                description=risk.description,
            )

        mitigations.append(advice)

    # Priority counts
    critical = sum(1 for m in mitigations if m.priority == "CRITICAL")
    high = sum(1 for m in mitigations if m.priority == "HIGH")
    medium = sum(1 for m in mitigations if m.priority == "MEDIUM")
    low = sum(1 for m in mitigations if m.priority == "LOW")

    # Health score: start at 100, deduct per risk by severity
    score = 100.0
    for m in mitigations:
        if m.priority == "CRITICAL":
            score -= 15
        elif m.priority == "HIGH":
            score -= 10
        elif m.priority == "MEDIUM":
            score -= 5
        else:
            score -= 2
    score = max(0.0, min(100.0, score))

    # Grade
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    elif score >= 40:
        grade = "D"
    else:
        grade = "F"

    return MitigationReport(
        total_risks=len(risks),
        mitigations=mitigations,
        critical_actions=critical,
        high_actions=high,
        medium_actions=medium,
        low_actions=low,
        health_score=round(score, 1),
        health_grade=grade,
    )
