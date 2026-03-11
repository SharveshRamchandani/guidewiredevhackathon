from pydantic import BaseModel
from typing import Literal, Dict, Any


class TriggerInput(BaseModel):
    worker_id: str
    zone_id: str
    policy_id: str
    # Environmental inputs
    temperature_celsius: float
    rainfall_mm: float
    aqi_score: int
    wind_speed_kmh: float = 0.0
    # Fraud check inputs
    gps_zone_match: bool = True
    claim_velocity_7d: int = 0
    historical_zone_presence: float = 0.85
    time_since_event_seconds: int = 3600
    platform_activity_during_event: float = 0.7
    # Worker income profile
    worker_daily_orders: int = 15
    avg_income_per_order: float = 80.0
    risk_label: str = "medium"


class TriggerOutput(BaseModel):
    worker_id: str
    policy_id: str
    zone_id: str
    payout_triggered: bool
    payout_amount_inr: float
    disruption_probability: float
    disruption_confidence: float          # 0–1: model certainty score
    disruption_type: str
    fraud_score: float
    fraud_cleared: bool
    expected_income_loss_inr: float
    decision_reason: str
    ai_explanation: str
    model_metadata: Dict[str, Any]    # risk + fraud model accuracy metrics
    status: Literal["approved", "pending_review", "rejected", "no_disruption"]
