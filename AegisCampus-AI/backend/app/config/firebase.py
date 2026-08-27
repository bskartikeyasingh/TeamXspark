import firebase_admin
from firebase_admin import credentials, auth
from pathlib import Path


# ============================================================
# FIREBASE ADMIN INITIALIZATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

SERVICE_ACCOUNT_FILE = (
    PROJECT_ROOT
    / "backend"
    / "firebase-service-account.json"
)


if not firebase_admin._apps:

    cred = credentials.Certificate(
        str(SERVICE_ACCOUNT_FILE)
    )

    firebase_admin.initialize_app(
        cred
    )


# ============================================================
# VERIFY FIREBASE ID TOKEN
# ============================================================

def verify_firebase_token(
    id_token: str,
):
    """
    Verify a Firebase ID token and return
    the authenticated Firebase user information.
    """

    decoded_token = auth.verify_id_token(
        id_token
    )

    return decoded_token