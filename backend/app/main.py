"""
Architecture Confidentiality Risk Detector — Backend

FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.analysis import router as analysis_router

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


@app.get("/")
def root():
    return {
        "message": "Architecture Confidentiality Risk Detector API",
        "docs": "/docs",
    }
