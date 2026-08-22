from fastapi import APIRouter, HTTPException

from backend.app.database.mongodb import (
    audit_logs_collection,
)


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit Trail"],
)


# ============================================================
# GET ALL AUDIT EVENTS
# ============================================================

@router.get("")
def get_all_audit_events():

    try:

        events = list(
            audit_logs_collection.find(
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
            "count": len(events),
            "audit_events": events,
        }

    except Exception as exc:

        print(
            "Audit history error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET AUDIT EVENTS FOR ONE INCIDENT
# ============================================================

@router.get("/incidents/{incident_id}")
def get_incident_audit(
    incident_id: str,
):

    try:

        events = list(
            audit_logs_collection.find(
                {
                    "incident_id": incident_id,
                },
                {
                    "_id": 0,
                },
            ).sort(
                "created_at",
                1,
            )
        )

        return {
            "success": True,
            "incident_id": incident_id,
            "count": len(events),
            "audit_events": events,
        }

    except Exception as exc:

        print(
            "Incident audit history error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc