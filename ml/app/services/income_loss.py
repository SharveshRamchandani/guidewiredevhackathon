"""
AI Income Loss Prediction Model
Estimates INR income loss based on disruption type and severity.
Demand reduction factors derived from real event-impact research.
"""

# How much delivery demand drops per disruption type (research-backed)
DEMAND_REDUCTION = {
    "heatwave":         0.45,
    "flood":            0.80,
    "heavy_rain":       0.55,
    "poor_air_quality": 0.30,
    "storm":            0.70,
    "compound":         0.85,
    "none":             0.05,
}

COVERAGE_CAP = {"low": 400, "medium": 700, "high": 1200}


def predict_income_loss(
    worker_daily_orders: int,
    avg_income_per_order: float,
    disruption_type: str,
    disruption_severity: float,
    days_affected: int = 7,
    risk_label: str = "medium",
) -> dict:
    base_daily_income    = worker_daily_orders * avg_income_per_order
    reduction_factor     = DEMAND_REDUCTION.get(disruption_type, 0.30)
    effective_reduction  = reduction_factor * disruption_severity

    daily_loss  = round(base_daily_income * effective_reduction, 2)
    weekly_loss = round(daily_loss * days_affected, 2)
    loss_pct    = round(effective_reduction * 100, 1)

    cap    = COVERAGE_CAP.get(risk_label, 700)
    payout = round(min(weekly_loss, cap), 2)

    return {
        "expected_daily_loss_inr":  daily_loss,
        "expected_weekly_loss_inr": weekly_loss,
        "loss_percentage":          loss_pct,
        "payout_recommended_inr":   payout,
    }
