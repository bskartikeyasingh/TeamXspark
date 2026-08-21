from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.incidents import router as incidents_router
from backend.app.routes.emergency import router as emergency_router


# ============================================================
# AegisCampus AI
# FastAPI Application
# ============================================================

app = FastAPI(
    title="AegisCampus AI",
    description=(
        "AI Multi-Agent Campus Emergency "
        "Response and Resource Coordination System"
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=[
        "*",
    ],

    allow_headers=[
        "*",
    ],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(
    incidents_router
)

app.include_router(
    emergency_router
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "name": "AegisCampus AI",
        "status": "online",
        "version": "1.0.0",
        "message": (
            "AI Multi-Agent Campus Emergency "
            "Response System"
        ),
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "AegisCampus AI",
    }