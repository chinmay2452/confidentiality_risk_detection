"""
Architecture Confidentiality Risk Detector — Backend

FastAPI application entry point.
"""

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

import sys
import os
# Add ml_engine to path so we can import it
ml_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_engine")
sys.path.append(ml_path)

try:
    from hybrid_engine import evaluate_hybrid_risk
except ImportError:
    evaluate_hybrid_risk = None

@app.post("/api/hybrid-test")
def run_hybrid_test(rule: dict):
    if evaluate_hybrid_risk is None:
        return {"error": "ML engine not available. Please train models first."}
    try:
        result = evaluate_hybrid_risk(rule)
        return result
    except Exception as e:
        return {"error": str(e)}

# Trigger reload
