from pydantic import BaseModel
<<<<<<< HEAD
from typing import Literal
=======
from typing import Literal, List
>>>>>>> 1724938fd1cb01005608d089b833a0da6eaa3633

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
<<<<<<< HEAD
=======
    top_risk_factors: List[str]       # Top 3 features by importance from Random Forest
>>>>>>> 1724938fd1cb01005608d089b833a0da6eaa3633
