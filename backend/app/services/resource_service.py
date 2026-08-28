from datetime import datetime, timezone
from typing import Any
from backend.app.database.mongodb import resources_collection


class ResourceCoordinationService:
    """Production-grade MongoDB-backed Resource Lifecycle and Coordination Service."""

    VALID_STATUSES = {"AVAILABLE", "DEPLOYED", "UNAVAILABLE", "MAINTENANCE"}

    def get_all_resources(self) -> list[dict[str, Any]]:
        return list(resources_collection.find({}, {"_id": 0}))

    def get_resource(self, resource_id: str) -> dict[str, Any] | None:
        return resources_collection.find_one({"id": resource_id}, {"_id": 0})

    def get_available_resources(self, resource_type: str | None = None) -> list[dict[str, Any]]:
        query = {"status": "AVAILABLE"}
        if resource_type:
            query["type"] = resource_type
        return list(resources_collection.find(query, {"_id": 0}))

    def deploy_resource(
        self,
        resource_id: str,
        incident_id: str,
        deployed_by: str = "Campus Emergency Commander",
        deployment_location: str | None = None,
    ) -> dict[str, Any]:
        """Deploy a resource. Enforces lifecycle rule: AVAILABLE -> DEPLOYED only."""
        resource = resources_collection.find_one({"id": resource_id})
        if not resource:
            raise ValueError(f"Resource {resource_id} not found.")

        current_status = resource.get("status", "AVAILABLE")
        if current_status != "AVAILABLE":
            raise ValueError(
                f"Cannot deploy resource {resource_id} because its current status is {current_status}. "
                "Only AVAILABLE resources can be deployed."
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        deployment_info = {
            "incident_id": incident_id,
            "deployed_at": now_iso,
            "deployed_by": deployed_by,
            "deployment_location": deployment_location or resource.get("location", "Campus"),
        }

        deployment_history = resource.get("deployment_history", [])
        deployment_history.append(
            {
                "action": "DEPLOY",
                "incident_id": incident_id,
                "timestamp": now_iso,
                "actor": deployed_by,
            }
        )

        resources_collection.update_one(
            {"id": resource_id},
            {
                "$set": {
                    "status": "DEPLOYED",
                    "incident_id": incident_id,
                    "deployed_at": now_iso,
                    "deployed_by": deployed_by,
                    "deployment_location": deployment_location or resource.get("location", "Campus"),
                    "deployment_history": deployment_history,
                }
            },
        )

        return resources_collection.find_one({"id": resource_id}, {"_id": 0})

    def revoke_resource(
        self,
        resource_id: str,
        incident_id: str | None = None,
        revoked_by: str = "Campus Emergency Commander",
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Revoke a deployed resource. Enforces lifecycle rule: DEPLOYED -> AVAILABLE."""
        resource = resources_collection.find_one({"id": resource_id})
        if not resource:
            raise ValueError(f"Resource {resource_id} not found.")

        current_status = resource.get("status", "AVAILABLE")
        if current_status != "DEPLOYED":
            raise ValueError(
                f"Cannot revoke resource {resource_id} because its status is {current_status}. "
                "Only DEPLOYED resources can be revoked."
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        deployment_history = resource.get("deployment_history", [])
        deployment_history.append(
            {
                "action": "REVOKE",
                "incident_id": incident_id or resource.get("incident_id"),
                "timestamp": now_iso,
                "actor": revoked_by,
                "reason": reason or "Incident completed / Resource stood down",
            }
        )

        resources_collection.update_one(
            {"id": resource_id},
            {
                "$set": {
                    "status": "AVAILABLE",
                    "incident_id": None,
                    "revoked_at": now_iso,
                    "revoked_by": revoked_by,
                    "revoke_reason": reason,
                    "deployment_history": deployment_history,
                }
            },
        )

        return resources_collection.find_one({"id": resource_id}, {"_id": 0})

    def get_resource_summary(self) -> dict[str, Any]:
        total = resources_collection.count_documents({})
        available = resources_collection.count_documents({"status": "AVAILABLE"})
        deployed = resources_collection.count_documents({"status": "DEPLOYED"})
        unavailable = resources_collection.count_documents({"status": "UNAVAILABLE"})
        maintenance = resources_collection.count_documents({"status": "MAINTENANCE"})

        return {
            "total": total,
            "available": available,
            "deployed": deployed,
            "unavailable": unavailable,
            "maintenance": maintenance,
        }


resource_service = ResourceCoordinationService()