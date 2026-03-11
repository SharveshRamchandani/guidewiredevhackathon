from fastapi import APIRouter
from app.schemas.income import (
    IncomeLossInput, IncomeLossOutput,
    IncomeShockInput, IncomeShockOutput,
)
from app.services.income_loss import predict_income_loss
from app.services.income_shock import detect_income_shock

router = APIRouter(prefix="/ml", tags=["Income"])


@router.post("/income-loss", response_model=IncomeLossOutput)
def predict_loss(data: IncomeLossInput):
    """AI Income Loss Prediction — estimates INR payout for a disruption event."""
    result = predict_income_loss(
        worker_daily_orders=data.worker_daily_orders,
        avg_income_per_order=data.avg_income_per_order,
        disruption_type=data.disruption_type,
        disruption_severity=data.disruption_severity,
        days_affected=data.days_affected,
        risk_label=data.risk_label,
    )
    return IncomeLossOutput(worker_id=data.worker_id, **result)


@router.post("/income-shock", response_model=IncomeShockOutput)
def detect_shock(data: IncomeShockInput):
    """AI Income Shock Detector — flags sudden anomalous drops in worker earnings."""
    result = detect_income_shock(
        daily_earnings=data.daily_earnings,
        daily_orders=data.daily_orders,
    )
    return IncomeShockOutput(worker_id=data.worker_id, **result)
