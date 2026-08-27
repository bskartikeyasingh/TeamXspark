import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING


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
    "aicampus"
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
alerts_collection = db["alerts"]


# ============================================================
# INDEX INITIALIZATION
# ============================================================

def init_db_indexes():
    """Initializes high-performance database indexes."""
    try:
        incidents_collection.create_index([("incident_id", ASCENDING)], unique=True)
        incidents_collection.create_index([("student_email", ASCENDING)])
        incidents_collection.create_index([("student_id", ASCENDING)])
        incidents_collection.create_index([("status", ASCENDING)])
        incidents_collection.create_index([("created_at", ASCENDING)])

        resources_collection.create_index([("id", ASCENDING)], unique=True)
        resources_collection.create_index([("status", ASCENDING)])
        resources_collection.create_index([("type", ASCENDING)])

        alerts_collection.create_index([("alert_id", ASCENDING)], unique=True)
        alerts_collection.create_index([("incident_id", ASCENDING)])
        alerts_collection.create_index([("resource_id", ASCENDING)])
        alerts_collection.create_index([("created_at", ASCENDING)])

        approvals_collection.create_index([("approval_id", ASCENDING)], unique=True)
        approvals_collection.create_index([("incident_id", ASCENDING)])
        approvals_collection.create_index([("status", ASCENDING)])

        admins_collection.create_index([("username", ASCENDING)], unique=True)
        students_collection.create_index([("firebase_uid", ASCENDING)], unique=True)
        students_collection.create_index([("email", ASCENDING)])
    except Exception as e:
        print("Database index initialization notice:", e)


# Run index initialization
init_db_indexes()


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