import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]

ENV_FILE = PROJECT_ROOT / "backend" / ".env"

load_dotenv(ENV_FILE)


# ============================================================
# MONGODB CONFIGURATION
# ============================================================

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://localhost:27017"
)

MONGODB_DATABASE = os.getenv(
    "MONGODB_DATABASE",
    "aegiscampus"
)


# ============================================================
# MONGODB CLIENT
# ============================================================

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,
)


db = client[MONGODB_DATABASE]


# ============================================================
# COLLECTIONS
# ============================================================

incidents_collection = db["incidents"]

approvals_collection = db["approvals"]

audit_logs_collection = db["audit_logs"]

resources_collection = db["resources"]

admins_collection = db["admins"]

students_collection = db["students"]


# ============================================================
# CONNECTION TEST
# ============================================================

def test_mongodb_connection():

    try:

        client.admin.command("ping")

        return {
            "connected": True,
            "database": MONGODB_DATABASE,
        }

    except Exception as error:

        return {
            "connected": False,
            "error": str(error),
        }