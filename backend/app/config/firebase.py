import json
import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger("firebase_config")

# ============================================================
# FIREBASE ADMIN INITIALIZATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

SERVICE_ACCOUNT_FILE = (
    PROJECT_ROOT
    / "backend"
    / "firebase-service-account.json"
)

ALT_SERVICE_ACCOUNT_FILE = (
    Path(__file__).resolve().parents[2]
    / "firebase-service-account.json"
)

if not firebase_admin._apps:
    try:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

        if service_account_json:
            # Parse raw JSON string from environment variable (ideal for Render/cloud deployment)
            cert_dict = json.loads(service_account_json)
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON environment variable.")
        elif service_account_path and Path(service_account_path).exists():
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized via {service_account_path}.")
        elif SERVICE_ACCOUNT_FILE.exists():
            cred = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized via {SERVICE_ACCOUNT_FILE}.")
        elif ALT_SERVICE_ACCOUNT_FILE.exists():
            cred = credentials.Certificate(str(ALT_SERVICE_ACCOUNT_FILE))
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized via {ALT_SERVICE_ACCOUNT_FILE}.")
        else:
            logger.warning("Firebase service account credentials not found. Authentication will operate in simulation/dev mode.")
    except Exception as exc:
        logger.warning(f"Firebase Admin initialization warning: {exc}")


# ============================================================
# VERIFY FIREBASE ID TOKEN
# ============================================================

def verify_firebase_token(id_token: str):
    """
    Verify a Firebase ID token and return
    the authenticated Firebase user information.
    """
    if not id_token:
        raise ValueError("Token is required.")

    if firebase_admin._apps:
        try:
            return auth.verify_id_token(id_token)
        except Exception as exc:
            logger.warning(f"Firebase verification error: {exc}")
            raise

    # Graceful fallback in development/preview if Firebase Admin is not configured
    raise RuntimeError("Firebase Admin SDK is not configured with valid service account credentials.")