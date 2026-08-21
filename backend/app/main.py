from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.incidents import router as incidents_router


app = FastAPI(
    title="AegisCampus AI",
    description="AI Multi-Agent Campus Emergency Response & Resource Coordination System",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "AegisCampus AI",
        "status": "online",
        "message": "Emergency coordination backend is running.",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "aegiscampus-backend",
    }


app.include_router(incidents_router)