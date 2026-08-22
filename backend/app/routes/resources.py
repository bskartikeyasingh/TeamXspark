from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.app.database.mongodb import resources_collection


# ============================================================
# AegisCampus AI
# Dynamic Resource Management
# ============================================================

router = APIRouter(
    prefix="/api/resources",
    tags=["Resources"],
)


# ============================================================
# GET ALL RESOURCES
# ============================================================

@router.get("")
def get_resources():

    resources = list(
        resources_collection.find(
            {},
            {"_id": 0},
        )
    )

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

    total = resources_collection.count_documents({})

    available = resources_collection.count_documents({
        "status": "AVAILABLE"
    })

    deployed = resources_collection.count_documents({
        "status": "DEPLOYED"
    })

    unavailable = resources_collection.count_documents({
        "status": "UNAVAILABLE"
    })

    return {
        "success": True,
        "total": total,
        "available": available,
        "deployed": deployed,
        "unavailable": unavailable,
    }


# ============================================================
# RESOURCE SUMMARY BY TYPE
# ============================================================

@router.get("/summary/by-type")
def get_resource_summary_by_type():

    resources = list(
        resources_collection.find(
            {},
            {
                "_id": 0,
                "type": 1,
                "status": 1,
            },
        )
    )

    summary = {}

    for resource in resources:

        resource_type = resource.get(
            "type",
            "Unknown",
        )

        status = resource.get(
            "status",
            "UNKNOWN",
        )

        if resource_type not in summary:

            summary[resource_type] = {
                "total": 0,
                "available": 0,
                "deployed": 0,
                "unavailable": 0,
            }

        summary[resource_type]["total"] += 1

        if status == "AVAILABLE":

            summary[resource_type]["available"] += 1

        elif status == "DEPLOYED":

            summary[resource_type]["deployed"] += 1

        elif status == "UNAVAILABLE":

            summary[resource_type]["unavailable"] += 1

    return {
        "success": True,
        "summary": summary,
    }


# ============================================================
# ADD RESOURCE
# ============================================================

@router.post("")
def add_resource(
    payload: dict[str, Any],
):

    resource_id = str(
        payload.get(
            "id",
            "",
        )
    ).strip()

    name = str(
        payload.get(
            "name",
            "",
        )
    ).strip()

    resource_type = str(
        payload.get(
            "type",
            "",
        )
    ).strip()

    location = str(
        payload.get(
            "location",
            "",
        )
    ).strip()

    status = str(
        payload.get(
            "status",
            "AVAILABLE",
        )
    ).strip().upper()

    capacity = payload.get(
        "capacity",
        1,
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not resource_id:

        raise HTTPException(
            status_code=400,
            detail="Resource ID is required.",
        )

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Resource name is required.",
        )

    if not resource_type:

        raise HTTPException(
            status_code=400,
            detail="Resource type is required.",
        )

    if not location:

        raise HTTPException(
            status_code=400,
            detail="Resource location is required.",
        )

    if status not in {
        "AVAILABLE",
        "DEPLOYED",
        "UNAVAILABLE",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid resource status. "
                "Use AVAILABLE, DEPLOYED, or UNAVAILABLE."
            ),
        )

    try:

        capacity = int(capacity)

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Capacity must be a number.",
        )

    if capacity < 1:

        raise HTTPException(
            status_code=400,
            detail="Capacity must be at least 1.",
        )

    # --------------------------------------------------------
    # CHECK DUPLICATE
    # --------------------------------------------------------

    existing = resources_collection.find_one(
        {
            "id": resource_id
        }
    )

    if existing is not None:

        raise HTTPException(
            status_code=409,
            detail="Resource with this ID already exists.",
        )

    # --------------------------------------------------------
    # CREATE RESOURCE
    # --------------------------------------------------------

    resource = {

        "id": resource_id,

        "name": name,

        "type": resource_type,

        "status": status,

        "location": location,

        "capacity": capacity,

        "created_at": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),
    }

    resources_collection.insert_one(
        resource.copy()
    )

    return {
        "success": True,
        "message": "Resource added successfully.",
        "resource": resource,
    }


# ============================================================
# UPDATE RESOURCE
# ============================================================

@router.put("/{resource_id}")
def update_resource(
    resource_id: str,
    payload: dict[str, Any],
):

    existing = resources_collection.find_one(
        {
            "id": resource_id
        }
    )

    if existing is None:

        raise HTTPException(
            status_code=404,
            detail="Resource not found.",
        )

    updates = {}

    # --------------------------------------------------------
    # OPTIONAL FIELDS
    # --------------------------------------------------------

    if "name" in payload:

        name = str(
            payload.get(
                "name",
                "",
            )
        ).strip()

        if not name:

            raise HTTPException(
                status_code=400,
                detail="Resource name cannot be empty.",
            )

        updates["name"] = name

    if "type" in payload:

        resource_type = str(
            payload.get(
                "type",
                "",
            )
        ).strip()

        if not resource_type:

            raise HTTPException(
                status_code=400,
                detail="Resource type cannot be empty.",
            )

        updates["type"] = resource_type

    if "location" in payload:

        location = str(
            payload.get(
                "location",
                "",
            )
        ).strip()

        if not location:

            raise HTTPException(
                status_code=400,
                detail="Resource location cannot be empty.",
            )

        updates["location"] = location

    if "status" in payload:

        status = str(
            payload.get(
                "status",
                "",
            )
        ).strip().upper()

        if status not in {
            "AVAILABLE",
            "DEPLOYED",
            "UNAVAILABLE",
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid resource status. "
                    "Use AVAILABLE, DEPLOYED, or UNAVAILABLE."
                ),
            )

        updates["status"] = status

    if "capacity" in payload:

        try:

            capacity = int(
                payload["capacity"]
            )

        except (TypeError, ValueError):

            raise HTTPException(
                status_code=400,
                detail="Capacity must be a number.",
            )

        if capacity < 1:

            raise HTTPException(
                status_code=400,
                detail="Capacity must be at least 1.",
            )

        updates["capacity"] = capacity

    # --------------------------------------------------------
    # NOTHING TO UPDATE
    # --------------------------------------------------------

    if not updates:

        raise HTTPException(
            status_code=400,
            detail="No valid fields provided for update.",
        )

    updates["updated_at"] = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    # --------------------------------------------------------
    # UPDATE MONGODB
    # --------------------------------------------------------

    resources_collection.update_one(

        {
            "id": resource_id
        },

        {
            "$set": updates
        },
    )

    updated_resource = resources_collection.find_one(

        {
            "id": resource_id
        },

        {
            "_id": 0
        },
    )

    return {
        "success": True,
        "message": "Resource updated successfully.",
        "resource": updated_resource,
    }


# ============================================================
# DELETE RESOURCE
# ============================================================

@router.delete("/{resource_id}")
def delete_resource(
    resource_id: str,
):

    resource = resources_collection.find_one(
        {
            "id": resource_id
        }
    )

    if resource is None:

        raise HTTPException(
            status_code=404,
            detail="Resource not found.",
        )

    # --------------------------------------------------------
    # PROTECT DEPLOYED RESOURCES
    # --------------------------------------------------------

    if resource.get("status") == "DEPLOYED":

        raise HTTPException(
            status_code=400,
            detail=(
                "Deployed resources cannot be deleted. "
                "Change the resource status first."
            ),
        )

    resources_collection.delete_one(
        {
            "id": resource_id
        }
    )

    return {
        "success": True,
        "message": "Resource deleted successfully.",
        "resource_id": resource_id,
    }


# ============================================================
# GET RESOURCE BY ID
# ============================================================

@router.get("/{resource_id}")
def get_resource(
    resource_id: str,
):

    resource = resources_collection.find_one(
        {
            "id": resource_id
        },
        {
            "_id": 0
        },
    )

    if resource is None:

        raise HTTPException(
            status_code=404,
            detail="Resource not found.",
        )

    return {
        "success": True,
        "resource": resource,
    }