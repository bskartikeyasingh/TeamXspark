from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.database.mongodb import students_collection
from backend.app.services.firebase_auth import verify_firebase_token


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


class FirebaseLoginRequest(BaseModel):
    id_token: str
    student_id: Optional[str] = None


@router.post("/firebase")
def firebase_login(
    request: FirebaseLoginRequest,
):
    try:
        decoded_token = verify_firebase_token(
            request.id_token
        )
    except Exception as error:
        # If running in local demo without initialized service account, allow mock/fallback
        raise HTTPException(
            status_code=401,
            detail=f"Invalid Firebase token: {str(error)}",
        )

    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    name = (
        decoded_token.get("name")
        or email.split("@")[0]
        if email
        else "Student"
    )
    picture = decoded_token.get("picture")

    if not firebase_uid or not email:
        raise HTTPException(
            status_code=400,
            detail="Firebase account does not contain required user information.",
        )

    now = datetime.now(timezone.utc).isoformat()

    student = students_collection.find_one(
        {"firebase_uid": firebase_uid},
        {"_id": 0},
    )

    if student is None:
        student = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": name,
            "profile_picture": picture,
            "student_id": request.student_id or None,
            "auth_provider": "firebase",
            "role": "student",
            "created_at": now,
            "last_login": now,
        }
        students_collection.insert_one(student.copy())
    else:
        updates = {
            "email": email,
            "name": name,
            "profile_picture": picture,
            "last_login": now,
        }
        if request.student_id:
            updates["student_id"] = request.student_id

        students_collection.update_one(
            {"firebase_uid": firebase_uid},
            {"$set": updates},
        )
        student = students_collection.find_one(
            {"firebase_uid": firebase_uid},
            {"_id": 0},
        )

    return {
        "success": True,
        "message": "Student authenticated successfully.",
        "student": student,
    }