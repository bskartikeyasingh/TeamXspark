from typing import Any, Optional
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, HTTPException, Query

from backend.app.ai.incident_agent import (
    incident_intelligence_agent,
)
from backend.app.database.mongodb import (
    incidents_collection,
)
from backend.app.services.audit_service import (
    audit_service,
)


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
)


# ============================================================
# CREATE INCIDENT (DIRECT REST ENDPOINT)
# ============================================================

@router.post("")
def create_incident(
    payload: dict[str, Any],
):
    description = str(payload.get("description", "")).strip()
    location = str(payload.get("location", "")).strip()
    student_id = str(payload.get("student_id", "")).strip()
    student_name = str(payload.get("student_name", "")).strip()
    student_email = str(payload.get("student_email", "")).strip()
    voice_transcript = str(payload.get("voice_transcript", "")).strip()
    image_data = payload.get("image_data", None)

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Incident description is required.",
        )

    if not location:
        raise HTTPException(
            status_code=400,
            detail="Incident location is required.",
        )

    try:
        # AI INCIDENT ANALYSIS (Single fast token-efficient pass)
        analysis = incident_intelligence_agent.analyze(
            description=description,
            location=location,
        )

        incident_id = f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        incident_document = {
            "incident_id": incident_id,
            "student_id": student_id or None,
            "student_name": student_name or "Student",
            "student_email": student_email,
            "description": description,
            "voice_transcript": voice_transcript or None,
            "image_data": image_data or None,
            "location": location,
            "incident_type": analysis.get("incident_type", "Other"),
            "severity": analysis.get("severity", "Medium"),
            "affected_people": analysis.get("affected_people", 0),
            "confidence": analysis.get("confidence", 85),
            "summary": analysis.get("summary", ""),
            "ai_analysis": analysis,
            "recommended_actions": analysis.get("recommended_actions", []),
            "deployed_resources": [],
            "alerts": [],
            "status": "PENDING",
            "created_at": now_iso,
            "updated_at": now_iso,
            "resolved_at": None,
            "source": payload.get("source", "Web Client"),
        }

        incidents_collection.insert_one(incident_document.copy())

        audit_service.record_incident_created(
            incident_id=incident_id,
            incident=incident_document,
        )

        incident_document.pop("_id", None)

        return {
            "success": True,
            "incident": incident_document,
        }

    except Exception as exc:
        print("Incident creation error:", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET INCIDENT HISTORY (WITH ROLE/STUDENT FILTERING)
# ============================================================

@router.get("")
def get_incidents(
    student_email: Optional[str] = Query(None, description="Filter incidents by student email"),
    student_id: Optional[str] = Query(None, description="Filter incidents by student ID"),
):
    try:
        query = {}
        if student_email and student_email.strip():
            query["student_email"] = student_email.strip()
        elif student_id and student_id.strip():
            query["student_id"] = student_id.strip()

        incidents = list(
            incidents_collection.find(
                query,
                {
                    "_id": 0,
                },
            ).sort(
                "created_at",
                -1,
            )
        )

        return {
            "success": True,
            "count": len(incidents),
            "incidents": incidents,
        }

    except Exception as exc:
        print("Incident history error:", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET SINGLE INCIDENT DETAILS
# ============================================================

@router.get("/{incident_id}")
def get_incident(incident_id: str):
    incident = incidents_collection.find_one(
        {"incident_id": incident_id},
        {"_id": 0},
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    return {
        "success": True,
        "incident": incident,
    }