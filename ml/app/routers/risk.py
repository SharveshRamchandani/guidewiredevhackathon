import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import APIRouter
from app.schemas.risk import RiskScoreInput, RiskScoreOutput

router = APIRouter(prefix="/ml", tags=["Risk"])

_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "saved" / "risk_model.joblib"
_model_bundle = None

LEGACY_FEATURE_NAMES = [
    "months_active",
    "avg_daily_hours",
    "past_claims_count",
    "zone_flood_risk",
    "zone_heat_risk",
]

DEFAULT_FEATURES = {
    "plan_base_premium": 49.0,
    "plan_max_payout": 1000.0,
    "covered_event_count": 4,
    "avg_copay": 0.2,
}


def _get_model_bundle():
    global _model_bundle
    if _model_bundle is None and _MODEL_PATH.exists():
        _model_bundle = joblib.load(_MODEL_PATH)
    return _model_bundle


def _build_feature_row(data: RiskScoreInput, feature_columns: list[str]) -> dict:
    base_row = {
        "platform": data.platform or "Swiggy",
        "months_active": data.months_active,
        "avg_daily_hours": data.avg_daily_hours,
        "past_claims_count": data.past_claims_count,
        "zone_flood_risk": data.zone_flood_risk,
        "zone_heat_risk": data.zone_heat_risk,
        "plan_base_premium": data.plan_base_premium if data.plan_base_premium is not None else DEFAULT_FEATURES["plan_base_premium"],
        "plan_max_payout": data.plan_max_payout if data.plan_max_payout is not None else DEFAULT_FEATURES["plan_max_payout"],
        "covered_event_count": data.covered_event_count if data.covered_event_count is not None else DEFAULT_FEATURES["covered_event_count"],
        "avg_copay": data.avg_copay if data.avg_copay is not None else DEFAULT_FEATURES["avg_copay"],
    }
    return {column: base_row[column] for column in feature_columns}


@router.post("/risk-score", response_model=RiskScoreOutput)
def calculate_risk_score(data: RiskScoreInput):
    bundle = _get_model_bundle()

    if isinstance(bundle, dict) and "pipeline" in bundle:
        feature_columns = bundle.get("feature_columns", LEGACY_FEATURE_NAMES)
        row = _build_feature_row(data, feature_columns)
        features = pd.DataFrame([row], columns=feature_columns)

        pipeline = bundle["pipeline"]
        proba = pipeline.predict_proba(features)[0]
        risk_label = str(pipeline.classes_[np.argmax(proba)])
        risk_score = round(float(max(proba)), 4)
        top_risk_factors = list(bundle.get("top_features", ["zone_heat_risk", "months_active", "zone_flood_risk"]))[:3]

    elif bundle is not None:
        features = [[
            data.months_active,
            data.avg_daily_hours,
            data.past_claims_count,
            data.zone_flood_risk,
            data.zone_heat_risk,
        ]]
        proba = bundle.predict_proba(features)[0]
        risk_label = str(bundle.classes_[np.argmax(proba)])
        risk_score = round(float(max(proba)), 4)
        importances = bundle.feature_importances_
        top_risk_factors = [
            name for name, _ in sorted(
                zip(LEGACY_FEATURE_NAMES, importances),
                key=lambda item: item[1],
                reverse=True,
            )[:3]
        ]
    else:
        risk_label = "medium"
        risk_score = 0.62
        top_risk_factors = ["zone_flood_risk", "months_active", "zone_heat_risk"]

    plan_base = data.plan_base_premium if data.plan_base_premium is not None else DEFAULT_FEATURES["plan_base_premium"]
    plan_cap = data.plan_max_payout if data.plan_max_payout is not None else DEFAULT_FEATURES["plan_max_payout"]
    hours_factor = min(max(data.avg_daily_hours / 8.0, 0.7), 1.35)
    risk_factor = {"low": 0.92, "medium": 1.05, "high": 1.18}[risk_label]

    reference_premium = round(plan_base * hours_factor * risk_factor, 2)
    reference_coverage_amount = int(round(plan_cap))

    return RiskScoreOutput(
        risk_score=risk_score,
        risk_label=risk_label,  # type: ignore[arg-type]
        risk_adjusted_reference_premium=reference_premium,
        reference_coverage_amount=reference_coverage_amount,
        top_risk_factors=top_risk_factors,
    )
