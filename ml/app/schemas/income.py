from pydantic import BaseModel


class IncomeLossInput(BaseModel):
    worker_id: str
    worker_daily_orders: int
    avg_income_per_order: float       # INR
    disruption_type: str
    disruption_severity: float        # 0–1, from DisruptionOutput
    days_affected: int = 7
    risk_label: str = "medium"


class IncomeLossOutput(BaseModel):
    worker_id: str
    expected_daily_loss_inr: float
    expected_weekly_loss_inr: float
    loss_percentage: float
    payout_recommended_inr: float


class IncomeShockInput(BaseModel):
    worker_id: str
    daily_earnings: list[float]       # last N days (min 7)
    daily_orders: list[int]


class IncomeShockOutput(BaseModel):
    worker_id: str
    shock_detected: bool
    shock_score: float
    normal_baseline_inr: float
    current_avg_inr: float
    drop_percentage: float
