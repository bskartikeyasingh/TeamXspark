import json
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


# ============================================================
# AegisCampus AI
# Multi-Agent Response Aggregator
# ============================================================


class EmergencyResponseAggregator:

    def __init__(self):

        self.agents = {

            "security":
                security_response_agent,

            "medical":
                medical_response_agent,

            "facilities":
                facilities_response_agent,

            "transport":
                transport_response_agent,

            "communication":
                communication_response_agent,
        }

    # ========================================================
    # CREATE UNIFIED RESPONSE
    # ========================================================

    def create_unified_response(
        self,
        incident: dict[str, Any],
    ) -> dict[str, Any]:

        # ----------------------------------------------------
        # STEP 1
        # Ask orchestrator which agents are required
        # ----------------------------------------------------

        orchestration_plan = (
            emergency_orchestrator.create_response_plan(
                incident
            )
        )

        activated_agents = (
            orchestration_plan.get(
                "activated_agents",
                [],
            )
        )

        # ----------------------------------------------------
        # STEP 2
        # Execute selected specialized agents
        # ----------------------------------------------------

        agent_responses: dict[
            str,
            dict[str, Any],
        ] = {}

        agent_errors: dict[
            str,
            str,
        ] = {}

        for agent_name in activated_agents:

            agent = self.agents.get(
                agent_name
            )

            if not agent:

                agent_errors[agent_name] = (
                    "Agent implementation not found."
                )

                continue

            try:

                response = agent.analyze(
                    incident
                )

                agent_responses[
                    agent_name
                ] = response

            except Exception as exc:

                agent_errors[
                    agent_name
                ] = str(exc)

        # ----------------------------------------------------
        # STEP 3
        # Aggregate selected resources
        # ----------------------------------------------------

        all_selected_resources: list[str] = []

        for response in agent_responses.values():

            selected = response.get(
                "selected_resources",
                [],
            )

            if not isinstance(
                selected,
                list,
            ):

                continue

            for resource_id in selected:

                if resource_id not in (
                    all_selected_resources
                ):

                    all_selected_resources.append(
                        resource_id
                    )

        # ----------------------------------------------------
        # STEP 4
        # Determine human approval
        # ----------------------------------------------------

        human_approval_required = bool(
            orchestration_plan.get(
                "human_approval_required",
                True,
            )
        )

        for response in agent_responses.values():

            if response.get(
                "human_approval_required",
                True,
            ):

                human_approval_required = True

        # ----------------------------------------------------
        # STEP 5
        # Collect recommended actions
        # ----------------------------------------------------

        all_actions: list[str] = []

        for response in agent_responses.values():

            actions = response.get(
                "recommended_actions",
                [],
            )

            if not isinstance(
                actions,
                list,
            ):

                continue

            for action in actions:

                action_text = str(
                    action
                )

                if action_text not in all_actions:

                    all_actions.append(
                        action_text
                    )

        # ----------------------------------------------------
        # STEP 6
        # Determine priority
        # ----------------------------------------------------

        priority = (
            orchestration_plan.get(
                "priority",
                incident.get(
                    "severity",
                    "Medium",
                ),
            )
        )

        # ----------------------------------------------------
        # STEP 7
        # Create unified summary
        # ----------------------------------------------------

        summary = (
            orchestration_plan.get(
                "coordination_summary",
                "Multi-agent emergency response generated.",
            )
        )

        # ----------------------------------------------------
        # STEP 8
        # Create final response object
        # ----------------------------------------------------

        unified_response = {

            "incident": incident,

            "priority": priority,

            "activated_agents": activated_agents,

            "agent_responses": agent_responses,

            "agent_errors": agent_errors,

            "selected_resources": (
                all_selected_resources
            ),

            "recommended_actions": (
                all_actions
            ),

            "coordination_summary": summary,

            "human_approval_required": (
                human_approval_required
            ),

            "approval_status": "PENDING",

        }

        return unified_response

    # ========================================================
    # FORMAT RESPONSE FOR DASHBOARD
    # ========================================================

    def create_dashboard_summary(
        self,
        unified_response: dict[str, Any],
    ) -> dict[str, Any]:

        incident = unified_response.get(
            "incident",
            {},
        )

        agent_responses = (
            unified_response.get(
                "agent_responses",
                {},
            )
        )

        return {

            "incident_type": incident.get(
                "incident_type",
                "Unknown",
            ),

            "severity": incident.get(
                "severity",
                "Unknown",
            ),

            "location": incident.get(
                "location",
                "Unknown",
            ),

            "affected_people": incident.get(
                "affected_people",
                0,
            ),

            "activated_agents": unified_response.get(
                "activated_agents",
                [],
            ),

            "resource_count": len(
                unified_response.get(
                    "selected_resources",
                    [],
                )
            ),

            "recommended_action_count": len(
                unified_response.get(
                    "recommended_actions",
                    [],
                )
            ),

            "human_approval_required": (
                unified_response.get(
                    "human_approval_required",
                    True,
                )
            ),

            "approval_status": (
                unified_response.get(
                    "approval_status",
                    "PENDING",
                )
            ),

            "agent_status": {
                agent_name: "completed"
                for agent_name
                in agent_responses
            },
        }


# ============================================================
# SHARED AGGREGATOR
# ============================================================

emergency_response_aggregator = (
    EmergencyResponseAggregator()
)