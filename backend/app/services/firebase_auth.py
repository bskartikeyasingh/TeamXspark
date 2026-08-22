import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth


# ============================================================
# AegisCampus AI
# Firebase Authentication Service
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

SERVICE_ACCOUNT_FILE = (
    PROJECT_ROOT
    / "backend"
    / "firebase-service-account.json"
)


# ============================================================
# INITIALIZE FIREBASE
# ============================================================

if not firebase_admin._apps:

    if not SERVICE_ACCOUNT_FILE.exists():
        raise FileNotFoundError(
            f"Firebase service account not found: "
            f"{SERVICE_ACCOUNT_FILE}"
        )

    credential = credentials.Certificate(
        str(SERVICE_ACCOUNT_FILE)
    )

    firebase_admin.initialize_app(
        credential
    )


# ============================================================
# VERIFY FIREBASE ID TOKEN
# ============================================================

def verify_firebase_token(
    id_token: str,
) -> dict:

    decoded_token = auth.verify_id_token(
        id_token
    )

    return decoded_token