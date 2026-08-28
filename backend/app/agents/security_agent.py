from typing import Any
from backend.app.database.mongodb import resources_collection


class SecurityResponseAgent:
    """Specialized Security Response Agent for AegisCampus AI."""

    def analyze(self, incident: dict[str, Any]) -> dict[str, Any]:
        severity = incident.get("severity", "Medium")
        location = incident.get("location", "Campus")

        # Query available security resources from MongoDB
        available_resources = list(
            resources_collection.find(
                {
                    "type": "Security",
                    "status": "AVAILABLE",
                },
                {"_id": 0, "id": 1, "name": 1, "type": 1},
            )
        )

        selected_resources = []
        # Assign up to 2 security units depending on severity
        count_needed = 2 if severity in ["Critical", "High"] else 1
        for res in available_resources[:count_needed]:
            selected_resources.append(res["id"])

        actions = [
            f"Establish security perimeter and restrict access around {location}",
            "Coordinate evacuation route monitoring and student guiding",
            "Maintain radio communication with central command center",
        ]

        return {
            "agent": "security",
            "priority": severity,
            "recommended_actions": actions,
            "selected_resources": selected_resources,
            "reasoning": f"Security perimeter and traffic control assigned for {severity.lower()} emergency at {location}.",
            "human_approval_required": True,
        }


security_response_agent = SecurityResponseAgent()