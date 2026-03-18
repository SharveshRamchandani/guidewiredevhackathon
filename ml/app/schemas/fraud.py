from pydantic import BaseModel
from typing import Literal, Optional

class FraudScoreInput(BaseModel):
    claim_id: str
    worker_id: str
    gps_zone_match: bool
    claim_velocity_7d: int
    historical_zone_presence: float
    time_since_event_seconds: int
    platform_activity_during_event: float
    plan_name: Optional[str] = None
    season: Optional[str] = None
    event_type: Optional[str] = None
    plan_base_premium: Optional[float] = None
    plan_max_payout: Optional[float] = None
    claimed_amount: Optional[float] = None
    claimed_amount_ratio: Optional[float] = None
    prior_rejections_90d: Optional[int] = None

class FraudScoreOutput(BaseModel):
    fraud_score: float
    decision: Literal["auto_approve", "manual_review", "auto_reject"]
    reason: str
