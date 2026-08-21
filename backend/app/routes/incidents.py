from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.ai.incident_agent import incident_intelligence_agent
from app.models.incident import (
    IncidentCreate,
    IncidentResponse,
)


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"],
)


@router.post("", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate):

    try:
        analysis = incident_intelligence_agent.analyze(
            description=incident.description,
            location=incident.location,
        )

    except Exception as exc:
        print(
            "Incident Intelligence Agent error:",
            str(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Incident Intelligence Agent failed. "
                "Check the backend terminal for details."
            ),
        )

    incident_id = f"INC-{str(uuid4())[:6].upper()}"

    detected_location = (
        analysis.get("location")
        or incident.location
        or "Unknown Campus Location"
    )

    response = IncidentResponse(
        incident_id=incident_id,
        description=incident.description,
        incident_type=analysis["incident_type"],
        severity=analysis["severity"],
        location=detected_location,
        affected_people=analysis["affected_people"],
        confidence=analysis["confidence"],
        status="Pending Human Review",
        source=incident.source,
    )

    print(
        "\n"
        "============================================\n"
        "AEGISCAMPUS INCIDENT INTELLIGENCE\n"
        "============================================\n"
        f"Incident ID: {incident_id}\n"
        f"Type:       {analysis['incident_type']}\n"
        f"Severity:   {analysis['severity']}\n"
        f"Location:   {detected_location}\n"
        f"Affected:   {analysis['affected_people']}\n"
        f"Confidence: {analysis['confidence']}%\n"
        f"Summary:    {analysis['summary']}\n"
        "============================================\n"
    )

    return response


@router.get("")
async def get_incidents():

    return {
        "count": 3,
        "incidents": [
            {
                "incident_id": "INC-1042",
                "type": "Fire",
                "severity": "Critical",
                "location": "Block C — 2nd Floor",
                "affected_people": 25,
                "confidence": 94,
                "status": "Awaiting Approval",
                "reported_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            },
            {
                "incident_id": "INC-1041",
                "type": "Medical",
                "severity": "High",
                "location": "Main Cafeteria",
                "affected_people": 3,
                "confidence": 91,
                "status": "Response Active",
                "reported_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            },
            {
                "incident_id": "INC-1039",
                "type": "Security",
                "severity": "Medium",
                "location": "East Parking",
                "affected_people": 8,
                "confidence": 87,
                "status": "Monitoring",
                "reported_at": datetime.now(
                    timezone.utc
                ).isoformat(),
            },
        ],
    }