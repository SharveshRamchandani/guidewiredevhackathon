from pydantic import BaseModel
from typing import Literal, List

class RiskScoreInput(BaseModel):
    worker_id: str
    zone_id: int
    platform: str
    months_active: int
    avg_daily_hours: float
    past_claims_count: int
    zone_flood_risk: float
    zone_heat_risk: float

class RiskScoreOutput(BaseModel):
    risk_score: float
    risk_label: Literal["low", "medium", "high"]
    suggested_premium: float
    coverage_recommended: int
    top_risk_factors: List[str]       # Top 3 features by importance from Random Forest
