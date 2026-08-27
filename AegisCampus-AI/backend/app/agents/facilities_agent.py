from typing import Any
from backend.app.database.mongodb import resources_collection


class FacilitiesResponseAgent:
    """Specialized Facilities Response Agent for AegisCampus AI."""

    def analyze(self, incident: dict[str, Any]) -> dict[str, Any]:
        severity = incident.get("severity", "Medium")
        incident_type = incident.get("incident_type", "Fire")
        location = incident.get("location", "Campus")

        # Query available facilities resources from MongoDB
        available_resources = list(
            resources_collection.find(
                {
                    "type": "Facilities",
                    "status": "AVAILABLE",
                },
                {"_id": 0, "id": 1, "name": 1, "type": 1},
            )
        )

        selected_resources = []
        if available_resources:
            selected_resources.append(available_resources[0]["id"])

        actions = [
            f"Activate emergency building systems and hazard isolation at {location}",
            "Deploy facilities rapid repair and fire suppression/containment crew",
            "Verify power and ventilation safety in adjacent blocks",
        ]

        return {
            "agent": "facilities",
            "priority": severity,
            "recommended_actions": actions,
            "selected_resources": selected_resources,
            "reasoning": f"Facilities infrastructure intervention requested for {incident_type} at {location}.",
            "human_approval_required": True,
        }


facilities_response_agent = FacilitiesResponseAgent()