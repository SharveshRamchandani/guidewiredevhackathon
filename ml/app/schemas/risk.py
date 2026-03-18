from pydantic import BaseModel
from typing import Literal, List, Optional

class RiskScoreInput(BaseModel):
    worker_id: str
    zone_id: str | int
    platform: str
    months_active: int
    avg_daily_hours: float
    past_claims_count: int
    zone_flood_risk: float
    zone_heat_risk: float
    plan_base_premium: Optional[float] = None
    plan_max_payout: Optional[float] = None
    covered_event_count: Optional[int] = None
    avg_copay: Optional[float] = None

class RiskScoreOutput(BaseModel):
    risk_score: float
    risk_label: Literal["low", "medium", "high"]
    risk_adjusted_reference_premium: float
    reference_coverage_amount: int
    top_risk_factors: List[str]
