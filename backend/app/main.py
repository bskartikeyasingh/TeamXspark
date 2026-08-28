import os
import sys
from pathlib import Path

# Add project root and backend to sys.path for versatile execution environments
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

for path in [str(PROJECT_ROOT), str(BACKEND_DIR), str(CURRENT_DIR)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.incidents import router as incidents_router
from backend.app.routes.emergency import router as emergency_router
from backend.app.routes.resources import router as resources_router
from backend.app.routes.audit import router as audit_router
from backend.app.routes.admin import router as admin_router
from backend.app.routes.auth import router as auth_router
from backend.app.database.mongodb import resources_collection, init_db_indexes
from backend.app.database.seed_resources import seed
from backend.app.services.admin_service import admin_service


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

cors_env = os.getenv("CORS_ORIGINS", "")
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

if cors_env:
    custom_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    allowed_origins = list(set(default_origins + custom_origins))
else:
    allowed_origins = default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.vercel\.app|.*\.netlify\.app)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# STARTUP LIFECYCLE (AUTO-SEED ON FIRST CLOUD RUN)
# ============================================================

@app.on_event("startup")
def on_startup():
    try:
        init_db_indexes()
        admin_service._ensure_default_admin()
        # If resources collection is empty in new cloud database, auto-seed
        if resources_collection.count_documents({}) == 0:
            print("[AegisCampus-AI] Empty database detected. Seeding campus resources...")
            seed()
            print("[AegisCampus-AI] Campus resources seeded successfully.")
    except Exception as exc:
        print(f"[AegisCampus-AI] Startup initialization notice: {exc}")


# ============================================================
# ROUTES
# ============================================================

app.include_router(incidents_router)
app.include_router(emergency_router)
app.include_router(resources_router)
app.include_router(audit_router)
app.include_router(admin_router)
app.include_router(auth_router)


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