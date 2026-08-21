import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq

from backend.app.services.resource_service import (
    resource_service,
)


# ============================================================
# AegisCampus AI
# Transport Response Agent
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class TransportResponseAgent:

    MODEL = "openai/gpt-oss-120b"

    def __init__(self):

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is missing."
            )

        self.client = Groq(
            api_key=api_key
        )

    # ========================================================
    # ANALYZE TRANSPORT RESPONSE
    # ========================================================

    def analyze(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        available_resources = (
            resource_service.find_resources_for_agent(
                "transport"
            )
        )

        # ----------------------------------------------------
        # Also check available ambulances.
        #
        # Ambulances belong to the medical category because
        # they are medical resources, but transport response
        # may need to coordinate them.
        # ----------------------------------------------------

        available_ambulances = (
            resource_service.find_resources_for_agent(
                "medical"
            )
        )

        transport_resources = (
            available_resources
            + [
                resource
                for resource
                in available_ambulances
                if resource["type"] == "ambulance"
            ]
        )

        # ----------------------------------------------------
        # Remove duplicates
        # ----------------------------------------------------

        unique_resources = {}

        for resource in transport_resources:

            unique_resources[
                resource["id"]
            ] = resource

        transport_resources = list(
            unique_resources.values()
        )

        resources_json = json.dumps(
            transport_resources,
            indent=2,
        )

        incident_json = json.dumps(
            incident,
            indent=2,
        )

        # ----------------------------------------------------
        # AI instructions
        # ----------------------------------------------------

        system_prompt = """
You are the Transport Response Agent
of AegisCampus AI.

Your responsibility is to coordinate emergency
transport resources during campus incidents.

============================================================
TRANSPORT RESPONSIBILITIES
============================================================

You can recommend:

- Ambulance dispatch
- Emergency vehicle dispatch
- Emergency access route clearance
- Transport coordination
- Patient transportation
- Responder transportation
- Vehicle staging
- Emergency pickup points

============================================================
SAFETY RULES
============================================================

Always prioritize:

1. Human safety
2. Emergency responder access
3. Fast medical transport
4. Clear emergency routes

Do not recommend unsafe driving.

Do not recommend sending vehicles through
known hazardous areas.

Do not invent vehicles or ambulances.

============================================================
RESOURCE RULES
============================================================

Only select resources from the
AVAILABLE TRANSPORT RESOURCES list.

Do not select resources marked busy.

Never invent resource IDs.

============================================================
FIRE RESPONSE
============================================================

For a critical fire:

- Prioritize ambulance availability
- Keep emergency access clear
- Stage emergency vehicles safely
- Support evacuation transportation if needed

============================================================
HUMAN APPROVAL
============================================================

Human approval is required for:

- Ambulance dispatch
- Emergency vehicle dispatch
- Critical incidents
- High severity incidents
- Major evacuation transportation

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly:

{
    "agent": "transport",
    "priority": "Critical",
    "recommended_actions": [
        "Dispatch available ambulance",
        "Stage emergency vehicle near a safe access point",
        "Keep emergency access route clear"
    ],
    "selected_resources": [
        "AMB-001",
        "VEH-001"
    ],
    "transport_mode": "Emergency medical transport",
    "estimated_response_time": "3-5 minutes",
    "reasoning": "Critical fire incident requires immediate ambulance and emergency vehicle coordination.",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency.

INCIDENT:

{incident_json}

AVAILABLE TRANSPORT RESOURCES:

{resources_json}

Select appropriate available transport resources.

Do not select busy resources.

Return ONLY valid JSON.
"""

        # ----------------------------------------------------
        # GROQ REQUEST
        # ----------------------------------------------------

        try:

            response = self.client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                temperature=0.1,
                max_completion_tokens=800,
            )

        except Exception as exc:

            raise RuntimeError(
                f"Transport Agent AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:

            raise RuntimeError(
                "Transport Agent returned empty response."
            )

        return self._parse_response(
            content=content,
            available_resources=transport_resources,
        )

    # ========================================================
    # PARSE RESPONSE
    # ========================================================

    def _parse_response(
        self,
        content: str,
        available_resources: list[dict[str, Any]],
    ) -> dict[str, Any]:

        cleaned = content.strip()

        # ----------------------------------------------------
        # Remove Markdown code fences
        # ----------------------------------------------------

        if cleaned.startswith(
            "```json"
        ):

            cleaned = cleaned[
                len("```json"):
            ]

        elif cleaned.startswith(
            "```"
        ):

            cleaned = cleaned[
                len("```"):
            ]

        if cleaned.endswith(
            "```"
        ):

            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        try:

            result = json.loads(
                cleaned
            )

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "Transport Agent returned invalid JSON.\n"
                f"Raw response:\n{content}"
            ) from exc

        # ----------------------------------------------------
        # Validate resource IDs
        # ----------------------------------------------------

        available_ids = {
            resource["id"]
            for resource
            in available_resources
        }

        selected_resources = result.get(
            "selected_resources",
            [],
        )

        if not isinstance(
            selected_resources,
            list,
        ):

            selected_resources = []

        selected_resources = [
            resource_id
            for resource_id
            in selected_resources
            if resource_id in available_ids
        ]

        result["selected_resources"] = (
            selected_resources
        )

        # ----------------------------------------------------
        # Normalize fields
        # ----------------------------------------------------

        result["agent"] = "transport"

        result["priority"] = str(
            result.get(
                "priority",
                "Medium",
            )
        )

        recommended_actions = result.get(
            "recommended_actions",
            [],
        )

        if not isinstance(
            recommended_actions,
            list,
        ):

            recommended_actions = []

        result["recommended_actions"] = [
            str(action)
            for action in recommended_actions
        ]

        result["transport_mode"] = str(
            result.get(
                "transport_mode",
                "Emergency transport",
            )
        )

        result["estimated_response_time"] = str(
            result.get(
                "estimated_response_time",
                "Unknown",
            )
        )

        result["reasoning"] = str(
            result.get(
                "reasoning",
                "",
            )
        )

        result["human_approval_required"] = bool(
            result.get(
                "human_approval_required",
                True,
            )
        )

        return result


# ============================================================
# SHARED TRANSPORT AGENT
# ============================================================

transport_response_agent = (
    TransportResponseAgent()
)