from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException

from backend.app.database.mongodb import (
    resources_collection,
    incidents_collection,
    approvals_collection,
)
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
from backend.app.services.notification_service import (
    notification_service,
)
from backend.app.services.resource_service import (
    resource_service,
)


router = APIRouter(
    prefix="/api/emergency",
    tags=["Emergency Command"],
)


def create_incident_id() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"INC-{timestamp}"


# ============================================================
# CREATE EMERGENCY RESPONSE & PERSIST INCIDENT
# ============================================================

@router.post("/respond")
def create_emergency_response(payload: dict[str, Any]):
    try:
        description = str(payload.get("description", "")).strip()
        location = str(payload.get("location", "")).strip()
        student_id = str(payload.get("student_id", "")).strip()
        student_email = str(payload.get("student_email", "")).strip()
        student_name = str(payload.get("student_name", "")).strip()
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

        incident_id = create_incident_id()
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        # Record audit event
        audit_service.record_event(
            incident_id=incident_id,
            event_type="INCIDENT_RECEIVED",
            message="Emergency incident reported through AegisCampus platform.",
            actor=student_name or "Student User",
            metadata={
                "location": location,
                "student_email": student_email,
                "has_image": bool(image_data),
            },
        )

        # AI Incident Intelligence
        analysis = incident_intelligence_agent.analyze(
            description=description,
            location=location,
        )

        audit_service.record_ai_analysis(
            incident_id=incident_id,
            analysis=analysis,
        )

        # Build incident intelligence object
        incident = {
            **analysis,
            "incident_id": incident_id,
            "description": description,
            "location": location,
            "student_id": student_id,
            "student_email": student_email,
            "student_name": student_name,
            "voice_transcript": voice_transcript,
            "image_data": image_data,
        }

        # Multi-Agent Unified Response
        unified_response = emergency_response_aggregator.create_unified_response(
            incident
        )

        unified_response["incident_details"] = {
            "incident_id": incident_id,
            "description": description,
            "location": location,
            "student_id": student_id,
            "student_name": student_name,
            "student_email": student_email,
            "voice_transcript": voice_transcript,
            "image_data": image_data,
        }

        # Audit events for agent activation & resource recommendations
        audit_service.record_agents_activated(
            incident_id=incident_id,
            agents=unified_response.get("activated_agents", []),
        )

        audit_service.record_resource_recommendation(
            incident_id=incident_id,
            resources=unified_response.get("selected_resources", []),
        )

        # Human Approval Request
        approval_request = approval_service.create_approval_request(
            incident_id=incident_id,
            response_plan=unified_response,
            requested_by="AI Emergency Orchestrator",
        )

        audit_service.record_approval_requested(
            incident_id=incident_id,
            approval_id=approval_request["approval_id"],
        )

        unified_response["approval_request"] = approval_request
        unified_response["approval_status"] = "PENDING"

        # PERMANENT MONGO INCIDENT DOCUMENT
        incident_doc = {
            "incident_id": incident_id,
            "student_id": student_id or None,
            "student_name": student_name or "Anonymous Student",
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
            "recommended_actions": unified_response.get("recommended_actions", []),
            "response_plan": unified_response,
            "approval_id": approval_request["approval_id"],
            "approval_status": "PENDING",
            "deployed_resources": [],
            "alerts": [],
            "status": "PENDING",
            "created_at": now_iso,
            "updated_at": now_iso,
            "resolved_at": None,
        }

        incidents_collection.insert_one(incident_doc.copy())

        # Clean document for JSON serialization
        incident_doc.pop("_id", None)

        return {
            "success": True,
            "incident_id": incident_id,
            "incident": incident_doc,
            "response": unified_response,
            "approval": approval_request,
            "audit_events": audit_service.get_incident_events(incident_id),
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("Emergency response error:", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ============================================================
# APPROVE EMERGENCY RESPONSE & DISPATCH RESOURCES
# ============================================================

@router.post("/approvals/{approval_id}/approve")
def approve_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):
    approved_by = str(payload.get("approved_by", "Campus Emergency Commander")).strip()
    if not approved_by:
        raise HTTPException(status_code=400, detail="approved_by is required.")

    try:
        approval = approval_service.approve(
            approval_id=approval_id,
            approved_by=approved_by,
        )

        incident_id = approval["incident_id"]
        selected_resources = approval.get("selected_resources", [])

        dispatched_resources = []
        created_alerts = []

        # Find incident details for alert dispatch
        incident = incidents_collection.find_one({"incident_id": incident_id})
        incident_location = incident.get("location", "Campus") if incident else "Campus"
        incident_type = incident.get("incident_type", "General Emergency") if incident else "General Emergency"
        incident_severity = incident.get("severity", "High") if incident else "High"

        for resource_id in selected_resources:
            resource = resources_collection.find_one({"id": resource_id})
            if resource is None or resource.get("status") != "AVAILABLE":
                continue

            # Deploy resource atomically
            try:
                updated_res = resource_service.deploy_resource(
                    resource_id=resource_id,
                    incident_id=incident_id,
                    deployed_by=approved_by,
                    deployment_location=incident_location,
                )
                dispatched_resources.append(resource_id)

                # Dispatch emergency alert to driver/personnel
                alert = notification_service.create_alert(
                    incident_id=incident_id,
                    resource_id=resource_id,
                    resource_type=updated_res.get("type", "General"),
                    recipient_name=updated_res.get("contact_name", "Emergency Responder"),
                    recipient_phone=updated_res.get("phone_number", ""),
                    incident_location=incident_location,
                    incident_type=incident_type,
                    severity=incident_severity,
                )
                created_alerts.append(alert)

            except Exception as e:
                print(f"Error deploying resource {resource_id}:", e)

        now_iso = datetime.now(timezone.utc).isoformat()

        # Update MongoDB incident record with approval, status, deployed resources, and alerts
        incidents_collection.update_one(
            {"incident_id": incident_id},
            {
                "$set": {
                    "approval_status": "APPROVED",
                    "status": "ACTIVE",
                    "deployed_resources": dispatched_resources,
                    "alerts": created_alerts,
                    "updated_at": now_iso,
                }
            },
        )

        audit_service.record_approval(
            incident_id=incident_id,
            approval_id=approval_id,
            approved_by=approved_by,
        )

        if dispatched_resources:
            audit_service.record_resource_dispatch(
                incident_id=incident_id,
                resources=dispatched_resources,
                actor=approved_by,
            )

        return {
            "success": True,
            "message": "Emergency response approved and resources dispatched.",
            "approval": approval,
            "dispatched_resources": dispatched_resources,
            "alerts": created_alerts,
            "audit_events": audit_service.get_incident_events(incident_id),
        }

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ============================================================
# REJECT EMERGENCY RESPONSE
# ============================================================

@router.post("/approvals/{approval_id}/reject")
def reject_emergency_response(
    approval_id: str,
    payload: dict[str, Any],
):
    rejected_by = str(payload.get("rejected_by", "Campus Emergency Commander")).strip()
    reason = str(payload.get("reason", "")).strip()

    if not rejected_by:
        raise HTTPException(status_code=400, detail="rejected_by is required.")
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required.")

    try:
        approval = approval_service.reject(
            approval_id=approval_id,
            rejected_by=rejected_by,
            reason=reason,
        )

        incident_id = approval["incident_id"]
        now_iso = datetime.now(timezone.utc).isoformat()

        incidents_collection.update_one(
            {"incident_id": incident_id},
            {
                "$set": {
                    "approval_status": "REJECTED",
                    "status": "REJECTED",
                    "rejection_reason": reason,
                    "updated_at": now_iso,
                }
            },
        )

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
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ============================================================
# RESOLVE INCIDENT
# ============================================================

@router.post("/incidents/{incident_id}/resolve")
def resolve_incident(incident_id: str, payload: dict[str, Any] = None):
    payload = payload or {}
    resolved_by = str(payload.get("resolved_by", "Campus Emergency Commander")).strip()
    notes = str(payload.get("notes", "Incident resolved safely.")).strip()

    incident = incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "status": "RESOLVED",
                "resolved_at": now_iso,
                "resolved_by": resolved_by,
                "resolution_notes": notes,
                "updated_at": now_iso,
            }
        },
    )

    audit_service.record_event(
        incident_id=incident_id,
        event_type="INCIDENT_RESOLVED",
        message=f"Incident marked RESOLVED by {resolved_by}. Notes: {notes}",
        actor=resolved_by,
        metadata={"notes": notes},
    )

    updated_incident = incidents_collection.find_one({"incident_id": incident_id}, {"_id": 0})

    return {
        "success": True,
        "message": f"Incident {incident_id} resolved.",
        "incident": updated_incident,
    }


# ============================================================
# CLOSE INCIDENT
# ============================================================

@router.post("/incidents/{incident_id}/close")
def close_incident(incident_id: str, payload: dict[str, Any] = None):
    payload = payload or {}
    closed_by = str(payload.get("closed_by", "Campus Emergency Commander")).strip()

    incident = incidents_collection.find_one({"incident_id": incident_id})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    now_iso = datetime.now(timezone.utc).isoformat()

    incidents_collection.update_one(
        {"incident_id": incident_id},
        {
            "$set": {
                "status": "CLOSED",
                "closed_at": now_iso,
                "closed_by": closed_by,
                "updated_at": now_iso,
            }
        },
    )

    audit_service.record_event(
        incident_id=incident_id,
        event_type="INCIDENT_CLOSED",
        message=f"Incident closed and archived by {closed_by}.",
        actor=closed_by,
    )

    updated_incident = incidents_collection.find_one({"incident_id": incident_id}, {"_id": 0})

    return {
        "success": True,
        "message": f"Incident {incident_id} closed.",
        "incident": updated_incident,
    }


# ============================================================
# GET EMERGENCY ALERTS
# ============================================================

@router.get("/alerts")
def get_emergency_alerts(limit: int = 100):
    alerts = notification_service.get_all_alerts(limit=limit)
    return {
        "success": True,
        "count": len(alerts),
        "alerts": alerts,
    }


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