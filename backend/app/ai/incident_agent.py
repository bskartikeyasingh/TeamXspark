import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq


# ============================================================
# AegisCampus AI
# Incident Intelligence Agent
# ============================================================

# File:
# backend/app/ai/incident_agent.py
#
# Environment:
# backend/.env

BACKEND_DIR = Path(__file__).resolve().parents[2]

ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    dotenv_path=ENV_FILE,
    override=True,
)


class IncidentIntelligenceAgent:

    MODEL = "openai/gpt-oss-120b"

    ALLOWED_INCIDENT_TYPES = {
        "Fire",
        "Medical",
        "Security",
        "Severe Weather",
        "Accident",
        "Crowd",
        "Infrastructure",
        "Other",
    }

    ALLOWED_SEVERITIES = {
        "Critical",
        "High",
        "Medium",
        "Low",
    }

    def __init__(self):

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:

            raise RuntimeError(
                "GROQ_API_KEY is missing.\n"
                f"Expected environment file: {ENV_FILE}\n"
                f"File exists: {ENV_FILE.exists()}"
            )

        self.client = Groq(
            api_key=api_key
        )

    def analyze(
        self,
        description: str,
        location: str | None = None,
    ) -> dict[str, Any]:

        if not description or not description.strip():
            raise ValueError(
                "Emergency description cannot be empty."
            )

        reported_location = (
            location.strip()
            if location
            else "Not explicitly provided"
        )

        system_prompt = """
You are the Incident Intelligence Agent of AegisCampus AI.

AegisCampus AI is a university emergency command and
coordination platform.

Analyze emergency reports and convert them into structured
operational intelligence for downstream emergency agents.

You are NOT the final authority.

Incident types:

Fire
Medical
Security
Severe Weather
Accident
Crowd
Infrastructure
Other

Severity levels:

Critical:
Immediate threat to life, major fire, people trapped,
multiple casualties, active violent threat, or major
infrastructure danger.

High:
Serious emergency requiring rapid response.

Medium:
Emergency requiring coordinated response with limited
immediate danger.

Low:
Minor incident with limited immediate risk.

Use the reported location when available.

Do not invent a precise location.

Return affected_people as a non-negative integer.

Return confidence as an integer from 0 to 100.

Return a concise operational summary.

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

The response must contain exactly:

{
    "incident_type": "Fire",
    "severity": "Critical",
    "location": "Block C - 2nd Floor",
    "affected_people": 25,
    "confidence": 95,
    "summary": "Fire with possible trapped students requiring immediate emergency response."
}
"""

        user_prompt = f"""
Analyze this campus emergency report.

EMERGENCY REPORT:
{description}

REPORTED LOCATION:
{reported_location}

Return the required JSON.
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
                f"Groq API request failed: {exc}"
            ) from exc

        content = (
            response
            .choices[0]
            .message
            .content
        )

        if not content:
            raise RuntimeError(
                "Groq returned an empty response."
            )

        return self._parse_response(content)

    @classmethod
    def _parse_response(
        cls,
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
                "AI returned invalid JSON.\n"
                f"Raw response:\n{content}"
            ) from exc

        required_fields = {
            "incident_type",
            "severity",
            "location",
            "affected_people",
            "confidence",
            "summary",
        }

        missing_fields = (
            required_fields - result.keys()
        )

        if missing_fields:

            raise RuntimeError(
                "AI response is missing fields: "
                + ", ".join(
                    sorted(missing_fields)
                )
            )

        incident_type = str(
            result["incident_type"]
        ).strip()

        if incident_type not in cls.ALLOWED_INCIDENT_TYPES:
            incident_type = "Other"

        result["incident_type"] = incident_type

        severity = str(
            result["severity"]
        ).strip()

        if severity not in cls.ALLOWED_SEVERITIES:
            severity = "Medium"

        result["severity"] = severity

        result["location"] = str(
            result["location"]
        ).strip()

        try:
            affected_people = int(
                result["affected_people"]
            )
        except (TypeError, ValueError):
            affected_people = 0

        result["affected_people"] = max(
            0,
            affected_people,
        )

        try:
            confidence = int(
                result["confidence"]
            )
        except (TypeError, ValueError):
            confidence = 50

        result["confidence"] = max(
            0,
            min(
                100,
                confidence,
            ),
        )

        result["summary"] = str(
            result["summary"]
        ).strip()

        return result


incident_intelligence_agent = (
    IncidentIntelligenceAgent()
)