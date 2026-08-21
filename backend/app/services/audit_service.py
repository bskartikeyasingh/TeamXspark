from datetime import datetime, timezone
from typing import Any


# ============================================================
# AegisCampus AI
# Audit Trail Service
# ============================================================


class AuditService:

    def __init__(self):

        self.events: list[dict[str, Any]] = []

    # ========================================================
    # RECORD EVENT
    # ========================================================

    def record_event(
        self,
        incident_id: str,
        event_type: str,
        message: str,
        actor: str = "System",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:

        event_id = (
            f"AUD-{len(self.events) + 1:05d}"
        )

        event = {

            "event_id": event_id,

            "incident_id": incident_id,

            "event_type": event_type,

            "message": message,

            "actor": actor,

            "timestamp": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),

            "metadata": (
                metadata
                if metadata is not None
                else {}
            ),
        }

        self.events.append(event)

        return event

    # ========================================================
    # INCIDENT CREATED
    # ========================================================

    def record_incident_created(
        self,
        incident_id: str,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="INCIDENT_CREATED",

            message=(
                "Emergency incident received "
                "by AegisCampus AI."
            ),

            actor="Incident Intake",

            metadata={
                "incident_type": incident.get(
                    "incident_type"
                ),
                "severity": incident.get(
                    "severity"
                ),
                "location": incident.get(
                    "location"
                ),
            },
        )

    # ========================================================
    # AI ANALYSIS
    # ========================================================

    def record_ai_analysis(
        self,
        incident_id: str,
        analysis: dict[str, Any],
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="AI_ANALYSIS",

            message=(
                "Incident Intelligence Agent "
                "completed analysis."
            ),

            actor="Incident Intelligence Agent",

            metadata={
                "incident_type": analysis.get(
                    "incident_type"
                ),
                "severity": analysis.get(
                    "severity"
                ),
                "confidence": analysis.get(
                    "confidence"
                ),
                "affected_people": analysis.get(
                    "affected_people"
                ),
            },
        )

    # ========================================================
    # AGENTS ACTIVATED
    # ========================================================

    def record_agents_activated(
        self,
        incident_id: str,
        agents: list[str],
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="AGENTS_ACTIVATED",

            message=(
                "Emergency Orchestrator activated "
                "specialized response agents."
            ),

            actor="Emergency Orchestrator",

            metadata={
                "agents": agents,
            },
        )

    # ========================================================
    # RESOURCE RECOMMENDATION
    # ========================================================

    def record_resource_recommendation(
        self,
        incident_id: str,
        resources: list[str],
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="RESOURCES_RECOMMENDED",

            message=(
                "AI agents recommended emergency "
                "response resources."
            ),

            actor="Multi-Agent System",

            metadata={
                "resources": resources,
            },
        )

    # ========================================================
    # APPROVAL REQUESTED
    # ========================================================

    def record_approval_requested(
        self,
        incident_id: str,
        approval_id: str,
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="APPROVAL_REQUESTED",

            message=(
                "Human approval required before "
                "high-impact emergency actions."
            ),

            actor="Emergency Command System",

            metadata={
                "approval_id": approval_id,
            },
        )

    # ========================================================
    # APPROVED
    # ========================================================

    def record_approval(
        self,
        incident_id: str,
        approval_id: str,
        approved_by: str,
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="APPROVED",

            message=(
                "Emergency response plan "
                "approved by authorized commander."
            ),

            actor=approved_by,

            metadata={
                "approval_id": approval_id,
            },
        )

    # ========================================================
    # REJECTED
    # ========================================================

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

            message=(
                "Emergency response plan "
                "rejected by authorized commander."
            ),

            actor=rejected_by,

            metadata={
                "approval_id": approval_id,
                "reason": reason,
            },
        )

    # ========================================================
    # RESOURCE DISPATCHED
    # ========================================================

    def record_resource_dispatch(
        self,
        incident_id: str,
        resources: list[str],
        actor: str = "Emergency Command System",
    ) -> dict[str, Any]:

        return self.record_event(

            incident_id=incident_id,

            event_type="RESOURCES_DISPATCHED",

            message=(
                "Approved emergency resources "
                "were dispatched."
            ),

            actor=actor,

            metadata={
                "resources": resources,
            },
        )

    # ========================================================
    # GET INCIDENT AUDIT TRAIL
    # ========================================================

    def get_incident_events(
        self,
        incident_id: str,
    ) -> list[dict[str, Any]]:

        return [
            event
            for event in self.events
            if event["incident_id"] == incident_id
        ]

    # ========================================================
    # GET ALL EVENTS
    # ========================================================

    def get_all_events(
        self,
    ) -> list[dict[str, Any]]:

        return self.events.copy()

    # ========================================================
    # CLEAR EVENTS
    # ========================================================

    def clear_events(self) -> None:

        self.events.clear()


# ============================================================
# SHARED AUDIT SERVICE
# ============================================================

audit_service = AuditService()