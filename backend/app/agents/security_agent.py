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
# Security Response Agent
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class SecurityResponseAgent:

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
    # ANALYZE SECURITY RESPONSE
    # ========================================================

    def analyze(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        available_resources = (
            resource_service.find_resources_for_agent(
                "security"
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

        system_prompt = """
You are the Security Response Agent
of AegisCampus AI.

Your job is to determine the appropriate security
response for a campus emergency.

You coordinate available campus security teams.

============================================================
SECURITY RESPONSIBILITIES
============================================================

You can recommend:

- Perimeter establishment
- Crowd control
- Evacuation management
- Access control
- Emergency route clearance
- Protection of emergency responders
- Threat containment
- Restricted-area enforcement
- Security monitoring

============================================================
SAFETY RULES
============================================================

Never recommend dangerous confrontation.

Never instruct security personnel to physically
confront a potentially armed person.

Prioritize:

1. Human safety
2. Evacuation
3. Emergency responder access
4. Perimeter control
5. Communication

============================================================
RESOURCE RULES
============================================================

Only recommend resources that are present in the
AVAILABLE SECURITY RESOURCES list.

Do not invent security teams.

Do not assign resources that are marked busy.

============================================================
HUMAN APPROVAL
============================================================

Human approval is required for:

- Critical incidents
- High severity incidents
- Security escalation
- Evacuation
- Restricted-area enforcement

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{
    "agent": "security",
    "priority": "Critical",
    "recommended_actions": [
        "Establish a security perimeter",
        "Control evacuation routes",
        "Keep emergency access routes clear"
    ],
    "selected_resources": [
        "SEC-001",
        "SEC-002"
    ],
    "personnel_count": 11,
    "reasoning": "Critical fire requires immediate perimeter control and evacuation coordination.",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency.

INCIDENT:

{incident_json}

AVAILABLE SECURITY RESOURCES:

{resources_json}

Select appropriate available security resources.

Do not select busy resources.

Return ONLY valid JSON.
"""

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
                f"Security Agent AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:

            raise RuntimeError(
                "Security Agent returned empty response."
            )

        return self._parse_response(
            content,
            available_resources,
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

        if cleaned.startswith("```json"):

            cleaned = cleaned[
                len("```json"):
            ]

        elif cleaned.startswith("```"):

            cleaned = cleaned[
                len("```"):
            ]

        if cleaned.endswith("```"):

            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:

            result = json.loads(
                cleaned
            )

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "Security Agent returned invalid JSON."
            ) from exc

        available_ids = {
            resource["id"]
            for resource in available_resources
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
            for resource_id in selected_resources
            if resource_id in available_ids
        ]

        result["selected_resources"] = (
            selected_resources
        )

        personnel_count = 0

        for resource in available_resources:

            if resource["id"] in selected_resources:

                personnel_count += int(
                    resource.get(
                        "capacity",
                        0,
                    )
                )

        result["personnel_count"] = (
            personnel_count
        )

        result["agent"] = "security"

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
# SHARED SECURITY AGENT
# ============================================================

security_response_agent = (
    SecurityResponseAgent()
)