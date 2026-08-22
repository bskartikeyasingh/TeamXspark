from datetime import datetime, timezone
from typing import Any

from backend.app.database.mongodb import admins_collection


# ============================================================
# AegisCampus AI
# Admin Authentication Service
# ============================================================


class AdminService:

    # ========================================================
    # CREATE ADMIN
    # ========================================================

    def create_admin(
        self,
        username: str,
        password: str,
        name: str = "Campus Administrator",
    ) -> dict[str, Any]:

        existing_admin = admins_collection.find_one(
            {
                "username": username
            }
        )

        if existing_admin:

            raise ValueError(
                "Admin username already exists."
            )

        admin = {

            "username": username,

            "password": password,

            "name": name,

            "role": "ADMIN",

            "created_at": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),

            "active": True,
        }

        admins_collection.insert_one(
            admin.copy()
        )

        admin.pop(
            "_id",
            None,
        )

        # Never return password
        admin.pop(
            "password",
            None,
        )

        return admin

    # ========================================================
    # LOGIN
    # ========================================================

    def login(
        self,
        username: str,
        password: str,
    ) -> dict[str, Any]:

        admin = admins_collection.find_one(
            {
                "username": username,
                "password": password,
                "active": True,
            },
            {
                "_id": 0
            },
        )

        if admin is None:

            raise ValueError(
                "Invalid admin username or password."
            )

        return {
            "success": True,
            "username": admin["username"],
            "name": admin.get(
                "name",
                "Campus Administrator",
            ),
            "role": admin.get(
                "role",
                "ADMIN",
            ),
        }

    # ========================================================
    # GET ADMIN
    # ========================================================

    def get_admin(
        self,
        username: str,
    ) -> dict[str, Any] | None:

        admin = admins_collection.find_one(
            {
                "username": username
            },
            {
                "_id": 0,
                "password": 0,
            },
        )

        return admin


# ============================================================
# SHARED ADMIN SERVICE
# ============================================================

admin_service = AdminService()