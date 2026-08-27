from typing import Any
from backend.app.database.mongodb import resources_collection


class MedicalResponseAgent:
    """Specialized Medical Response Agent for AegisCampus AI."""

    def analyze(self, incident: dict[str, Any]) -> dict[str, Any]:
        severity = incident.get("severity", "Medium")
        affected_people = incident.get("affected_people", 1)

        # Query real available medical resources from MongoDB
        available_resources = list(
            resources_collection.find(
                {
                    "type": {"$in": ["Medical", "First Aid"]},
                    "status": "AVAILABLE",
                },
                {"_id": 0, "id": 1, "name": 1, "type": 1},
            )
        )

        selected_resources = []
        # Prefer an ambulance if severe, and/or first aid unit
        for res in available_resources:
            if severity in ["Critical", "High"] and res["type"] == "Medical" and "AMB" in res["id"]:
                if res["id"] not in selected_resources:
                    selected_resources.append(res["id"])
                    break

        for res in available_resources:
            if res["type"] == "First Aid" and res["id"] not in selected_resources:
                selected_resources.append(res["id"])
                break

        # Fallback if specific type matching was sparse
        if not selected_resources and available_resources:
            selected_resources.append(available_resources[0]["id"])

        actions = [
            "Prepare campus medical triage and trauma readiness",
            "Dispatch emergency medical personnel and first aid kits to the site",
            "Coordinate with nearby district hospital for casualty transfer if required",
        ]

        triage_level = "Immediate" if severity in ["Critical", "High"] else "Delayed"

        return {
            "agent": "medical",
            "priority": severity,
            "triage_level": triage_level,
            "recommended_actions": actions,
            "selected_resources": selected_resources,
            "estimated_patients": max(1, affected_people),
            "reasoning": f"Medical response initiated for {severity.lower()} emergency to stabilize potential casualties.",
            "human_approval_required": True,
        }


medical_response_agent = MedicalResponseAgent()