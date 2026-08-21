from typing import Any


# ============================================================
# AegisCampus AI
# Resource Coordination Service
# ============================================================


class ResourceCoordinationService:

    def __init__(self):

        # ----------------------------------------------------
        # Demo campus resource registry
        #
        # This is intentionally in-memory for the hackathon.
        # Later we can replace this with MongoDB/PostgreSQL.
        # ----------------------------------------------------

        self.resources: list[dict[str, Any]] = [

            # =================================================
            # MEDICAL RESOURCES
            # =================================================

            {
                "id": "AMB-001",
                "name": "Campus Ambulance 01",
                "type": "ambulance",
                "category": "medical",
                "status": "available",
                "location": "Main Medical Center",
                "capacity": 2,
                "assigned_incident": None,
            },

            {
                "id": "AMB-002",
                "name": "Campus Ambulance 02",
                "type": "ambulance",
                "category": "medical",
                "status": "busy",
                "location": "North Block",
                "capacity": 2,
                "assigned_incident": "INC-1021",
            },

            {
                "id": "FAU-001",
                "name": "First Aid Unit 01",
                "type": "first_aid_unit",
                "category": "medical",
                "status": "available",
                "location": "Main Medical Center",
                "capacity": 10,
                "assigned_incident": None,
            },

            # =================================================
            # SECURITY RESOURCES
            # =================================================

            {
                "id": "SEC-001",
                "name": "Security Team Alpha",
                "type": "security_team",
                "category": "security",
                "status": "available",
                "location": "Main Gate",
                "capacity": 6,
                "assigned_incident": None,
            },

            {
                "id": "SEC-002",
                "name": "Security Team Bravo",
                "type": "security_team",
                "category": "security",
                "status": "available",
                "location": "East Gate",
                "capacity": 5,
                "assigned_incident": None,
            },

            {
                "id": "SEC-003",
                "name": "Security Team Charlie",
                "type": "security_team",
                "category": "security",
                "status": "busy",
                "location": "Sports Complex",
                "capacity": 4,
                "assigned_incident": "INC-1018",
            },

            # =================================================
            # FACILITIES RESOURCES
            # =================================================

            {
                "id": "FAC-001",
                "name": "Facilities Response Team Alpha",
                "type": "facilities_team",
                "category": "facilities",
                "status": "available",
                "location": "Facilities Office",
                "capacity": 5,
                "assigned_incident": None,
            },

            {
                "id": "FAC-002",
                "name": "Fire Safety Unit",
                "type": "fire_safety_unit",
                "category": "facilities",
                "status": "available",
                "location": "Block C",
                "capacity": 4,
                "assigned_incident": None,
            },

            # =================================================
            # TRANSPORT RESOURCES
            # =================================================

            {
                "id": "VEH-001",
                "name": "Campus Emergency Vehicle 01",
                "type": "emergency_vehicle",
                "category": "transport",
                "status": "available",
                "location": "Transport Office",
                "capacity": 8,
                "assigned_incident": None,
            },

            {
                "id": "VEH-002",
                "name": "Campus Emergency Vehicle 02",
                "type": "emergency_vehicle",
                "category": "transport",
                "status": "available",
                "location": "North Parking",
                "capacity": 10,
                "assigned_incident": None,
            },

            # =================================================
            # COMMUNICATION RESOURCES
            # =================================================

            {
                "id": "COM-001",
                "name": "Campus Emergency Broadcast",
                "type": "emergency_broadcast",
                "category": "communication",
                "status": "available",
                "location": "Command Center",
                "capacity": 10000,
                "assigned_incident": None,
            },

            {
                "id": "COM-002",
                "name": "Security Radio Network",
                "type": "radio_network",
                "category": "communication",
                "status": "available",
                "location": "Command Center",
                "capacity": 500,
                "assigned_incident": None,
            },
        ]

    # ========================================================
    # GET ALL RESOURCES
    # ========================================================

    def get_all_resources(
        self,
    ) -> list[dict[str, Any]]:

        return self.resources.copy()

    # ========================================================
    # GET AVAILABLE RESOURCES
    # ========================================================

    def get_available_resources(
        self,
        category: str | None = None,
    ) -> list[dict[str, Any]]:

        available = [
            resource
            for resource in self.resources
            if resource["status"] == "available"
        ]

        if category:

            available = [
                resource
                for resource in available
                if resource["category"]
                == category
            ]

        return available

    # ========================================================
    # FIND RESOURCES FOR AGENT
    # ========================================================

    def find_resources_for_agent(
        self,
        agent_name: str,
    ) -> list[dict[str, Any]]:

        agent_name = agent_name.lower().strip()

        return self.get_available_resources(
            category=agent_name
        )

    # ========================================================
    # ASSIGN RESOURCE
    # ========================================================

    def assign_resource(
        self,
        resource_id: str,
        incident_id: str,
    ) -> dict[str, Any]:

        for resource in self.resources:

            if resource["id"] == resource_id:

                if resource["status"] != "available":

                    raise ValueError(
                        f"Resource {resource_id} is not available."
                    )

                resource["status"] = "assigned"

                resource["assigned_incident"] = (
                    incident_id
                )

                return resource

        raise ValueError(
            f"Resource {resource_id} not found."
        )

    # ========================================================
    # RELEASE RESOURCE
    # ========================================================

    def release_resource(
        self,
        resource_id: str,
    ) -> dict[str, Any]:

        for resource in self.resources:

            if resource["id"] == resource_id:

                resource["status"] = "available"

                resource["assigned_incident"] = None

                return resource

        raise ValueError(
            f"Resource {resource_id} not found."
        )

    # ========================================================
    # RESOURCE SUMMARY
    # ========================================================

    def get_resource_summary(
        self,
    ) -> dict[str, Any]:

        total = len(self.resources)

        available = len(
            [
                resource
                for resource in self.resources
                if resource["status"] == "available"
            ]
        )

        busy = len(
            [
                resource
                for resource in self.resources
                if resource["status"] == "busy"
            ]
        )

        assigned = len(
            [
                resource
                for resource in self.resources
                if resource["status"] == "assigned"
            ]
        )

        return {
            "total": total,
            "available": available,
            "busy": busy,
            "assigned": assigned,
        }


# ============================================================
# SHARED RESOURCE SERVICE
# ============================================================

resource_service = ResourceCoordinationService()