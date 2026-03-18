from fastapi import APIRouter
from app.schemas.premium import PremiumInput, PremiumOutput
from app.services.premium_engine import calculate_premium

router = APIRouter(prefix="/ml", tags=["Premium"])


@router.post("/premium", response_model=PremiumOutput)
def get_premium(data: PremiumInput):
    """
    Plan-aware dynamic weekly premium pricing.
    Uses DB-backed plan values as the pricing anchor and applies bounded
    multipliers from risk and hazard signals.
    """
    result = calculate_premium(
        plan_name=data.plan_name,
        plan_base_premium=data.plan_base_premium,
        plan_max_payout=data.plan_max_payout,
        covered_event_count=data.covered_event_count,
        avg_copay=data.avg_copay,
        risk_label=data.risk_label,
        risk_score=data.risk_score,
        city_climate_risk=data.city_climate_risk,
        disruption_probability=data.disruption_probability,
        vulnerability_score=data.vulnerability_score,
    )
    return PremiumOutput(worker_id=data.worker_id, **result)
