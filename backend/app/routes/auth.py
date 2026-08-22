from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.database.mongodb import students_collection
from backend.app.services.firebase_auth import verify_firebase_token


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class FirebaseLoginRequest(BaseModel):

    id_token: str


# ============================================================
# FIREBASE LOGIN
# ============================================================

@router.post("/firebase")
def firebase_login(
    request: FirebaseLoginRequest,
):

    try:

        decoded_token = verify_firebase_token(
            request.id_token
        )

    except Exception as error:

        raise HTTPException(
            status_code=401,
            detail=f"Invalid Firebase token: {str(error)}",
        )


    # ========================================================
    # FIREBASE USER DATA
    # ========================================================

    firebase_uid = decoded_token.get(
        "uid"
    )

    email = decoded_token.get(
        "email"
    )

    name = (
        decoded_token.get("name")
        or email.split("@")[0]
        if email
        else "Student"
    )

    picture = decoded_token.get(
        "picture"
    )


    if not firebase_uid or not email:

        raise HTTPException(
            status_code=400,
            detail="Firebase account does not contain required user information.",
        )


    now = datetime.now(
        timezone.utc
    )


    # ========================================================
    # FIND EXISTING STUDENT
    # ========================================================

    student = students_collection.find_one(
        {
            "firebase_uid": firebase_uid
        },
        {
            "_id": 0
        },
    )


    # ========================================================
    # CREATE STUDENT
    # ========================================================

    if student is None:

        student = {

            "firebase_uid": firebase_uid,

            "email": email,

            "name": name,

            "profile_picture": picture,

            "student_id": None,

            "auth_provider": "firebase",

            "role": "student",

            "created_at": now,

            "last_login": now,
        }

        students_collection.insert_one(
            student.copy()
        )


    # ========================================================
    # UPDATE EXISTING STUDENT
    # ========================================================

    else:

        students_collection.update_one(

            {
                "firebase_uid": firebase_uid
            },

            {
                "$set": {

                    "email": email,

                    "name": name,

                    "profile_picture": picture,

                    "last_login": now,
                }
            },
        )

        student = students_collection.find_one(
            {
                "firebase_uid": firebase_uid
            },
            {
                "_id": 0
            },
        )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "success": True,

        "message": "Student authenticated successfully.",

        "student": student,
    }