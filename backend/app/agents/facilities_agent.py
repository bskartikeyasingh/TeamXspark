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
# Facilities Response Agent
# ============================================================


BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class FacilitiesResponseAgent:

    MODEL = "openai/gpt-oss-120b"

    def __init__(self):

        api_key = os.getenv(
            "GROQ_API_KEY"
        )

        if not api_key:

            raise RuntimeError(
                "GROQ_API_KEY is missing."
            )

        self.client = Groq(
            api_key=api_key
        )

    # ========================================================
    # ANALYZE FACILITIES RESPONSE
    # ========================================================

    def analyze(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        available_resources = (
            resource_service.find_resources_for_agent(
                "facilities"
            )
        )

        resources_json = json.dumps(
            available_resources,
            indent=2,
        )

        incident_json = json.dumps(
            incident,
            indent=2,
        )

        # ----------------------------------------------------
        # AI SYSTEM PROMPT
        # ----------------------------------------------------

        system_prompt = """
You are the Facilities Response Agent
of AegisCampus AI.

Your responsibility is to coordinate campus
facilities and infrastructure resources during
an emergency.

============================================================
FACILITIES RESPONSIBILITIES
============================================================

You can recommend:

- Fire safety response
- Building inspection
- Fire suppression support
- Power isolation
- Utility isolation
- HVAC shutdown
- Hazardous-area restriction
- Building access restriction
- Emergency equipment deployment
- Structural safety assessment
- Support for emergency responders

============================================================
FIRE INCIDENT
============================================================

For a fire:

1. Support fire safety response.
2. Restrict access to the affected area.
3. Support emergency responders.
4. Assess building safety.
5. Recommend utility isolation when appropriate.
6. Do not send people into unsafe areas.

============================================================
SAFETY RULES
============================================================

Never recommend sending personnel into a
clearly dangerous area.

Do not provide dangerous technical instructions.

Prioritize:

1. Human safety
2. Emergency responder access
3. Isolation of hazards
4. Building safety
5. Infrastructure recovery

============================================================
RESOURCE RULES
============================================================

Only select resources from:

AVAILABLE FACILITIES RESOURCES

Do not invent resources.

Do not select resources marked busy.

============================================================
HUMAN APPROVAL
============================================================

Human approval is required for:

- Critical incidents
- High severity incidents
- Power isolation
- Utility shutdown
- Major building access restrictions
- Structural safety actions

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{
    "agent": "facilities",
    "priority": "Critical",
    "recommended_actions": [
        "Deploy fire safety response team",
        "Restrict access to affected building area",
        "Assess building safety for emergency responders"
    ],
    "selected_resources": [
        "FAC-001",
        "FAC-002"
    ],
    "reasoning": "Fire in Block C requires immediate facilities and fire safety coordination.",
    "hazard_status": "Active fire hazard",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency.

INCIDENT:

{incident_json}

AVAILABLE FACILITIES RESOURCES:

{resources_json}

Select appropriate available facilities resources.

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
                f"Facilities Agent AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:

            raise RuntimeError(
                "Facilities Agent returned empty response."
            )

        return self._parse_response(
            content=content,
            available_resources=available_resources,
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
                "Facilities Agent returned invalid JSON.\n"
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
            if resource_id
            in available_ids
        ]

        result["selected_resources"] = (
            selected_resources
        )

        # ----------------------------------------------------
        # Normalize fields
        # ----------------------------------------------------

        result["agent"] = "facilities"

        result["priority"] = str(
            result.get(
                "priority",
                "Medium",
            )
        )

        recommended_actions = (
            result.get(
                "recommended_actions",
                [],
            )
        )

        if not isinstance(
            recommended_actions,
            list,
        ):

            recommended_actions = []

        result["recommended_actions"] = [
            str(action)
            for action
            in recommended_actions
        ]

        result["reasoning"] = str(
            result.get(
                "reasoning",
                "",
            )
        )

        result["hazard_status"] = str(
            result.get(
                "hazard_status",
                "Unknown",
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
# SHARED FACILITIES AGENT
# ============================================================

facilities_response_agent = (
    FacilitiesResponseAgent()
)