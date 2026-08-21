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
# Medical Response Agent
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class MedicalResponseAgent:

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
    # ANALYZE MEDICAL RESPONSE
    # ========================================================

    def analyze(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        available_resources = (
            resource_service.find_resources_for_agent(
                "medical"
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
You are the Medical Response Agent
of AegisCampus AI.

Your job is to coordinate the medical response
for a campus emergency using only available
medical resources.

============================================================
MEDICAL RESPONSIBILITIES
============================================================

You can recommend:

- Ambulance dispatch
- First-aid deployment
- Medical triage
- Casualty assessment
- Emergency medical support
- Medical evacuation
- Coordination with campus medical center

============================================================
SAFETY RULES
============================================================

Prioritize human life and immediate medical needs.

Do not provide detailed medical diagnosis.

Do not invent medical resources.

Do not select resources marked busy.

Do not exceed the available capacity of resources.

============================================================
RESOURCE RULES
============================================================

Only select resources from:

AVAILABLE MEDICAL RESOURCES

Never invent resource IDs.

============================================================
HUMAN APPROVAL
============================================================

Human approval is required for:

- Ambulance dispatch
- Medical evacuation
- Critical incidents
- High severity incidents

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly:

{
    "agent": "medical",
    "priority": "Critical",
    "triage_level": "Immediate",
    "recommended_actions": [
        "Dispatch available ambulance",
        "Deploy first-aid unit",
        "Prepare medical center for incoming casualties"
    ],
    "selected_resources": [
        "AMB-001",
        "FAU-001"
    ],
    "estimated_patients": 25,
    "reasoning": "Critical fire incident with potentially trapped students requires immediate medical readiness.",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency.

INCIDENT:

{incident_json}

AVAILABLE MEDICAL RESOURCES:

{resources_json}

Select appropriate available medical resources.

Do not select busy resources.

Return ONLY valid JSON.
"""

        # ----------------------------------------------------
        # Call Groq
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
                f"Medical Agent AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:

            raise RuntimeError(
                "Medical Agent returned empty response."
            )

        # ----------------------------------------------------
        # IMPORTANT:
        # Pass incident into parser because the parser uses
        # affected_people as a fallback.
        # ----------------------------------------------------

        return self._parse_response(
            content=content,
            available_resources=available_resources,
            incident=incident,
        )

    # ========================================================
    # PARSE RESPONSE
    # ========================================================

    def _parse_response(
        self,
        content: str,
        available_resources: list[dict[str, Any]],
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        cleaned = content.strip()

        # ----------------------------------------------------
        # Remove Markdown code fences if the AI returns them
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Parse JSON
        # ----------------------------------------------------

        try:

            result = json.loads(
                cleaned
            )

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "Medical Agent returned invalid JSON.\n"
                f"Raw response:\n{content}"
            ) from exc

        # ----------------------------------------------------
        # Validate available resources
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Agent
        # ----------------------------------------------------

        result["agent"] = "medical"

        # ----------------------------------------------------
        # Priority
        # ----------------------------------------------------

        result["priority"] = str(
            result.get(
                "priority",
                incident.get(
                    "severity",
                    "Medium",
                ),
            )
        )

        # ----------------------------------------------------
        # Triage level
        # ----------------------------------------------------

        result["triage_level"] = str(
            result.get(
                "triage_level",
                "Routine",
            )
        )

        # ----------------------------------------------------
        # Recommended actions
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Estimated patients
        # ----------------------------------------------------

        try:

            estimated_patients = int(
                result.get(
                    "estimated_patients",
                    incident.get(
                        "affected_people",
                        0,
                    ),
                )
            )

        except (
            TypeError,
            ValueError,
        ):

            estimated_patients = int(
                incident.get(
                    "affected_people",
                    0,
                )
            )

        result["estimated_patients"] = max(
            0,
            estimated_patients,
        )

        # ----------------------------------------------------
        # Reasoning
        # ----------------------------------------------------

        result["reasoning"] = str(
            result.get(
                "reasoning",
                "",
            )
        )

        # ----------------------------------------------------
        # Human approval
        # ----------------------------------------------------

        result["human_approval_required"] = bool(
            result.get(
                "human_approval_required",
                True,
            )
        )

        return result


# ============================================================
# SHARED MEDICAL AGENT
# ============================================================

medical_response_agent = (
    MedicalResponseAgent()
)