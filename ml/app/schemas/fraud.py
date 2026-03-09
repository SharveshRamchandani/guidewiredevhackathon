from pydantic import BaseModel
from typing import Literal

class FraudScoreInput(BaseModel):
    claim_id: str
    worker_id: str
    gps_zone_match: bool
    claim_velocity_7d: int
    historical_zone_presence: float
    time_since_event_seconds: int
    platform_activity_during_event: float

class FraudScoreOutput(BaseModel):
    fraud_score: float
    decision: Literal["auto_approve", "manual_review", "auto_reject"]
    reason: str
