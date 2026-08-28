from typing import Any
from backend.app.database.mongodb import resources_collection


class CommunicationResponseAgent:
    """Specialized Communication Response Agent for AegisCampus AI."""

    def analyze(self, incident: dict[str, Any]) -> dict[str, Any]:
        severity = incident.get("severity", "Medium")
        incident_type = incident.get("incident_type", "Other")
        location = incident.get("location", "Campus")

        # Query available communication resources from MongoDB
        available_resources = list(
            resources_collection.find(
                {
                    "type": "Communication",
                    "status": "AVAILABLE",
                },
                {"_id": 0, "id": 1, "name": 1, "type": 1},
            )
        )

        selected_resources = []
        if available_resources:
            selected_resources.append(available_resources[0]["id"])

        actions = [
            f"Draft emergency push broadcast regarding {incident_type.lower()} at {location}",
            "Coordinate two-way radio channels between security, medical, and commander",
            "Broadcast safe evacuation routes and assembly zones to campus devices",
        ]

        return {
            "agent": "communication",
            "priority": severity,
            "recommended_actions": actions,
            "selected_resources": selected_resources,
            "reasoning": f"Campus-wide emergency communications activated for {location}.",
            "human_approval_required": True,
        }


communication_response_agent = CommunicationResponseAgent()