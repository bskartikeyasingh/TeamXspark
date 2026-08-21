from typing import Optional

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    description: str = Field(..., min_length=3)
    location: Optional[str] = None
    source: str = "text"


class IncidentResponse(BaseModel):
    incident_id: str
    description: str
    incident_type: str
    severity: str
    location: str
    affected_people: int
    confidence: int
    status: str
    source: str