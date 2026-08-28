from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.app.database.mongodb import resources_collection, audit_logs_collection
from backend.app.services.resource_service import resource_service
from backend.app.services.notification_service import notification_service
from backend.app.services.audit_service import audit_service


router = APIRouter(
    prefix="/api/resources",
    tags=["Resources"],
)


# ============================================================
# GET ALL RESOURCES
# ============================================================

@router.get("")
def get_resources():
    resources = list(resources_collection.find({}, {"_id": 0}))
    return {
        "success": True,
        "count": len(resources),
        "resources": resources,
    }


# ============================================================
# RESOURCE SUMMARY
# ============================================================

@router.get("/summary")
def get_resource_summary():
    summary = resource_service.get_resource_summary()
    return {
        "success": True,
        **summary,
    }


# ============================================================
# RESOURCE SUMMARY BY TYPE
# ============================================================

@router.get("/summary/by-type")
def get_resource_summary_by_type():
    resources = list(resources_collection.find({}, {"_id": 0, "type": 1, "status": 1}))
    summary = {}

    for resource in resources:
        resource_type = resource.get("type", "Unknown")
        status = resource.get("status", "UNKNOWN")

        if resource_type not in summary:
            summary[resource_type] = {
                "total": 0,
                "available": 0,
                "deployed": 0,
                "unavailable": 0,
                "maintenance": 0,
            }

        summary[resource_type]["total"] += 1
        if status == "AVAILABLE":
            summary[resource_type]["available"] += 1
        elif status == "DEPLOYED":
            summary[resource_type]["deployed"] += 1
        elif status == "MAINTENANCE":
            summary[resource_type]["maintenance"] += 1
        else:
            summary[resource_type]["unavailable"] += 1

    return {
        "success": True,
        "summary": summary,
    }


# ============================================================
# ADD RESOURCE
# ============================================================

@router.post("")
def add_resource(payload: dict[str, Any]):
    resource_id = str(payload.get("id", "")).strip()
    name = str(payload.get("name", "")).strip()
    resource_type = str(payload.get("type", "")).strip()
    location = str(payload.get("location", "")).strip()
    status = str(payload.get("status", "AVAILABLE")).strip().upper()
    capacity = payload.get("capacity", 1)

    # Optional contact info
    contact_name = str(payload.get("contact_name", "")).strip()
    phone_number = str(payload.get("phone_number", "")).strip()
    email = str(payload.get("email", "")).strip()
    vehicle_number = str(payload.get("vehicle_number", "")).strip()
    designation = str(payload.get("designation", "")).strip()

    if not resource_id:
        raise HTTPException(status_code=400, detail="Resource ID is required.")
    if not name:
        raise HTTPException(status_code=400, detail="Resource name is required.")
    if not resource_type:
        raise HTTPException(status_code=400, detail="Resource type is required.")
    if not location:
        raise HTTPException(status_code=400, detail="Resource location is required.")

    if status not in {"AVAILABLE", "DEPLOYED", "UNAVAILABLE", "MAINTENANCE"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid resource status. Use AVAILABLE, DEPLOYED, UNAVAILABLE, or MAINTENANCE.",
        )

    try:
        capacity = max(1, int(capacity))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Capacity must be a positive integer.")

    existing = resources_collection.find_one({"id": resource_id})
    if existing is not None:
        raise HTTPException(status_code=409, detail="Resource with this ID already exists.")

    resource = {
        "id": resource_id,
        "name": name,
        "type": resource_type,
        "status": status,
        "location": location,
        "capacity": capacity,
        "contact_name": contact_name,
        "phone_number": phone_number,
        "email": email,
        "vehicle_number": vehicle_number,
        "designation": designation,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deployment_history": [],
    }

    resources_collection.insert_one(resource.copy())

    audit_service.record_event(
        incident_id="RESOURCE_MGMT",
        event_type="RESOURCE_CREATED",
        message=f"New resource {resource_id} ({name}) created.",
        actor="Admin",
        metadata={"resource_id": resource_id, "type": resource_type},
    )

    return {
        "success": True,
        "message": "Resource added successfully.",
        "resource": resource,
    }


# ============================================================
# DEPLOY RESOURCE (MANUAL/DIRECT DEPLOY)
# ============================================================

@router.post("/{resource_id}/deploy")
def deploy_resource_endpoint(resource_id: str, payload: dict[str, Any]):
    incident_id = str(payload.get("incident_id", "MANUAL_DISPATCH")).strip()
    deployed_by = str(payload.get("deployed_by", "Campus Emergency Commander")).strip()
    deployment_location = payload.get("deployment_location", None)

    try:
        updated_resource = resource_service.deploy_resource(
            resource_id=resource_id,
            incident_id=incident_id,
            deployed_by=deployed_by,
            deployment_location=deployment_location,
        )

        # Create alert for assigned personnel
        alert = notification_service.create_alert(
            incident_id=incident_id,
            resource_id=resource_id,
            resource_type=updated_resource.get("type", "General"),
            recipient_name=updated_resource.get("contact_name", "Emergency Responder"),
            recipient_phone=updated_resource.get("phone_number", ""),
            incident_location=deployment_location or updated_resource.get("location", "Campus"),
            incident_type="Incident Response",
            severity="High",
        )

        audit_service.record_resource_dispatch(
            incident_id=incident_id,
            resources=[resource_id],
            actor=deployed_by,
        )

        return {
            "success": True,
            "message": f"Resource {resource_id} deployed successfully.",
            "resource": updated_resource,
            "alert": alert,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ============================================================
# REVOKE RESOURCE
# ============================================================

@router.post("/{resource_id}/revoke")
def revoke_resource_endpoint(resource_id: str, payload: dict[str, Any] = None):
    payload = payload or {}
    incident_id = payload.get("incident_id")
    revoked_by = str(payload.get("revoked_by", "Campus Emergency Commander")).strip()
    reason = str(payload.get("reason", "Incident resolved / unit stood down")).strip()

    try:
        updated_resource = resource_service.revoke_resource(
            resource_id=resource_id,
            incident_id=incident_id,
            revoked_by=revoked_by,
            reason=reason,
        )

        audit_service.record_event(
            incident_id=incident_id or "RESOURCE_MGMT",
            event_type="RESOURCE_REVOKED",
            message=f"Resource {resource_id} revoked by {revoked_by}. Reason: {reason}",
            actor=revoked_by,
            metadata={"resource_id": resource_id, "reason": reason},
        )

        return {
            "success": True,
            "message": f"Resource {resource_id} returned to AVAILABLE status.",
            "resource": updated_resource,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ============================================================
# UPDATE RESOURCE
# ============================================================

@router.put("/{resource_id}")
def update_resource(
    resource_id: str,
    payload: dict[str, Any],
):
    existing = resources_collection.find_one({"id": resource_id})
    if existing is None:
        raise HTTPException(status_code=404, detail="Resource not found.")

    updates = {}

    for field in ["name", "type", "location", "contact_name", "phone_number", "email", "vehicle_number", "designation"]:
        if field in payload:
            val = str(payload[field]).strip()
            if field in ["name", "type", "location"] and not val:
                raise HTTPException(status_code=400, detail=f"Field '{field}' cannot be empty.")
            updates[field] = val

    if "status" in payload:
        status = str(payload["status"]).strip().upper()
        if status not in {"AVAILABLE", "DEPLOYED", "UNAVAILABLE", "MAINTENANCE"}:
            raise HTTPException(status_code=400, detail="Invalid resource status.")
        updates["status"] = status

    if "capacity" in payload:
        try:
            updates["capacity"] = max(1, int(payload["capacity"]))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Capacity must be a positive integer.")

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided for update.")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    resources_collection.update_one({"id": resource_id}, {"$set": updates})
    updated_resource = resources_collection.find_one({"id": resource_id}, {"_id": 0})

    return {
        "success": True,
        "message": "Resource updated successfully.",
        "resource": updated_resource,
    }


# ============================================================
# DELETE / DEACTIVATE RESOURCE
# ============================================================

@router.delete("/{resource_id}")
def delete_resource(resource_id: str):
    resource = resources_collection.find_one({"id": resource_id})
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found.")

    if resource.get("status") == "DEPLOYED":
        raise HTTPException(
            status_code=400,
            detail="Deployed resources cannot be deleted. Revoke or change the resource status first.",
        )

    resources_collection.delete_one({"id": resource_id})
    return {
        "success": True,
        "message": "Resource deleted successfully.",
        "resource_id": resource_id,
    }


# ============================================================
# GET RESOURCE BY ID
# ============================================================

@router.get("/{resource_id}")
def get_resource(resource_id: str):
    resource = resources_collection.find_one({"id": resource_id}, {"_id": 0})
    if resource is None:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return {
        "success": True,
        "resource": resource,
    }