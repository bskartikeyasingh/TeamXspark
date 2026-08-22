from datetime import datetime, timezone
from typing import Any
from backend.app.database.mongodb import resources_collection
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
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"INC-{timestamp}"


# ============================================================
# CREATE EMERGENCY RESPONSE
# ============================================================

@router.post("/respond")
def create_emergency_response(payload: dict[str, Any]):
    try:
        description = str(payload.get("description", "")).strip()
        location = str(payload.get("location", "")).strip()
        
        # Student information
        student_email = str(payload.get("student_email", "")).strip()
        student_name = str(payload.get("student_name", "")).strip()
        
        # Optional incident image
        image_data = payload.get("image_data", None)

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
            message="Emergency incident received through the Emergency Command API.",
            actor=student_name or "API",
            metadata={
                "location": location,
                "student_email": student_email,
                "has_image": bool(image_data),
            },
        )

        # ----------------------------------------------------
        # STEP 1: Incident Intelligence
        # ----------------------------------------------------
        analysis = incident_intelligence_agent.analyze(
            description=description,
            location=location,
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
            # Student details
            "student_email": student_email,
            "student_name": student_name,
            # Incident image
            "image_data": image_data,
        }

        # ----------------------------------------------------
        # STEP 2: Multi-Agent Response
        # ----------------------------------------------------
        unified_response = emergency_response_aggregator.create_unified_response(
            incident
        )

        # Keep complete incident information with the approval
        # so administrators can see who reported it and the image.
        unified_response["incident_details"] = {
            "incident_id": incident_id,
            "description": description,
            "location": location,
            "student_name": student_name,
            "student_email": student_email,
            "image_data": image_data,
        }

        # ----------------------------------------------------
        # AUDIT: Agents activated & Resources recommended
        # ----------------------------------------------------
        audit_service.record_agents_activated(
            incident_id=incident_id,
            agents=unified_response.get("activated_agents", []),
        )

        audit_service.record_resource_recommendation(
            incident_id=incident_id,
            resources=unified_response.get("selected_resources", []),
        )

        # ----------------------------------------------------
        # STEP 3: Human approval
        # ----------------------------------------------------
        approval_request = approval_service.create_approval_request(
            incident_id=incident_id,
            response_plan=unified_response,
            requested_by="Emergency Orchestrator",
        )

        # ----------------------------------------------------
        # AUDIT: Approval requested
        # ----------------------------------------------------
        audit_service.record_approval_requested(
            incident_id=incident_id,
            approval_id=approval_request["approval_id"],
        )

        # ----------------------------------------------------
        # Add approval information
        # ----------------------------------------------------
        unified_response["approval_request"] = approval_request
        unified_response["approval_status"] = "PENDING"

        # ----------------------------------------------------
        # Final API response
        # ----------------------------------------------------
        return {
            "success": True,
            "incident_id": incident_id,
            "incident": incident,
            "response": unified_response,
            "approval": approval_request,
            "audit_events": audit_service.get_incident_events(incident_id),
        }

    except HTTPException:
        raise

    except Exception as exc:
        print("Emergency response error:", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET ALL APPROVALS
# ============================================================

@router.get("/approvals")
def get_all_approvals():
    try:
        approvals = approval_service.get_all_approvals()

        return {
            "success": True,
            "count": len(approvals),
            "approvals": approvals,
        }

    except Exception as exc:
        print("Get approvals error:", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


# ============================================================
# GET APPROVAL BY ID
# ============================================================

@router.get("/approvals/{approval_id}")
def get_approval(approval_id: str):
    try:
        approval = approval_service.get_approval(approval_id)
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

@router.post("/approvals/{approval_id}/approve")
def approve_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):
    approved_by = str(
        payload.get("approved_by", "Campus Emergency Commander")
    ).strip()

    if not approved_by:
        raise HTTPException(
            status_code=400,
            detail="approved_by is required.",
        )

    try:
        approval = approval_service.approve(
            approval_id=approval_id,
            approved_by=approved_by,
        )

        incident_id = approval["incident_id"]

        # ----------------------------------------------------
        # DISPATCH SELECTED RESOURCES
        # ----------------------------------------------------
        selected_resources = approval.get(
            "selected_resources",
            [],
        )

        dispatched_resources = []

        for resource_id in selected_resources:
            resource = resources_collection.find_one(
                {
                    "id": resource_id
                }
            )

            if resource is None:
                continue

            if resource.get("status") != "AVAILABLE":
                continue

            resources_collection.update_one(
                {
                    "id": resource_id,
                },
                {
                    "$set": {
                        "status": "DEPLOYED",
                        "deployed_at": (
                            datetime.now(
                                timezone.utc
                            ).isoformat()
                        ),
                        "incident_id": incident_id,
                    }
                },
            )

            dispatched_resources.append(
                resource_id
            )

        audit_service.record_approval(
            incident_id=incident_id,
            approval_id=approval_id,
            approved_by=approved_by,
        )

        # ----------------------------------------------------
        # AUDIT: Resources dispatched
        # ----------------------------------------------------
        audit_service.record_resource_dispatch(
            incident_id=incident_id,
            resources=dispatched_resources,
        )

        return {
            "success": True,
            "message": "Emergency response approved and resources dispatched.",
            "approval": approval,
            "dispatched_resources": dispatched_resources,
            "audit_events": audit_service.get_incident_events(
                incident_id
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

@router.post("/approvals/{approval_id}/reject")
def reject_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):
    rejected_by = str(
        payload.get("rejected_by", "Campus Emergency Commander")
    ).strip()
    reason = str(payload.get("reason", "")).strip()

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
        approval = approval_service.reject(
            approval_id=approval_id,
            rejected_by=rejected_by,
            reason=reason,
        )

        incident_id = approval["incident_id"]

        audit_service.record_rejection(
            incident_id=incident_id,
            approval_id=approval_id,
            rejected_by=rejected_by,
            reason=reason,
        )

        return {
            "success": True,
            "message": "Emergency response rejected.",
            "approval": approval,
            "audit_events": audit_service.get_incident_events(incident_id),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ============================================================
# GET INCIDENT AUDIT TRAIL
# ============================================================

@router.get("/incidents/{incident_id}/audit")
def get_incident_audit(incident_id: str):
    events = audit_service.get_incident_events(incident_id)

    return {
        "success": True,
        "incident_id": incident_id,
        "count": len(events),
        "events": events,
    }