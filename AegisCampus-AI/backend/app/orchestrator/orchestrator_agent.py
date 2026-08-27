from typing import Any


class EmergencyOrchestratorAgent:
    """Fast, deterministic orchestrator for activating specialized campus response agents
    and determining human approval requirements without redundant LLM calls.
    """

    VALID_AGENTS = {
        "security",
        "medical",
        "facilities",
        "transport",
        "communication",
    }

    def create_response_plan(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:
        incident_type = incident.get("incident_type", "Other")
        severity = incident.get("severity", "Medium")
        required_resource_types = incident.get("required_resource_types", [])

        activated_agents = set()

        # Map required resource types or incident types to agent domains
        if incident_type == "Fire":
            activated_agents.update(["security", "medical", "facilities", "transport", "communication"])
        elif incident_type == "Medical":
            activated_agents.update(["medical", "transport", "communication"])
        elif incident_type == "Security":
            activated_agents.update(["security", "communication"])
        elif incident_type == "Severe Weather":
            activated_agents.update(["security", "facilities", "communication"])
        elif incident_type == "Accident":
            activated_agents.update(["medical", "security", "transport", "communication"])
        elif incident_type == "Crowd":
            activated_agents.update(["security", "medical", "communication"])
        elif incident_type == "Infrastructure":
            activated_agents.update(["facilities", "security", "communication"])
        else:
            activated_agents.update(["security", "communication"])

        # Complement based on explicitly recommended resource types
        for res_type in required_resource_types:
            res_lower = res_type.lower()
            if "sec" in res_lower:
                activated_agents.add("security")
            elif "med" in res_lower or "aid" in res_lower:
                activated_agents.add("medical")
            elif "fac" in res_lower or "fire" in res_lower:
                activated_agents.add("facilities")
            elif "trans" in res_lower or "veh" in res_lower or "amb" in res_lower:
                activated_agents.add("transport")
            elif "com" in res_lower:
                activated_agents.add("communication")

        # Prioritization & Human Approval
        # Emergency deployments always require admin/commander approval for safety
        human_approval_required = True

        summary = (
            f"Orchestrated multi-agent response for {severity.lower()} severity {incident_type.lower()} "
            f"emergency with {len(activated_agents)} specialized response domains."
        )

        return {
            "activated_agents": [a for a in sorted(activated_agents) if a in self.VALID_AGENTS],
            "priority": severity,
            "coordination_summary": summary,
            "human_approval_required": human_approval_required,
        }


emergency_orchestrator = EmergencyOrchestratorAgent()