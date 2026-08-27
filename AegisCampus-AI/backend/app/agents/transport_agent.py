from typing import Any
from backend.app.database.mongodb import resources_collection


class TransportResponseAgent:
    """Specialized Transport Response Agent for AegisCampus AI."""

    def analyze(self, incident: dict[str, Any]) -> dict[str, Any]:
        severity = incident.get("severity", "Medium")
        location = incident.get("location", "Campus")

        # Query available transport resources from MongoDB
        available_resources = list(
            resources_collection.find(
                {
                    "type": "Transport",
                    "status": "AVAILABLE",
                },
                {"_id": 0, "id": 1, "name": 1, "type": 1},
            )
        )

        selected_resources = []
        if available_resources:
            selected_resources.append(available_resources[0]["id"])

        actions = [
            f"Clear emergency vehicle corridors leading to {location}",
            "Position campus emergency transport vehicles at designated pick-up points",
            "Prepare for rapid student and faculty shuttle assistance if full evacuation is ordered",
        ]

        return {
            "agent": "transport",
            "priority": severity,
            "recommended_actions": actions,
            "selected_resources": selected_resources,
            "reasoning": f"Transport and evacuation logistics positioned for {location}.",
            "human_approval_required": True,
        }


transport_response_agent = TransportResponseAgent()