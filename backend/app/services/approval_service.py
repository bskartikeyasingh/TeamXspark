from datetime import datetime, timezone
from typing import Any


# ============================================================
# AegisCampus AI
# Human Approval Service
# ============================================================


class ApprovalService:

    def __init__(self):

        self.approvals: list[dict[str, Any]] = []

    # ========================================================
    # CREATE APPROVAL REQUEST
    # ========================================================

    def create_approval_request(
        self,
        incident_id: str,
        response_plan: dict[str, Any],
        requested_by: str = "AI Orchestrator",
    ) -> dict[str, Any]:

        approval_id = (
            f"APR-{len(self.approvals) + 1:04d}"
        )

        approval_request = {

            "approval_id": approval_id,

            "incident_id": incident_id,

            "status": "PENDING",

            "requested_by": requested_by,

            "requested_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),

            "approved_by": None,

            "approved_at": None,

            "rejection_reason": None,

            "priority": response_plan.get(
                "priority",
                "Medium",
            ),

            "activated_agents": response_plan.get(
                "activated_agents",
                [],
            ),

            "selected_resources": response_plan.get(
                "selected_resources",
                [],
            ),

            "recommended_actions": response_plan.get(
                "recommended_actions",
                [],
            ),

            "human_approval_required": response_plan.get(
                "human_approval_required",
                True,
            ),
        }

        self.approvals.append(
            approval_request
        )

        return approval_request

    # ========================================================
    # APPROVE RESPONSE
    # ========================================================

    def approve(
        self,
        approval_id: str,
        approved_by: str,
    ) -> dict[str, Any]:

        approval = self._find_approval(
            approval_id
        )

        if approval["status"] != "PENDING":

            raise ValueError(
                "Only pending approval requests can be approved."
            )

        approval["status"] = "APPROVED"

        approval["approved_by"] = (
            approved_by
        )

        approval["approved_at"] = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        return approval

    # ========================================================
    # REJECT RESPONSE
    # ========================================================

    def reject(
        self,
        approval_id: str,
        rejected_by: str,
        reason: str,
    ) -> dict[str, Any]:

        approval = self._find_approval(
            approval_id
        )

        if approval["status"] != "PENDING":

            raise ValueError(
                "Only pending approval requests can be rejected."
            )

        approval["status"] = "REJECTED"

        approval["approved_by"] = (
            rejected_by
        )

        approval["approved_at"] = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        approval["rejection_reason"] = (
            reason
        )

        return approval

    # ========================================================
    # GET APPROVAL
    # ========================================================

    def get_approval(
        self,
        approval_id: str,
    ) -> dict[str, Any]:

        return self._find_approval(
            approval_id
        )

    # ========================================================
    # GET ALL APPROVALS
    # ========================================================

    def get_all_approvals(
        self,
    ) -> list[dict[str, Any]]:

        return self.approvals.copy()

    # ========================================================
    # PENDING APPROVALS
    # ========================================================

    def get_pending_approvals(
        self,
    ) -> list[dict[str, Any]]:

        return [
            approval
            for approval in self.approvals
            if approval["status"] == "PENDING"
        ]

    # ========================================================
    # INTERNAL FIND METHOD
    # ========================================================

    def _find_approval(
        self,
        approval_id: str,
    ) -> dict[str, Any]:

        for approval in self.approvals:

            if approval["approval_id"] == approval_id:

                return approval

        raise ValueError(
            f"Approval request {approval_id} not found."
        )


# ============================================================
# SHARED APPROVAL SERVICE
# ============================================================

approval_service = ApprovalService()