from pydantic import BaseModel
from typing import Literal


class DisruptionInput(BaseModel):
    zone_id: str
    temperature_celsius: float
    rainfall_mm: float
    aqi_score: int
    wind_speed_kmh: float = 0.0


class DisruptionOutput(BaseModel):
    zone_id: str
    disruption_probability: float
    disruption_confidence: float          # 0–1: distance from decision boundary
    disruption_type: Literal["none", "heatwave", "flood", "heavy_rain", "poor_air_quality", "storm", "compound"]
    severity: Literal["none", "low", "moderate", "high", "extreme"]
    threshold_breached: bool
    trigger_reason: str
    income_impact_factor: float           # 0–1, expected proportional income drop
