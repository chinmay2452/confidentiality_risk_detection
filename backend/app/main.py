"""
Architecture Confidentiality Risk Detector — Backend

FastAPI application entry point.
"""

# ── Patch sys.path FIRST so ml_engine sub-imports (predictor, etc.) resolve ──
import sys
import os

_ml_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_engine")
if _ml_path not in sys.path:
    sys.path.insert(0, _ml_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.analysis import router as analysis_router
from app.routes.input import router as input_router

app = FastAPI(
    title="Architecture Confidentiality Risk Detector",
    description=(
        "Analyze software architecture designs for confidentiality risks "
        "using a deterministic rule-based security engine."
    ),
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(analysis_router, prefix="/api")
app.include_router(input_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Architecture Confidentiality Risk Detector API",
        "docs": "/docs",
    }

try:
    from hybrid_engine import evaluate_hybrid_risk
    _HYBRID_AVAILABLE = True
except Exception as _hybrid_err:
    evaluate_hybrid_risk = None
    _HYBRID_AVAILABLE = False
    print(f"[WARNING] ML hybrid engine failed to load: {_hybrid_err}")


@app.post("/api/hybrid-test")
def run_hybrid_test(rule: dict):
    if not _HYBRID_AVAILABLE:
        return {"error": "ML engine not available. Please train models first."}
    try:
        result = evaluate_hybrid_risk(rule)
        return result
    except Exception as e:
        return {"error": str(e)}
