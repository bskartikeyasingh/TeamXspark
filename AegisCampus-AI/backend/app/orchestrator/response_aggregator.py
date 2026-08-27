from typing import Any

from backend.app.orchestrator.orchestrator_agent import (
    emergency_orchestrator,
)
from backend.app.agents.security_agent import (
    security_response_agent,
)
from backend.app.agents.medical_agent import (
    medical_response_agent,
)
from backend.app.agents.facilities_agent import (
    facilities_response_agent,
)
from backend.app.agents.transport_agent import (
    transport_response_agent,
)
from backend.app.agents.communication_agent import (
    communication_response_agent,
)


class EmergencyResponseAggregator:
    def __init__(self):
        self.agents = {
            "security": security_response_agent,
            "medical": medical_response_agent,
            "facilities": facilities_response_agent,
            "transport": transport_response_agent,
            "communication": communication_response_agent,
        }

    def create_unified_response(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:
        # 1. Orchestrator determines which specialized agents are activated
        orchestration_plan = emergency_orchestrator.create_response_plan(incident)
        activated_agents = orchestration_plan.get("activated_agents", [])

        agent_responses: dict[str, dict[str, Any]] = {}
        agent_errors: dict[str, str] = {}

        # 2. Execute selected specialized agents
        for agent_name in activated_agents:
            agent = self.agents.get(agent_name)
            if not agent:
                agent_errors[agent_name] = "Agent implementation not found."
                continue
            try:
                response = agent.analyze(incident)
                agent_responses[agent_name] = response
            except Exception as exc:
                agent_errors[agent_name] = str(exc)

        # 3. Aggregate selected resources
        all_selected_resources: list[str] = []
        for response in agent_responses.values():
            selected = response.get("selected_resources", [])
            if isinstance(selected, list):
                for resource_id in selected:
                    if resource_id not in all_selected_resources:
                        all_selected_resources.append(resource_id)

        # 4. Combine AI recommended actions from incident intelligence + specialized agent actions
        all_actions: list[str] = list(incident.get("recommended_actions", []))
        for response in agent_responses.values():
            actions = response.get("recommended_actions", [])
            if isinstance(actions, list):
                for action in actions:
                    action_text = str(action)
                    if action_text not in all_actions:
                        all_actions.append(action_text)

        priority = orchestration_plan.get("priority", incident.get("severity", "Medium"))
        summary = orchestration_plan.get(
            "coordination_summary",
            incident.get("summary", "Emergency response plan prepared."),
        )

        return {
            "incident": incident,
            "priority": priority,
            "activated_agents": activated_agents,
            "agent_responses": agent_responses,
            "agent_errors": agent_errors,
            "selected_resources": all_selected_resources,
            "recommended_actions": all_actions,
            "coordination_summary": summary,
            "human_approval_required": True,
            "approval_status": "PENDING",
        }


emergency_response_aggregator = EmergencyResponseAggregator()