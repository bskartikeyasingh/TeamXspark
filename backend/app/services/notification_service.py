import logging
from datetime import datetime, timezone
from typing import Any
import uuid

from backend.app.database.mongodb import alerts_collection

logger = logging.getLogger("notification_service")


class NotificationService:
    """Service abstraction for campus emergency alerts and driver/personnel notifications."""

    def create_alert(
        self,
        incident_id: str,
        resource_id: str,
        resource_type: str,
        recipient_name: str,
        recipient_phone: str,
        incident_location: str,
        incident_type: str,
        severity: str,
        custom_message: str | None = None,
    ) -> dict[str, Any]:
        """Creates and records an emergency dispatch alert in MongoDB and sends notifications."""
        alert_id = f"ALT-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

        message = (
            custom_message
            or (
                f"🚨 URGENT CAMPUS EMERGENCY: {severity.upper()} {incident_type} reported at {incident_location}. "
                f"Unit {resource_id} assigned. Proceed immediately to {incident_location} and coordinate with "
                f"the Emergency Command Center."
            )
        )

        alert_doc = {
            "alert_id": alert_id,
            "incident_id": incident_id,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "recipient_name": recipient_name or "Emergency Responder",
            "recipient_phone": recipient_phone or "N/A",
            "incident_location": incident_location,
            "incident_type": incident_type,
            "severity": severity,
            "message": message,
            "status": "SENT",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Store in MongoDB
        try:
            alerts_collection.insert_one(alert_doc.copy())
        except Exception as e:
            logger.error(f"Failed to persist alert to MongoDB: {e}")

        # Send notifications through providers if configured
        if recipient_phone and recipient_phone != "N/A":
            self.send_sms(recipient_phone, message)

        return alert_doc

    def send_sms(self, phone_number: str, message: str) -> bool:
        """SMS delivery abstraction (can be connected to Twilio/AWS SNS/Fast2SMS)."""
        logger.info(f"[SMS DISPATCH] To: {phone_number} | Message: {message}")
        return True

    def send_email(self, email: str, subject: str, message: str) -> bool:
        """Email delivery abstraction (can be connected to SendGrid/SMTP)."""
        logger.info(f"[EMAIL DISPATCH] To: {email} | Subject: {subject} | Message: {message}")
        return True

    def get_all_alerts(self, limit: int = 100) -> list[dict[str, Any]]:
        """Retrieve recent alerts for Admin dashboard."""
        try:
            alerts = list(
                alerts_collection.find({}, {"_id": 0})
                .sort("created_at", -1)
                .limit(limit)
            )
            return alerts
        except Exception as e:
            logger.error(f"Failed to get alerts: {e}")
            return []

    def get_alerts_for_incident(self, incident_id: str) -> list[dict[str, Any]]:
        try:
            return list(
                alerts_collection.find({"incident_id": incident_id}, {"_id": 0})
                .sort("created_at", 1)
            )
        except Exception as e:
            logger.error(f"Failed to get incident alerts: {e}")
            return []


notification_service = NotificationService()
