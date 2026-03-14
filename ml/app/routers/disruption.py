from fastapi import APIRouter
from app.schemas.disruption import DisruptionInput, DisruptionOutput
from app.services.disruption_model import assess_disruption
from app.services.city_risk import get_heatmap_data, get_insights

router = APIRouter(prefix="/ml", tags=["Disruption"])


@router.post("/disruption-score", response_model=DisruptionOutput)
def detect_disruption(data: DisruptionInput):
    """
    AI Disruption Detection — computes disruption probability from weather + AQI.
    Drives parametric trigger decisions.
    Returns disruption_confidence: how certain the model is (distance from 0.5 boundary).
    """
    result = assess_disruption(
        temperature_celsius=data.temperature_celsius,
        rainfall_mm=data.rainfall_mm,
        aqi_score=data.aqi_score,
        wind_speed_kmh=data.wind_speed_kmh,
    )
    return DisruptionOutput(zone_id=data.zone_id, **result)


@router.get("/heatmap", tags=["City Risk"])
def city_risk_heatmap(city: str = None):
    """AI City Risk Heatmap — composite risk scores for Indian metro cities."""
    return {"cities": get_heatmap_data(city)}


@router.get("/correlations", tags=["Insights"])
def disruption_correlations(factor: str = None):
    """AI Disruption Correlation Engine — env factor → income impact insights."""
    return {"insights": get_insights(factor)}
