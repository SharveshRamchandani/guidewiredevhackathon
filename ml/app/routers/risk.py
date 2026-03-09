from fastapi import APIRouter
from app.schemas.risk import RiskScoreInput, RiskScoreOutput

router = APIRouter(prefix="/ml", tags=["Risk"])

@router.post("/risk-score", response_model=RiskScoreOutput)
def calculate_risk_score(data: RiskScoreInput):
    # TODO: Load real Random Forest model from models/saved/risk_model.joblib
    # For now, return mock data
    return RiskScoreOutput(
        risk_score=0.62,
        risk_label="medium",
        suggested_premium=58.40,
        coverage_recommended=600
    )