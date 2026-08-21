from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.app.ai.incident_agent import (
    incident_intelligence_agent,
)

from backend.app.orchestrator.response_aggregator import (
    emergency_response_aggregator,
)

from backend.app.services.approval_service import (
    approval_service,
)

from backend.app.services.audit_service import (
    audit_service,
)


# ============================================================
# AegisCampus AI
# Emergency Command API
# ============================================================

router = APIRouter(
    prefix="/api/emergency",
    tags=["Emergency Command"],
)


# ============================================================
# HELPER
# ============================================================

def create_incident_id() -> str:

    timestamp = datetime.now(
        timezone.utc
    ).strftime("%Y%m%d%H%M%S")

    return f"INC-{timestamp}"


# ============================================================
# CREATE EMERGENCY RESPONSE
# ============================================================

@router.post("/respond")
def create_emergency_response(
    payload: dict[str, Any],
):

    try:

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

        # ----------------------------------------------------
        # Validate input
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Create incident ID
        # ----------------------------------------------------

        incident_id = create_incident_id()

        # ----------------------------------------------------
        # AUDIT: Incident received
        # ----------------------------------------------------

        audit_service.record_event(
            incident_id=incident_id,
            event_type="INCIDENT_RECEIVED",
            message=(
                "Emergency incident received "
                "through the Emergency Command API."
            ),
            actor="API",
            metadata={
                "location": location,
            },
        )

        # ----------------------------------------------------
        # STEP 1
        # Incident Intelligence
        # ----------------------------------------------------

        analysis = (
            incident_intelligence_agent.analyze(
                description=description,
                location=location,
            )
        )

        audit_service.record_ai_analysis(
            incident_id=incident_id,
            analysis=analysis,
        )

        # ----------------------------------------------------
        # Build incident object
        # ----------------------------------------------------

        incident = {
            **analysis,
            "incident_id": incident_id,
            "description": description,
            "location": location,
        }

        # ----------------------------------------------------
        # STEP 2
        # Multi-Agent Response
        # ----------------------------------------------------

        unified_response = (
            emergency_response_aggregator
            .create_unified_response(
                incident
            )
        )

        # ----------------------------------------------------
        # AUDIT: Agents activated
        # ----------------------------------------------------

        audit_service.record_agents_activated(
            incident_id=incident_id,
            agents=unified_response.get(
                "activated_agents",
                [],
            ),
        )

        # ----------------------------------------------------
        # AUDIT: Resources recommended
        # ----------------------------------------------------

        audit_service.record_resource_recommendation(
            incident_id=incident_id,
            resources=unified_response.get(
                "selected_resources",
                [],
            ),
        )

        # ----------------------------------------------------
        # STEP 3
        # Human approval
        # ----------------------------------------------------

        approval_request = (
            approval_service
            .create_approval_request(
                incident_id=incident_id,
                response_plan=unified_response,
                requested_by="Emergency Orchestrator",
            )
        )

        # ----------------------------------------------------
        # AUDIT: Approval requested
        # ----------------------------------------------------

        audit_service.record_approval_requested(
            incident_id=incident_id,
            approval_id=approval_request[
                "approval_id"
            ],
        )

        # ----------------------------------------------------
        # Add approval information
        # ----------------------------------------------------

        unified_response[
            "approval_request"
        ] = approval_request

        unified_response[
            "approval_status"
        ] = "PENDING"

        # ----------------------------------------------------
        # Final API response
        # ----------------------------------------------------

        return {
            "success": True,

            "incident_id": incident_id,

            "incident": incident,

            "response": unified_response,

            "approval": approval_request,

            "audit_events": (
                audit_service
                .get_incident_events(
                    incident_id
                )
            ),
        }

    except HTTPException:

        raise

    except Exception as exc:

        print(
            "Emergency response error:",
            exc,
        )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET APPROVAL
# ============================================================

@router.get(
    "/approvals/{approval_id}"
)
def get_approval(
    approval_id: str,
):

    try:

        approval = (
            approval_service
            .get_approval(
                approval_id
            )
        )

        return {
            "success": True,
            "approval": approval,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


# ============================================================
# APPROVE EMERGENCY RESPONSE
# ============================================================

@router.post(
    "/approvals/{approval_id}/approve"
)
def approve_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):

    approved_by = str(
        payload.get(
            "approved_by",
            "Campus Emergency Commander",
        )
    ).strip()

    if not approved_by:

        raise HTTPException(
            status_code=400,
            detail="approved_by is required.",
        )

    try:

        approval = (
            approval_service
            .approve(
                approval_id=approval_id,
                approved_by=approved_by,
            )
        )

        incident_id = approval[
            "incident_id"
        ]

        audit_service.record_approval(
            incident_id=incident_id,
            approval_id=approval_id,
            approved_by=approved_by,
        )

        return {
            "success": True,
            "message": (
                "Emergency response approved."
            ),
            "approval": approval,
            "audit_events": (
                audit_service
                .get_incident_events(
                    incident_id
                )
            ),
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ============================================================
# REJECT EMERGENCY RESPONSE
# ============================================================

@router.post(
    "/approvals/{approval_id}/reject"
)
def reject_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):

    rejected_by = str(
        payload.get(
            "rejected_by",
            "Campus Emergency Commander",
        )
    ).strip()

    reason = str(
        payload.get(
            "reason",
            "",
        )
    ).strip()

    if not rejected_by:

        raise HTTPException(
            status_code=400,
            detail="rejected_by is required.",
        )

    if not reason:

        raise HTTPException(
            status_code=400,
            detail="Rejection reason is required.",
        )

    try:

        approval = (
            approval_service
            .reject(
                approval_id=approval_id,
                rejected_by=rejected_by,
                reason=reason,
            )
        )

        incident_id = approval[
            "incident_id"
        ]

        audit_service.record_rejection(
            incident_id=incident_id,
            approval_id=approval_id,
            rejected_by=rejected_by,
            reason=reason,
        )

        return {
            "success": True,
            "message": (
                "Emergency response rejected."
            ),
            "approval": approval,
            "audit_events": (
                audit_service
                .get_incident_events(
                    incident_id
                )
            ),
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ============================================================
# GET INCIDENT AUDIT TRAIL
# ============================================================

@router.get(
    "/incidents/{incident_id}/audit"
)
def get_incident_audit(
    incident_id: str,
):

    events = (
        audit_service
        .get_incident_events(
            incident_id
        )
    )

    return {
        "success": True,
        "incident_id": incident_id,
        "count": len(events),
        "events": events,
    }