import joblib
import numpy as np
from pathlib import Path
from fastapi import APIRouter
from app.schemas.risk import RiskScoreInput, RiskScoreOutput

router = APIRouter(prefix="/ml", tags=["Risk"])

_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "saved" / "risk_model.joblib"
_model = None

FEATURE_NAMES = [
    "months_active",
    "avg_daily_hours",
    "past_claims_count",
    "zone_flood_risk",
    "zone_heat_risk",
]


def _get_model():
    global _model
    if _model is None and _MODEL_PATH.exists():
        _model = joblib.load(_MODEL_PATH)
    return _model


@router.post("/risk-score", response_model=RiskScoreOutput)
def calculate_risk_score(data: RiskScoreInput):
    model = _get_model()

    features = [[
        data.months_active,
        data.avg_daily_hours,
        data.past_claims_count,
        data.zone_flood_risk,
        data.zone_heat_risk,
    ]]

    if model is not None:
        proba      = model.predict_proba(features)[0]
        risk_label = str(model.classes_[np.argmax(proba)])
        risk_score = round(float(max(proba)), 4)

        # ── Improvement 4: Feature Importance Explainability ──────────
        # Pull sorted feature importances from the trained Random Forest
        importances = model.feature_importances_
        sorted_features = sorted(
            zip(FEATURE_NAMES, importances),
            key=lambda x: x[1],
            reverse=True,
        )
        top_risk_factors = [name for name, _ in sorted_features[:3]]

    else:
        # Graceful fallback if model not yet trained
        risk_label       = "medium"
        risk_score       = 0.62
        top_risk_factors = ["zone_flood_risk", "months_active", "zone_heat_risk"]

    base      = {"low": 40.0, "medium": 70.0, "high": 120.0}
    coverage  = {"low": 400,  "medium": 700,   "high": 1200}
    hours_fac = data.avg_daily_hours / 8.0
    suggested_premium    = round(base[risk_label] * hours_fac, 2)
    coverage_recommended = coverage[risk_label]

    return RiskScoreOutput(
        risk_score=risk_score,
        risk_label=risk_label,                  # type: ignore
        suggested_premium=suggested_premium,
        coverage_recommended=coverage_recommended,
        top_risk_factors=top_risk_factors,
    )