import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq


# ============================================================
# AegisCampus AI - Emergency Orchestrator Agent
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    ENV_FILE,
    override=True,
)


class EmergencyOrchestratorAgent:

    MODEL = "openai/gpt-oss-120b"

    VALID_AGENTS = {
        "security",
        "medical",
        "facilities",
        "transport",
        "communication",
    }

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
    # CREATE RESPONSE PLAN
    # ========================================================

    def create_response_plan(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        incident_json = json.dumps(
            incident,
            indent=2,
        )

        system_prompt = """
You are the Emergency Orchestrator Agent
for AegisCampus AI.

Your responsibility is to determine which specialized
emergency response agents should be activated.

Available agents:

security
medical
facilities
transport
communication

SECURITY handles:
- Crowd control
- Perimeter security
- Evacuation control
- Threat containment
- Access control

MEDICAL handles:
- First aid
- Ambulance coordination
- Casualty assessment
- Medical triage

FACILITIES handles:
- Fire systems
- Buildings
- Power
- Utilities
- Infrastructure safety

TRANSPORT handles:
- Ambulances
- Campus vehicles
- Emergency transport
- Vehicle routing

COMMUNICATION handles:
- Emergency notifications
- Campus alerts
- Student/staff communication
- Emergency briefings

Typical agent selection:

Fire:
security, medical, facilities, transport, communication

Medical:
medical, transport, communication

Security:
security, communication

Severe Weather:
security, facilities, transport, communication

Accident:
medical, security, transport, communication

Crowd:
security, medical, communication

Infrastructure:
facilities, security, communication

Human approval is required for:
- Critical incidents
- High severity incidents
- Evacuation
- Medical dispatch
- Security escalation
- Public emergency alerts
- Major infrastructure actions

Return ONLY valid JSON.

Return exactly:

{
    "activated_agents": [
        "security",
        "medical",
        "facilities",
        "transport",
        "communication"
    ],
    "priority": "Critical",
    "coordination_summary": "Immediate multi-team emergency response required.",
    "human_approval_required": true
}
"""

        user_prompt = f"""
Analyze this campus emergency:

{incident_json}

Determine which specialized agents should be activated.

Return ONLY JSON.
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
                max_completion_tokens=600,
            )

        except Exception as exc:

            raise RuntimeError(
                f"Orchestrator AI request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:
            raise RuntimeError(
                "Orchestrator returned empty response."
            )

        return self._parse_response(content)

    # ========================================================
    # PARSE RESPONSE
    # ========================================================

    def _parse_response(
        self,
        content: str,
    ) -> dict[str, Any]:

        cleaned = content.strip()

        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json"):]

        elif cleaned.startswith("```"):
            cleaned = cleaned[len("```"):]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        cleaned = cleaned.strip()

        try:

            result = json.loads(cleaned)

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "Orchestrator returned invalid JSON."
            ) from exc

        activated_agents = result.get(
            "activated_agents",
            [],
        )

        if not isinstance(
            activated_agents,
            list,
        ):
            activated_agents = []

        activated_agents = [
            agent
            for agent in activated_agents
            if agent in self.VALID_AGENTS
        ]

        result["activated_agents"] = (
            activated_agents
        )

        result["priority"] = str(
            result.get(
                "priority",
                "Medium",
            )
        )

        result["coordination_summary"] = str(
            result.get(
                "coordination_summary",
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
# SHARED ORCHESTRATOR INSTANCE
# ============================================================

emergency_orchestrator = EmergencyOrchestratorAgent()