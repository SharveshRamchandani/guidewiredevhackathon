from fastapi import APIRouter
from app.schemas.premium import PremiumInput, PremiumOutput
from app.services.premium_engine import calculate_premium

router = APIRouter(prefix="/ml", tags=["Premium"])


@router.post("/premium", response_model=PremiumOutput)
def get_premium(data: PremiumInput):
    """
    AI Dynamic Weekly Premium Pricing — personalises INR premium using
    risk label, city climate risk, real-time disruption probability,
    and worker vulnerability score.
    """
    result = calculate_premium(
        risk_label=data.risk_label,
        city_climate_risk=data.city_climate_risk,
        disruption_probability=data.disruption_probability,
        vulnerability_score=data.vulnerability_score,
    )
    return PremiumOutput(worker_id=data.worker_id, **result)
