from typing import List, Tuple
from app.models.schemas import Component, Connection, Role, ArchitectureInput, Risk
from app.services.rule_engine import evaluate_architecture
from app.services.evaluation import evaluate_predictions, print_metrics, EvaluationMetrics

class TestCase:
    def __init__(self, name: str, components: List[Component], connections: List[Connection], roles: List[Role], expected_risks: List[Risk]):
        self.name = name
        self.components = components
        self.connections = connections
        self.roles = roles
        self.expected_risks = expected_risks

def build_test_dataset() -> List[TestCase]:
    cases = []
    
    # Base Role
    admin_role = Role(name="Admin", privileges=["*"])
    user_role = Role(name="User", privileges=["read"])
    
    # ─── CASE 1: Perfect secure system ───
    cases.append(TestCase(
        name="Case 1: Secure System",
        components=[
            Component(name="Frontend", type="frontend", stores_sensitive_data=False, has_authentication=True),
            Component(name="API Gateway", type="api", stores_sensitive_data=False, has_authentication=True),
            Component(name="BackendDb", type="database", stores_sensitive_data=True, has_authentication=True)
        ],
        connections=[
            Connection(source="Frontend", target="API Gateway", encrypted=True, has_authentication=True),
            Connection(source="API Gateway", target="BackendDb", encrypted=True, has_authentication=True)
        ],
        roles=[user_role],
        expected_risks=[]  # No risks expected
    ))

    # ─── CASE 2: Unencrypted connection + Missing Auth Headers (API) ───
    cases.append(TestCase(
        name="Case 2: Unencrypted internal API without auth headers",
        components=[
            Component(name="Frontend", type="frontend"),
            Component(name="API", type="api", stores_sensitive_data=True, has_authentication=False)
        ],
        connections=[
            Connection(source="Frontend", target="API", encrypted=False, missing_authorization_headers=True, has_authentication=False)
        ],
        roles=[user_role],
        expected_risks=[
            Risk(rule="Unencrypted Sensitive Data Transfer", description="", severity="HIGH", affected_components=["Frontend", "API"], recommendation=""),
            Risk(rule="API Requests Without Authorization Headers", description="", severity="MEDIUM", affected_components=["Frontend", "API"], recommendation=""),
            Risk(rule="Missing Authentication for Sensitive Data", description="", severity="HIGH", affected_components=["API"], recommendation="")
        ]
    ))

    # ─── CASE 3: Direct DB Access + Sensitive Data in Frontend ───
    cases.append(TestCase(
        name="Case 3: Frontend stores sensitive data and accesses DB directly",
        components=[
            Component(name="FrontendApp", type="frontend", stores_sensitive_data=True),
            Component(name="DB", type="database", stores_sensitive_data=True)
        ],
        connections=[
            Connection(source="FrontendApp", target="DB", encrypted=True, has_authentication=True)
        ],
        roles=[user_role],
        expected_risks=[
            Risk(rule="Sensitive Data Stored in Frontend", description="", severity="HIGH", affected_components=["FrontendApp"], recommendation=""),
            Risk(rule="Direct Database Access from Public Component", description="", severity="HIGH", affected_components=["FrontendApp", "DB"], recommendation=""),
            Risk(rule="Missing Secure Gateway Layer", description="", severity="HIGH", affected_components=["DB"], recommendation="")
        ]
    ))

    # ─── CASE 4: Untrusted component + Logging sensitive data ───
    cases.append(TestCase(
        name="Case 4: Untrusted logging component storing sensitive data",
        components=[
            Component(name="Backend", type="backend", stores_sensitive_data=True),
            Component(name="Logger", type="third-party", is_untrusted=True, logs_sensitive_data=True, stores_sensitive_data=True)
        ],
        connections=[
            Connection(source="Backend", target="Logger", encrypted=True, has_authentication=True)
        ],
        roles=[user_role],
        expected_risks=[
            Risk(rule="Sensitive Data Flowing Through Untrusted Component", description="", severity="HIGH", affected_components=["Backend", "Logger"], recommendation=""),
            Risk(rule="Logging of Sensitive Data", description="", severity="MEDIUM", affected_components=["Logger"], recommendation=""),
            Risk(rule="Third-Party Access to Sensitive Data", description="", severity="MEDIUM", affected_components=["Backend", "Logger"], recommendation="")
        ]
    ))

    # ─── CASE 5: Overprivileged Roles & Unauthorized Access (No roles defined) ───
    cases.append(TestCase(
        name="Case 5: Overprivileged Role + Hardcoded Credentials",
        components=[
            Component(name="AuthService", type="backend", has_hardcoded_credentials=True, stores_sensitive_data=True)
        ],
        connections=[],
        roles=[admin_role],  # Admin has "*"
        expected_risks=[
            Risk(rule="Overprivileged Roles", description="", severity="HIGH", affected_components=[], recommendation=""),
            Risk(rule="Hardcoded Credentials", description="", severity="HIGH", affected_components=["AuthService"], recommendation="")
        ]
    ))

    # ─── CASE 6: Weak Access Control Hierarchy + Session Token Exposure ───
    cases.append(TestCase(
        name="Case 6: Flat hierarchy + Exposed tokens",
        components=[
            Component(name="EdgeService", type="api", exposes_session_tokens=True)
        ],
        connections=[],
        roles=[Role(name="RoleA", privileges=["read", "write"]), Role(name="RoleB", privileges=["write", "read"])],
        expected_risks=[
            Risk(rule="Session Token Exposure", description="", severity="HIGH", affected_components=["EdgeService"], recommendation=""),
            Risk(rule="Weak Access Control Hierarchy", description="", severity="LOW", affected_components=[], recommendation="")
        ]
    ))

    # ─── CASE 7: Missing Roles completely ───
    cases.append(TestCase(
        name="Case 7: Empty roles for sensitive architecture",
        components=[
            Component(name="SecretStore", type="database", stores_sensitive_data=True)
        ],
        connections=[],
        roles=[],
        expected_risks=[
            Risk(rule="Unauthorized Role-Based Access", description="", severity="HIGH", affected_components=["SecretStore"], recommendation="")
        ]
    ))

    # ─── CASE 8: Multiple Copies of Sensitive Data + Multiple Hops ───
    cases.append(TestCase(
        name="Case 8: Hops and Copies",
        components=[
            Component(name="A", type="backend", stores_sensitive_data=False),
            Component(name="B", type="backend", stores_sensitive_data=False),
            Component(name="C", type="backend", stores_sensitive_data=False),
            Component(name="DB1", type="database", stores_sensitive_data=True),
            Component(name="DB2", type="database", stores_sensitive_data=True),
        ],
        connections=[
            Connection(source="A", target="B", encrypted=True, has_authentication=True),
            Connection(source="B", target="C", encrypted=True, has_authentication=True),
            Connection(source="C", target="DB1", encrypted=True, has_authentication=True),
            Connection(source="DB1", target="DB2", encrypted=True, has_authentication=True),
        ],
        roles=[user_role],
        expected_risks=[
            Risk(rule="Multiple Data Hops Without Security Validation", description="", severity="LOW", affected_components=["A", "B", "C", "DB1"], recommendation=""),
            Risk(rule="Multiple Data Hops Without Security Validation", description="", severity="LOW", affected_components=["B", "C", "DB1", "DB2"], recommendation=""),
            Risk(rule="Multiple Copies of Sensitive Data", description="", severity="LOW", affected_components=["DB1", "DB2"], recommendation="")
        ]
    ))
    
    return cases

def run_tests():
    dataset = build_test_dataset()
    print(f"Running evaluation on {len(dataset)} cases...\n")
    
    overall_tp = 0
    overall_fp = 0
    overall_fn = 0
    
    for case in dataset:
        predicted = evaluate_architecture(case.components, case.connections, case.roles)
        metrics = evaluate_predictions(case.expected_risks, predicted)
        
        # print_metrics(metrics, case.name)
        overall_tp += metrics.tp
        overall_fp += metrics.fp
        overall_fn += metrics.fn
        
    overall_metrics = EvaluationMetrics(tp=overall_tp, fp=overall_fp, fn=overall_fn)
    print_metrics(overall_metrics, "AGGREGATE DATASET SCORE")

if __name__ == "__main__":
    run_tests()
