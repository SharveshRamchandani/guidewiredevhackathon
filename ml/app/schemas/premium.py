from pydantic import BaseModel
from typing import Literal


class PremiumInput(BaseModel):
    worker_id: str
    risk_label: Literal["low", "medium", "high"]
    city_climate_risk: float
    disruption_probability: float
    vulnerability_score: float


class PremiumOutput(BaseModel):
    worker_id: str
    weekly_premium_inr: float
    coverage_amount_inr: float
    pricing_tier: str
    breakdown: dict
