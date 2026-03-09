from fastapi import APIRouter
from app.schemas.fraud import FraudScoreInput, FraudScoreOutput

router = APIRouter(prefix="/ml", tags=["Fraud"])

@router.post("/fraud-score", response_model=FraudScoreOutput)
def calculate_fraud_score(data: FraudScoreInput):
    # TODO: Load real Isolation Forest model from models/saved/fraud_model.joblib
    # For now, return mock data based on input simple rules
    fraud_score = 0.15
    decision = "auto_approve"
    
    if data.claim_velocity_7d > 5 or not data.gps_zone_match:
        fraud_score = 0.75
        decision = "auto_reject"
    elif data.claim_velocity_7d > 2:
        fraud_score = 0.45
        decision = "manual_review"

    return FraudScoreOutput(
        fraud_score=fraud_score,
        decision=decision,  # type: ignore
        reason="Mocked reason based on basic rules"
    )
