from datetime import datetime, timezone
from typing import Any

from backend.app.database.mongodb import admins_collection


class AdminService:
    def __init__(self):
        self._ensure_default_admin()

    def _ensure_default_admin(self):
        """Ensures at least one default administrator exists for campus emergency command."""
        try:
            admin = admins_collection.find_one({"username": "admin"})
            if not admin:
                self.create_admin(
                    username="admin",
                    password="admin123",
                    name="Chief Emergency Officer",
                )
            else:
                # Update password if needed to ensure standard test/dev credentials
                admins_collection.update_one(
                    {"username": "admin"},
                    {"$set": {"password": "admin123", "active": True}},
                )
        except Exception as e:
            print("Failed to auto-seed default admin:", e)

    def create_admin(
        self,
        username: str,
        password: str,
        name: str = "Campus Administrator",
    ) -> dict[str, Any]:
        existing_admin = admins_collection.find_one({"username": username})
        if existing_admin:
            raise ValueError("Admin username already exists.")

        admin = {
            "username": username,
            "password": password,
            "name": name,
            "role": "ADMIN",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "active": True,
        }

        admins_collection.insert_one(admin.copy())

        admin.pop("_id", None)
        admin.pop("password", None)
        return admin

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
            {"_id": 0},
        )

        if admin is None:
            raise ValueError("Invalid admin username or password.")

        return {
            "success": True,
            "username": admin["username"],
            "name": admin.get("name", "Campus Administrator"),
            "role": admin.get("role", "ADMIN"),
        }

    def get_admin(
        self,
        username: str,
    ) -> dict[str, Any] | None:
        admin = admins_collection.find_one(
            {"username": username},
            {"_id": 0, "password": 0},
        )
        return admin


admin_service = AdminService()