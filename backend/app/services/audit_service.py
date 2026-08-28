from datetime import datetime, timezone
from typing import Any

from backend.app.database.mongodb import (
    audit_logs_collection,
)


class AuditService:
    def __init__(self):
        self.events: list[dict[str, Any]] = []

    def record_event(
        self,
        incident_id: str,
        event_type: str,
        message: str,
        actor: str = "System",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        last_event = audit_logs_collection.find_one(
            {},
            sort=[("created_at", -1)],
        )

        if last_event and last_event.get("event_id"):
            try:
                last_number = int(last_event["event_id"].split("-")[1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1

        event_id = f"AUD-{next_number:05d}"
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        event = {
            "event_id": event_id,
            "incident_id": incident_id,
            "event_type": event_type,
            "message": message,
            "actor": actor,
            "timestamp": now_iso,
            "created_at": now_iso,
            "metadata": metadata if metadata is not None else {},
        }

        self.events.append(event)

        try:
            audit_logs_collection.insert_one(event.copy())
        except Exception as exc:
            print("MongoDB audit log error:", exc)

        return event

    def record_incident_created(
        self,
        incident_id: str,
        incident: dict[str, Any],
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="INCIDENT_CREATED",
            message="Emergency incident received by AegisCampus AI.",
            actor="Incident Intake",
            metadata={
                "incident_type": incident.get("incident_type"),
                "severity": incident.get("severity"),
                "location": incident.get("location"),
            },
        )

    def record_ai_analysis(
        self,
        incident_id: str,
        analysis: dict[str, Any],
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="AI_ANALYSIS",
            message="Incident Intelligence Agent completed analysis.",
            actor="Incident Intelligence Agent",
            metadata={
                "incident_type": analysis.get("incident_type"),
                "severity": analysis.get("severity"),
                "confidence": analysis.get("confidence"),
                "affected_people": analysis.get("affected_people"),
            },
        )

    def record_agents_activated(
        self,
        incident_id: str,
        agents: list[str],
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="AGENTS_ACTIVATED",
            message="Emergency Orchestrator activated specialized response agents.",
            actor="Emergency Orchestrator",
            metadata={
                "agents": agents,
            },
        )

    def record_resource_recommendation(
        self,
        incident_id: str,
        resources: list[str],
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="RESOURCES_RECOMMENDED",
            message="AI agents recommended emergency response resources.",
            actor="Multi-Agent System",
            metadata={
                "resources": resources,
            },
        )

    def record_approval_requested(
        self,
        incident_id: str,
        approval_id: str,
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="APPROVAL_REQUESTED",
            message="Human approval required before high-impact emergency actions.",
            actor="Emergency Command System",
            metadata={
                "approval_id": approval_id,
            },
        )

    def record_approval(
        self,
        incident_id: str,
        approval_id: str,
        approved_by: str,
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="APPROVED",
            message="Emergency response plan approved by authorized commander.",
            actor=approved_by,
            metadata={
                "approval_id": approval_id,
            },
        )

    def record_rejection(
        self,
        incident_id: str,
        approval_id: str,
        rejected_by: str,
        reason: str,
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="REJECTED",
            message="Emergency response plan rejected by authorized commander.",
            actor=rejected_by,
            metadata={
                "approval_id": approval_id,
                "reason": reason,
            },
        )

    def record_resource_dispatch(
        self,
        incident_id: str,
        resources: list[str],
        actor: str = "Emergency Command System",
    ) -> dict[str, Any]:
        return self.record_event(
            incident_id=incident_id,
            event_type="RESOURCES_DISPATCHED",
            message="Approved emergency resources were dispatched.",
            actor=actor,
            metadata={
                "resources": resources,
            },
        )

    def get_incident_events(
        self,
        incident_id: str,
    ) -> list[dict[str, Any]]:
        try:
            events = list(
                audit_logs_collection.find(
                    {"incident_id": incident_id},
                    {"_id": 0},
                ).sort("created_at", 1)
            )
            if events:
                return events
        except Exception:
            pass
        return [
            event for event in self.events if event.get("incident_id") == incident_id
        ]

    def get_all_events(
        self,
    ) -> list[dict[str, Any]]:
        try:
            return list(
                audit_logs_collection.find({}, {"_id": 0}).sort("created_at", -1)
            )
        except Exception:
            return self.events.copy()

    def clear_events(self) -> None:
        self.events.clear()


audit_service = AuditService()