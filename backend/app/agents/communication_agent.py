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
# Communication Response Agent
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class CommunicationResponseAgent:

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
    # ANALYZE COMMUNICATION RESPONSE
    # ========================================================

    def analyze(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        available_resources = (
            resource_service.find_resources_for_agent(
                "communication"
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
You are the Communication Response Agent
of AegisCampus AI.

Your responsibility is to coordinate emergency
communication during campus incidents.

============================================================
COMMUNICATION RESPONSIBILITIES
============================================================

You can recommend:

- Campus emergency alerts
- Student notifications
- Staff notifications
- Security team communication
- Emergency briefings
- Evacuation announcements
- Shelter-in-place announcements
- Incident status updates
- Command-center briefings

============================================================
COMMUNICATION PRINCIPLES
============================================================

Emergency communication must be:

- Clear
- Short
- Action-oriented
- Calm
- Accurate
- Location-specific

Never create unnecessary panic.

Never state unverified information as fact.

Never invent casualty numbers.

Never invent emergency resources.

============================================================
PUBLIC ALERTS
============================================================

Critical or high-severity incidents may require
a campus-wide alert.

The alert should clearly communicate:

1. What happened
2. Where it happened
3. What people should do
4. What people should avoid

============================================================
HUMAN APPROVAL
============================================================

Human approval is required before:

- Campus-wide emergency alerts
- Evacuation announcements
- Shelter-in-place announcements
- Public incident statements

============================================================
RESOURCE RULES
============================================================

Only use communication resources present in:

AVAILABLE COMMUNICATION RESOURCES

Do not select busy resources.

Never invent resource IDs.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly:

{
    "agent": "communication",
    "priority": "Critical",
    "recommended_actions": [
        "Prepare campus emergency alert",
        "Notify security and emergency response teams",
        "Prepare emergency briefing for command center"
    ],
    "selected_resources": [
        "COM-001",
        "COM-002"
    ],
    "alert_required": true,
    "alert_message": "Emergency reported at Block C. Avoid the affected area and follow campus security instructions.",
    "audience": [
        "students",
        "faculty",
        "staff",
        "security",
        "emergency_responders"
    ],
    "reasoning": "Critical incident requires coordinated emergency communication.",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency.

INCIDENT:

{incident_json}

AVAILABLE COMMUNICATION RESOURCES:

{resources_json}

Prepare the appropriate emergency communication response.

Do not select busy resources.

Do not invent information.

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
                max_completion_tokens=900,
            )

        except Exception as exc:

            raise RuntimeError(
                f"Communication Agent AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:

            raise RuntimeError(
                "Communication Agent returned empty response."
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
                "Communication Agent returned invalid JSON.\n"
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

        result["agent"] = "communication"

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

        result["alert_required"] = bool(
            result.get(
                "alert_required",
                False,
            )
        )

        result["alert_message"] = str(
            result.get(
                "alert_message",
                "",
            )
        )

        audience = result.get(
            "audience",
            [],
        )

        if not isinstance(
            audience,
            list,
        ):

            audience = []

        result["audience"] = [
            str(group)
            for group in audience
        ]

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
# SHARED COMMUNICATION AGENT
# ============================================================

communication_response_agent = (
    CommunicationResponseAgent()
)