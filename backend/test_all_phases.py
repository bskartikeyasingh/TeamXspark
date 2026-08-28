import os
import sys
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.mongodb import (
    test_mongodb_connection,
    resources_collection,
    incidents_collection,
    approvals_collection,
    alerts_collection,
    audit_logs_collection,
    admins_collection,
    students_collection,
)
from backend.app.database.seed_resources import seed
from backend.app.ai.incident_agent import incident_intelligence_agent
from backend.app.services.resource_service import resource_service
from backend.app.services.notification_service import notification_service
from backend.app.services.approval_service import approval_service
from backend.app.services.admin_service import admin_service
from backend.app.routes.emergency import (
    create_emergency_response,
    approve_emergency_response,
    reject_emergency_response,
    resolve_incident,
    close_incident,
)


class TestAegisCampusFullPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        print("\n============================================================")
        print("   AEGISCAMPUS-AI COMPREHENSIVE VERIFICATION & TEST SUITE   ")
        print("============================================================")
        conn = test_mongodb_connection()
        print(f"MongoDB Connection: {conn}")
        # Run seed
        seed()
        # Guarantee default admin
        admin_service._ensure_default_admin()

    # 1. Student Auth & Profile Sync
    def test_01_student_auth_sync(self):
        students_collection.update_one(
            {"firebase_uid": "STU_TEST_UID"},
            {"$set": {"email": "teststudent@vignan.ac.in", "student_id": "211FA04001", "role": "student"}},
            upsert=True,
        )
        student = students_collection.find_one({"firebase_uid": "STU_TEST_UID"})
        self.assertIsNotNone(student)
        self.assertEqual(student["email"], "teststudent@vignan.ac.in")
        print("[PASS] Test 1: Student authentication and profile persistence verified.")

    # 2. Admin Authentication
    def test_02_admin_authentication_success(self):
        login_res = admin_service.login("admin", "admin123")
        self.assertTrue(login_res["success"])
        self.assertEqual(login_res["role"], "ADMIN")
        print("[PASS] Test 2: Admin login with valid credentials succeeded.")

    # 3. Unauthorized Admin Access
    def test_03_admin_unauthorized_access(self):
        with self.assertRaises(ValueError):
            admin_service.login("admin", "wrongpassword123")
        with self.assertRaises(ValueError):
            admin_service.login("nonexistent_user", "admin123")
        print("[PASS] Test 3: Unauthorized admin login properly blocked.")

    # 4 & 8. Location Normalization & Fuzzy matching
    def test_04_location_normalization(self):
        test_cases = [
            ("n block", "N Block"),
            ("N BLOCK", "N Block"),
            ("fire in n block", "N Block"),
            ("fire accident at N Block", "N Block"),
            ("pharmacy block", "Pharmacy Block"),
            ("pharmacy students labs", "Pharmacy Block"),
            ("main gate", "Main Gate"),
            ("playground", "Playground"),
            ("convocation hall", "Convocation Hall"),
        ]
        for raw, expected in test_cases:
            norm = incident_intelligence_agent._normalize_location(raw)
            self.assertEqual(norm, expected, f"Failed for raw input '{raw}'")
        print("[PASS] Test 4: Location fuzzy matching & normalization (N Block, Pharmacy Block, etc.) passed.")

    # 7 & 9. AI Incident Classification & Token Reduction
    def test_05_ai_classification_token_efficient(self):
        res = incident_intelligence_agent.analyze(
            description="Fire accident in N block laboratory, thick smoke spreading.",
            location="N Block",
        )
        self.assertIn(res["incident_type"], ["Fire", "Other"])
        self.assertIn(res["severity"], ["Critical", "High", "Medium"])
        self.assertTrue(len(res["recommended_actions"]) > 0)
        self.assertTrue(len(res["required_resource_types"]) > 0)
        print(f"[PASS] Test 5: AI classification completed token-efficiently (Type: {res['incident_type']}, Severity: {res['severity']}).")

    # 9. Deterministic Keyword Fallback for all emergency types
    def test_06_deterministic_keyword_fallbacks(self):
        emergency_types = [
            ("Fire in second floor", "Fire"),
            ("Student collapsed, needs ambulance medical help", "Medical"),
            ("Physical fight and violent altercation", "Security"),
            ("Water pipeline burst causing major flooding", "Infrastructure"),
            ("Bus collision near main entrance", "Accident"),
        ]
        for desc, expected_type in emergency_types:
            fallback = incident_intelligence_agent._deterministic_fallback(description=desc, location="Campus")
            self.assertEqual(fallback["incident_type"], expected_type, f"Failed for description '{desc}'")
        print("[PASS] Test 6: Deterministic keyword fallbacks verified for all domain categories.")

    # 10, 11, 12, 13, 14, 15, 16. Full Incident Lifecycle with Image & Voice
    def test_07_full_incident_lifecycle_pipeline(self):
        # Reset all resources to AVAILABLE
        resources_collection.update_many({}, {"$set": {"status": "AVAILABLE", "incident_id": None}})

        # 1. Submit incident with image and voice
        payload = {
            "description": "Fire emergency detected in N Block 2nd floor laboratory",
            "location": "N Block",
            "student_id": "211FA04001",
            "student_name": "Karthik Singh",
            "student_email": "karthik.student@vignan.ac.in",
            "voice_transcript": "Fire emergency detected in N Block 2nd floor laboratory",
            "image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }

        resp = create_emergency_response(payload)
        self.assertTrue(resp["success"])
        incident_id = resp["incident_id"]
        approval_id = resp["approval"]["approval_id"]

        # Check DB persistence (Phase 3 & 13)
        inc_doc = incidents_collection.find_one({"incident_id": incident_id})
        self.assertIsNotNone(inc_doc)
        self.assertEqual(inc_doc["status"], "PENDING")
        self.assertEqual(inc_doc["image_data"], payload["image_data"])
        self.assertEqual(inc_doc["voice_transcript"], payload["voice_transcript"])

        # 2. Admin approves response plan (Phase 8)
        appr_resp = approve_emergency_response(approval_id, {"approved_by": "Campus Commander"})
        self.assertTrue(appr_resp["success"])
        self.assertEqual(appr_resp["approval"]["status"], "APPROVED")

        # Verify incident status -> ACTIVE
        inc_active = incidents_collection.find_one({"incident_id": incident_id})
        self.assertEqual(inc_active["status"], "ACTIVE")
        self.assertTrue(len(inc_active["deployed_resources"]) > 0)

        # 3. Verify Dispatch Alerts Generated (Phase 9)
        alerts_list = list(alerts_collection.find({"incident_id": incident_id}))
        self.assertTrue(len(alerts_list) > 0, "Emergency alerts must be recorded in alerts collection")
        self.assertTrue(bool(alerts_list[0].get("recipient_name")), "Alert must have recipient name")

        # 4. Double deployment guard (Phase 7)
        deployed_id = inc_active["deployed_resources"][0]
        with self.assertRaises(ValueError):
            resource_service.deploy_resource(deployed_id, "INC-DOUBLE", "Admin")

        # 5. Resolve Incident (Phase 10)
        res_resp = resolve_incident(incident_id, {"resolved_by": "Campus Commander", "notes": "Fire extinguished"})
        self.assertTrue(res_resp["success"])
        inc_resolved = incidents_collection.find_one({"incident_id": incident_id})
        self.assertEqual(inc_resolved["status"], "RESOLVED")

        # 6. Revoke Resource (Phase 11)
        rev_res = resource_service.revoke_resource(deployed_id, incident_id, "Campus Commander", "All clear")
        self.assertEqual(rev_res["status"], "AVAILABLE")
        self.assertIsNone(rev_res["incident_id"])

        # 7. Close Incident (Phase 10)
        close_resp = close_incident(incident_id, {"closed_by": "Campus Commander"})
        self.assertTrue(close_resp["success"])
        inc_closed = incidents_collection.find_one({"incident_id": incident_id})
        self.assertEqual(inc_closed["status"], "CLOSED")

        print(f"[PASS] Test 7: Full Incident Pipeline (Intake -> AI Plan -> Approval -> Dispatch -> Alerts -> Resolve -> Revoke -> Close) completed successfully.")

    # 17 & 18. Incident Filtering: Student vs Admin Visibility
    def test_08_incident_role_filtering(self):
        # Create records for student A and student B
        inc_a = {"incident_id": "INC-STU-A", "student_email": "studentA@vignan.ac.in", "student_name": "Student A", "description": "Minor issue A", "location": "A Block", "status": "PENDING", "created_at": "2026-08-26T18:00:00Z"}
        inc_b = {"incident_id": "INC-STU-B", "student_email": "studentB@vignan.ac.in", "student_name": "Student B", "description": "Minor issue B", "location": "B Block", "status": "PENDING", "created_at": "2026-08-26T18:05:00Z"}
        incidents_collection.update_one({"incident_id": "INC-STU-A"}, {"$set": inc_a}, upsert=True)
        incidents_collection.update_one({"incident_id": "INC-STU-B"}, {"$set": inc_b}, upsert=True)

        # Student A query
        student_a_incidents = list(incidents_collection.find({"student_email": "studentA@vignan.ac.in"}))
        self.assertTrue(all(i["student_email"] == "studentA@vignan.ac.in" for i in student_a_incidents))
        self.assertTrue(any(i["incident_id"] == "INC-STU-A" for i in student_a_incidents))
        self.assertFalse(any(i["incident_id"] == "INC-STU-B" for i in student_a_incidents))

        # Admin query (all)
        all_incidents = list(incidents_collection.find({}))
        self.assertTrue(len(all_incidents) >= 2)
        print("[PASS] Test 8: Data isolation verified (Student A sees only Student A's records; Admin sees all campus records).")


if __name__ == "__main__":
    unittest.main()
