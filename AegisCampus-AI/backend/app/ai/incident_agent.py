import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("incident_agent")

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(
    dotenv_path=ENV_FILE,
    override=True,
)


class IncidentIntelligenceAgent:
    """Token-efficient, robust Incident Intelligence Agent.
    
    Uses a concise structured prompt with Groq to minimize token usage (<350 tokens)
    and includes a deterministic rule-based fallback if the API is unavailable or rate limited.
    """

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
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Groq client init failed: {e}. Will use deterministic fallback.")

    def _normalize_location(self, raw_location: str | None) -> str:
        if not raw_location or not str(raw_location).strip():
            return "General Campus"
        val = str(raw_location).lower().strip()

        if "n block" in val or "block n" in val or val == "n":
            return "N Block"
        if "a block" in val or "block a" in val or val == "a":
            return "A Block"
        if "h block" in val or "block h" in val or val == "h":
            return "H Block"
        if "u block" in val or "block u" in val or val == "u":
            return "U Block"
        if "pharmacy" in val or "pharm" in val:
            return "Pharmacy Block"
        if "main gate" in val or "entrance" in val or "gate" in val:
            return "Main Gate"
        if "playground" in val or "ground" in val or "sports" in val:
            return "Playground"
        if "convocation" in val or "auditorium" in val or "hall" in val:
            return "Convocation Hall"

        return raw_location.strip()

    def analyze(
        self,
        description: str,
        location: str | None = None,
    ) -> dict[str, Any]:
        if not description or not description.strip():
            raise ValueError("Emergency description cannot be empty.")

        normalized_loc = self._normalize_location(location)

        start_time = time.time()

        # Try LLM analysis first if client is available
        if self.client:
            try:
                return self._analyze_with_llm(description, normalized_loc, start_time)
            except Exception as exc:
                latency_ms = int((time.time() - start_time) * 1000)
                logger.warning(
                    f"AI analysis failed ({type(exc).__name__}: {exc}) in {latency_ms}ms. "
                    "Switching to deterministic fallback."
                )

        # Deterministic fallback
        return self._deterministic_fallback(description, normalized_loc)

    def _analyze_with_llm(
        self, description: str, location: str, start_time: float
    ) -> dict[str, Any]:
        system_prompt = (
            "You are AegisCampus AI. Classify the campus emergency. Return strict JSON only:\n"
            '{"incident_type":"Fire|Medical|Security|Severe Weather|Accident|Crowd|Infrastructure|Other",'
            '"severity":"Critical|High|Medium|Low",'
            '"location":"str",'
            '"affected_people":0,'
            '"confidence":90,'
            '"summary":"concise 1-sentence summary",'
            '"recommended_actions":["action 1","action 2"],'
            '"required_resource_types":["Security"|"Medical"|"First Aid"|"Facilities"|"Transport"|"Communication"]}'
        )

        user_prompt = f"Emergency: {description}\nLocation: {location}"

        prompt_tokens_est = len(system_prompt.split()) + len(user_prompt.split())

        response = self.client.chat.completions.create(
            model=self.MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_completion_tokens=300,
        )

        latency_ms = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content or ""
        completion_tokens = len(content.split())

        logger.info(
            f"AI classification complete | Latency: {latency_ms}ms | "
            f"Prompt est tokens: {prompt_tokens_est} | Response tokens: {completion_tokens}"
        )

        return self._parse_response(content, location, description)

    def _deterministic_fallback(
        self, description: str, location: str
    ) -> dict[str, Any]:
        """Deterministic keyword-based classification ensuring 100% uptime."""
        desc_lower = description.lower()

        incident_type = "Other"
        severity = "Medium"
        affected_people = 1
        confidence = 85
        actions = []
        resource_types = []

        if any(w in desc_lower for w in ["fire", "smoke", "flame", "blast", "explosion", "burning"]):
            incident_type = "Fire"
            severity = "Critical" if any(w in desc_lower for w in ["trapped", "huge", "major", "explosion", "heavy"]) else "High"
            affected_people = 15 if severity == "Critical" else 5
            actions = ["Initiate building evacuation immediately", "Deploy fire suppression and facilities team", "Dispatch ambulance for precautionary standby", "Notify campus security"]
            resource_types = ["Facilities", "Medical", "Security", "Transport"]

        elif any(w in desc_lower for w in ["heart", "unconscious", "fainted", "bleeding", "injured", "injury", "fracture", "choking", "seizure", "ambulance", "hospital", "patient"]):
            incident_type = "Medical"
            severity = "Critical" if any(w in desc_lower for w in ["unconscious", "severe", "critical", "heavy bleeding", "cardiac", "stroke"]) else "High"
            affected_people = 1
            actions = ["Dispatch campus ambulance immediately", "Deploy nearest First Aid Unit to provide emergency stabilization", "Prepare Medical Center for incoming patient"]
            resource_types = ["Medical", "First Aid", "Transport"]

        elif any(w in desc_lower for w in ["fight", "weapon", "theft", "intruder", "assault", "violence", "threat", "gun", "knife", "trespass"]):
            incident_type = "Security"
            severity = "Critical" if any(w in desc_lower for w in ["weapon", "knife", "gun", "active", "violence"]) else "High"
            affected_people = 4
            actions = ["Dispatch campus security officers immediately", "Secure the perimeter and restrict unauthorized entry", "Broadcast security caution to nearby zones"]
            resource_types = ["Security", "Communication"]

        elif any(w in desc_lower for w in ["flood", "water leak", "water pipeline", "pipeline", "power outage", "elevator", "blackout", "structural", "roof", "wire", "short circuit", "electrical"]):
            incident_type = "Infrastructure"
            severity = "High" if any(w in desc_lower for w in ["elevator", "short circuit", "collapse"]) else "Medium"
            affected_people = 0
            actions = ["Dispatch facilities & maintenance engineers", "Isolate affected power or water systems", "Secure access to hazard area"]
            resource_types = ["Facilities", "Security"]

        elif any(w in desc_lower for w in ["stampede", "crowd", "mob", "protest", "gathering", "chaos"]):
            incident_type = "Crowd"
            severity = "High"
            affected_people = 25
            actions = ["Deploy security personnel for crowd dispersion", "Open emergency exit pathways", "Stand by First Aid personnel"]
            resource_types = ["Security", "First Aid", "Communication"]

        elif any(w in desc_lower for w in ["storm", "cyclone", "rain", "tree fallen", "lightning", "weather"]):
            incident_type = "Severe Weather"
            severity = "Medium"
            actions = ["Issue campus weather warning", "Instruct students to stay indoors", "Deploy facilities team to clear pathways"]
            resource_types = ["Communication", "Facilities"]

        elif any(w in desc_lower for w in ["crash", "accident", "vehicle", "bike", "car", "bus collision", "collision"]):
            incident_type = "Accident"
            severity = "High"
            affected_people = 2
            actions = ["Dispatch emergency response vehicle and ambulance", "Secure accident area", "Administer first aid"]
            resource_types = ["Transport", "Medical", "Security"]

        else:
            incident_type = "Other"
            severity = "Low"
            affected_people = 0
            actions = ["Security patrol to verify the reported situation", "Assess required response"]
            resource_types = ["Security"]

        norm_loc = self._normalize_location(location)
        summary = f"{severity} priority {incident_type.lower()} emergency reported at {norm_loc}."

        return {
            "incident_type": incident_type,
            "severity": severity,
            "location": norm_loc,
            "affected_people": affected_people,
            "confidence": confidence,
            "summary": summary,
            "recommended_actions": actions,
            "required_resource_types": resource_types,
        }

    def _parse_response(
        self, content: str, default_location: str, original_description: str
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
        except Exception:
            return self._deterministic_fallback(original_description, default_location)

        incident_type = str(result.get("incident_type", "Other")).strip()
        if incident_type not in self.ALLOWED_INCIDENT_TYPES:
            incident_type = "Other"

        severity = str(result.get("severity", "Medium")).strip()
        if severity not in self.ALLOWED_SEVERITIES:
            severity = "Medium"

        location = str(result.get("location", default_location)).strip() or default_location
        location = self._normalize_location(location)

        try:
            affected_people = max(0, int(result.get("affected_people", 0)))
        except (TypeError, ValueError):
            affected_people = 0

        try:
            confidence = max(0, min(100, int(result.get("confidence", 85))))
        except (TypeError, ValueError):
            confidence = 85

        summary = str(result.get("summary", "")).strip()
        if not summary:
            summary = f"{severity} {incident_type} reported at {location}."

        recommended_actions = result.get("recommended_actions", [])
        if not isinstance(recommended_actions, list) or not recommended_actions:
            recommended_actions = [f"Deploy {incident_type.lower()} response team to {location}."]

        required_resource_types = result.get("required_resource_types", [])
        if not isinstance(required_resource_types, list) or not required_resource_types:
            if incident_type == "Fire":
                required_resource_types = ["Facilities", "Medical", "Security", "Transport"]
            elif incident_type == "Medical":
                required_resource_types = ["Medical", "First Aid", "Transport"]
            elif incident_type == "Security":
                required_resource_types = ["Security", "Communication"]
            elif incident_type == "Accident":
                required_resource_types = ["Medical", "Security", "Transport"]
            else:
                required_resource_types = ["Security", "Communication"]

        return {
            "incident_type": incident_type,
            "severity": severity,
            "location": location,
            "affected_people": affected_people,
            "confidence": confidence,
            "summary": summary,
            "recommended_actions": [str(a) for a in recommended_actions],
            "required_resource_types": [str(r) for r in required_resource_types],
        }


incident_intelligence_agent = IncidentIntelligenceAgent()