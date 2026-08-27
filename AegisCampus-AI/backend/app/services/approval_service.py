from datetime import datetime, timezone
from typing import Any

from backend.app.database.mongodb import approvals_collection


# ============================================================
# AegisCampus AI
# Human Approval Service
# MongoDB Persistent Version
# ============================================================


class ApprovalService:

    # ========================================================
    # CREATE APPROVAL REQUEST
    # ========================================================

    def create_approval_request(
        self,
        incident_id: str,
        response_plan: dict[str, Any],
        requested_by: str = "AI Orchestrator",
    ) -> dict[str, Any]:

        # Generate next approval ID from MongoDB
        count = approvals_collection.count_documents({})

        approval_id = f"APR-{count + 1:04d}"

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

        # Save permanently to MongoDB
        approvals_collection.insert_one(
            approval_request.copy()
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

        approved_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        approvals_collection.update_one(

            {
                "approval_id": approval_id
            },

            {
                "$set": {
                    "status": "APPROVED",
                    "approved_by": approved_by,
                    "approved_at": approved_at,
                }
            },
        )

        return self._find_approval(
            approval_id
        )

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

        rejected_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        approvals_collection.update_one(

            {
                "approval_id": approval_id
            },

            {
                "$set": {
                    "status": "REJECTED",
                    "approved_by": rejected_by,
                    "approved_at": rejected_at,
                    "rejection_reason": reason,
                }
            },
        )

        return self._find_approval(
            approval_id
        )

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

        approvals = list(
            approvals_collection.find(
                {},
                {
                    "_id": 0
                },
            )
        )

        return approvals

    # ========================================================
    # PENDING APPROVALS
    # ========================================================

    def get_pending_approvals(
        self,
    ) -> list[dict[str, Any]]:

        approvals = list(
            approvals_collection.find(
                {
                    "status": "PENDING"
                },
                {
                    "_id": 0
                },
            )
        )

        return approvals

    # ========================================================
    # INTERNAL FIND METHOD
    # ========================================================

    def _find_approval(
        self,
        approval_id: str,
    ) -> dict[str, Any]:

        approval = approvals_collection.find_one(

            {
                "approval_id": approval_id
            },

            {
                "_id": 0
            },
        )

        if approval is None:

            raise ValueError(
                f"Approval request {approval_id} not found."
            )

        return approval


# ============================================================
# SHARED APPROVAL SERVICE
# ============================================================

approval_service = ApprovalService()