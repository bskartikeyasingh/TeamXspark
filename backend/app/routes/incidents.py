from typing import Any
from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, HTTPException

from backend.app.ai.incident_agent import (
    incident_intelligence_agent,
)

from backend.app.database.mongodb import (
    incidents_collection,
)


# ============================================================
# AegisCampus AI
# Incident Routes
# ============================================================

router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
)


# ============================================================
# CREATE INCIDENT
# ============================================================

@router.post("")
def create_incident(
    payload: dict[str, Any],
):

    description = str(
        payload.get(
            "description",
            "",
        )
    ).strip()

    location = str(
        payload.get(
            "location",
            "",
        )
    ).strip()

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

        # ====================================================
        # AI INCIDENT ANALYSIS
        # ====================================================

        result = (
            incident_intelligence_agent.analyze(
                description=description,
                location=location,
            )
        )


        # ====================================================
        # GENERATE INCIDENT ID
        # ====================================================

        incident_id = (
            "INC-"
            + datetime.now(timezone.utc).strftime(
                "%Y%m%d%H%M%S"
            )
            + "-"
            + uuid.uuid4().hex[:6].upper()
        )


        # ====================================================
        # ADD DATABASE METADATA
        # ====================================================

        incident_document = {
            "incident_id": incident_id,

            "description": description,

            "location": location,

            "incident_type": result.get(
                "incident_type"
            ),

            "severity": result.get(
                "severity"
            ),

            "affected_people": result.get(
                "affected_people",
                0,
            ),

            "confidence": result.get(
                "confidence",
                0,
            ),

            "summary": result.get(
                "summary",
                "",
            ),

            "status": "ACTIVE",

            "created_at": datetime.now(
                timezone.utc
            ),

            "source": "Emergency Command API",
        }


        # ====================================================
        # SAVE TO MONGODB
        # ====================================================

        incidents_collection.insert_one(
            incident_document
        )


        # ====================================================
        # RETURN EXISTING RESPONSE FORMAT
        # ====================================================

        return {
            "success": True,

            "incident": {
                **result,

                "incident_id": incident_id,

                "status": "ACTIVE",

            },
        }


    except Exception as exc:

        print(
            "Incident Intelligence Agent / MongoDB error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
# ============================================================
# GET INCIDENT HISTORY
# ============================================================

@router.get("")
def get_incidents():

    try:

        incidents = list(
            incidents_collection.find(
                {},
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

        print(
            "Incident history error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc