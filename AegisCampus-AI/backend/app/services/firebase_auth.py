import logging
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger("firebase_auth")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SERVICE_ACCOUNT_FILE = (
    PROJECT_ROOT
    / "backend"
    / "firebase-service-account.json"
)

# INITIALIZE FIREBASE
if not firebase_admin._apps:
    if SERVICE_ACCOUNT_FILE.exists():
        try:
            credential = credentials.Certificate(str(SERVICE_ACCOUNT_FILE))
            firebase_admin.initialize_app(credential)
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.warning(f"Firebase initialization with service account failed: {e}")
    else:
        logger.warning(f"Firebase service account file not found at {SERVICE_ACCOUNT_FILE}.")


def verify_firebase_token(id_token: str) -> dict:
    """Verifies Firebase ID token. Returns decoded token claims dictionary."""
    if not id_token:
        raise ValueError("Firebase token is empty.")

    if firebase_admin._apps:
        try:
            return auth.verify_id_token(id_token)
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            raise

    # Fallback simulation if running in offline test environment
    raise RuntimeError("Firebase Admin SDK is not initialized with valid service account credentials.")