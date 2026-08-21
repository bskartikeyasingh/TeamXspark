import json
import os
from typing import Any

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


class IncidentIntelligenceAgent:
    """
    Incident Intelligence Agent.

    Responsibilities:
    - Understand emergency descriptions.
    - Classify incident type.
    - Assess severity.
    - Extract location.
    - Estimate affected people.
    - Produce a concise operational summary.
    """

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is missing. "
                "Add it to backend/.env."
            )

        self.client = Groq(api_key=api_key)

        self.model = "llama-3.3-70b-versatile"

    def analyze(
        self,
        description: str,
        location: str | None = None,
    ) -> dict[str, Any]:

        location_text = location or "Not explicitly provided"

        system_prompt = """
You are the Incident Intelligence Agent for AegisCampus AI,
a campus emergency response coordination system.

Your job is to analyze emergency reports and return structured
operational information for downstream emergency-response agents.

Classify the incident into exactly one of:

- Fire
- Medical
- Security
- Severe Weather
- Accident
- Crowd
- Infrastructure
- Other

Classify severity as exactly one of:

- Critical
- High
- Medium
- Low

Rules:

Critical:
Immediate threat to life, fire, major security threat,
multiple people potentially trapped or severely injured.

High:
Serious emergency requiring rapid response.

Medium:
Emergency requiring coordinated response but with limited
immediate danger.

Low:
Minor incident with limited immediate risk.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "incident_type": "string",
  "severity": "string",
  "location": "string",
  "affected_people": 0,
  "confidence": 0,
  "summary": "string"
}

confidence must be an integer from 0 to 100.

affected_people must be a non-negative integer.

If the number of affected people is not known, estimate
conservatively based on the description.

Do not invent precise information that is not supported
by the report.
"""

        user_prompt = f"""
Emergency report:

{description}

Reported location:

{location_text}

Analyze this incident now.
"""

        completion = self.client.chat.completions.create(
            model=self.model,
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
            max_tokens=500,
        )

        content = completion.choices[0].message.content

        if not content:
            raise RuntimeError(
                "Groq returned an empty response."
            )

        return self._parse_response(content)

    @staticmethod
    def _parse_response(content: str) -> dict[str, Any]:
        cleaned = content.strip()

        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "")
            cleaned = cleaned.replace("```", "")
            cleaned = cleaned.strip()

        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"AI returned invalid JSON: {content}"
            ) from exc

        required_fields = {
            "incident_type",
            "severity",
            "location",
            "affected_people",
            "confidence",
            "summary",
        }

        missing_fields = required_fields - result.keys()

        if missing_fields:
            raise RuntimeError(
                "AI response is missing fields: "
                + ", ".join(sorted(missing_fields))
            )

        result["confidence"] = max(
            0,
            min(100, int(result["confidence"])),
        )

        result["affected_people"] = max(
            0,
            int(result["affected_people"]),
        )

        return result


incident_intelligence_agent = IncidentIntelligenceAgent()