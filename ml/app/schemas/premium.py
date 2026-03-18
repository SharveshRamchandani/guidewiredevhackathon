from pydantic import BaseModel
from typing import Literal


class PremiumInput(BaseModel):
    worker_id: str
    plan_name: Literal["nano", "basic", "standard", "premium"]
    plan_base_premium: float
    plan_max_payout: float
    covered_event_count: int
    avg_copay: float
    risk_label: Literal["low", "medium", "high"]
    risk_score: float
    city_climate_risk: float
    disruption_probability: float
    vulnerability_score: float = 0.0


class PremiumOutput(BaseModel):
    worker_id: str
    weekly_premium_inr: float
    coverage_amount_inr: float
    pricing_tier: str
    breakdown: dict
