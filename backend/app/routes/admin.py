from typing import Any

from fastapi import APIRouter, HTTPException

from backend.app.services.admin_service import (
    admin_service,
)


# ============================================================
# AegisCampus AI
# Admin Routes
# ============================================================

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


# ============================================================
# CREATE ADMIN
# ============================================================

@router.post("/create")
def create_admin(
    payload: dict[str, Any],
):

    username = str(
        payload.get(
            "username",
            "",
        )
    ).strip()

    password = str(
        payload.get(
            "password",
            "",
        )
    ).strip()

    name = str(
        payload.get(
            "name",
            "Campus Administrator",
        )
    ).strip()

    if not username:

        raise HTTPException(
            status_code=400,
            detail="Admin username is required.",
        )

    if not password:

        raise HTTPException(
            status_code=400,
            detail="Admin password is required.",
        )

    try:

        admin = admin_service.create_admin(
            username=username,
            password=password,
            name=name,
        )

        return {
            "success": True,
            "message": "Admin created successfully.",
            "admin": admin,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


# ============================================================
# ADMIN LOGIN
# ============================================================

@router.post("/login")
def admin_login(
    payload: dict[str, Any],
):

    username = str(
        payload.get(
            "username",
            "",
        )
    ).strip()

    password = str(
        payload.get(
            "password",
            "",
        )
    ).strip()

    if not username or not password:

        raise HTTPException(
            status_code=400,
            detail="Username and password are required.",
        )

    try:

        result = admin_service.login(
            username=username,
            password=password,
        )

        return result

    except ValueError as exc:

        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc


# ============================================================
# GET ADMIN PROFILE
# ============================================================

@router.get("/{username}")
def get_admin(
    username: str,
):

    admin = admin_service.get_admin(
        username
    )

    if admin is None:

        raise HTTPException(
            status_code=404,
            detail="Admin not found.",
        )

    return {
        "success": True,
        "admin": admin,
    }