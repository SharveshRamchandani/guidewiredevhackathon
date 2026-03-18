import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import APIRouter
from app.schemas.fraud import FraudScoreInput, FraudScoreOutput

router = APIRouter(prefix="/ml", tags=["Fraud"])

_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "saved" / "fraud_model.joblib"
_model_bundle = None

LEGACY_FEATURES = [
    "gps_zone_match",
    "claim_velocity_7d",
    "historical_zone_presence",
    "time_since_event_seconds",
    "platform_activity_during_event",
]

DEFAULT_FEATURES = {
    "plan_name": "basic",
    "season": "monsoon",
    "event_type": "Platform Outage",
    "plan_base_premium": 49.0,
    "plan_max_payout": 1000.0,
    "claimed_amount": 250.0,
    "claimed_amount_ratio": 0.25,
    "prior_rejections_90d": 0,
}


def _get_model_bundle():
    global _model_bundle
    if _model_bundle is None and _MODEL_PATH.exists():
        _model_bundle = joblib.load(_MODEL_PATH)
    return _model_bundle


def _build_feature_row(data: FraudScoreInput, feature_columns: list[str]) -> dict:
    plan_max_payout = data.plan_max_payout if data.plan_max_payout is not None else DEFAULT_FEATURES["plan_max_payout"]
    claimed_amount = data.claimed_amount if data.claimed_amount is not None else DEFAULT_FEATURES["claimed_amount"]
    claimed_amount_ratio = data.claimed_amount_ratio
    if claimed_amount_ratio is None:
        claimed_amount_ratio = claimed_amount / plan_max_payout if plan_max_payout else DEFAULT_FEATURES["claimed_amount_ratio"]

    base = {
        "gps_zone_match": int(data.gps_zone_match),
        "claim_velocity_7d": data.claim_velocity_7d,
        "historical_zone_presence": data.historical_zone_presence,
        "time_since_event_seconds": data.time_since_event_seconds,
        "platform_activity_during_event": data.platform_activity_during_event,
        "plan_name": data.plan_name or DEFAULT_FEATURES["plan_name"],
        "season": data.season or DEFAULT_FEATURES["season"],
        "event_type": data.event_type or DEFAULT_FEATURES["event_type"],
        "plan_base_premium": data.plan_base_premium if data.plan_base_premium is not None else DEFAULT_FEATURES["plan_base_premium"],
        "plan_max_payout": plan_max_payout,
        "claimed_amount": claimed_amount,
        "claimed_amount_ratio": round(float(claimed_amount_ratio), 4),
        "prior_rejections_90d": data.prior_rejections_90d if data.prior_rejections_90d is not None else DEFAULT_FEATURES["prior_rejections_90d"],
    }
    return {column: base[column] for column in feature_columns}


@router.post("/fraud-score", response_model=FraudScoreOutput)
def calculate_fraud_score(data: FraudScoreInput):
    bundle = _get_model_bundle()

    if isinstance(bundle, dict) and "pipeline" in bundle:
        feature_columns = bundle.get("feature_columns", LEGACY_FEATURES)
        row = _build_feature_row(data, feature_columns)
        features = pd.DataFrame([row], columns=feature_columns)
        pipeline = bundle["pipeline"]

        prediction = pipeline.predict(features)[0]
        if prediction == -1:
            fraud_score = 0.85
            is_model_fraud = True
        else:
            raw = pipeline.score_samples(features)[0]
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
            is_model_fraud = False

    elif bundle is not None:
        features = pd.DataFrame([{
            "gps_zone_match": int(data.gps_zone_match),
            "claim_velocity_7d": data.claim_velocity_7d,
            "historical_zone_presence": data.historical_zone_presence,
            "time_since_event_seconds": data.time_since_event_seconds,
            "platform_activity_during_event": data.platform_activity_during_event,
        }])
        prediction = bundle.predict(features)[0]
        if prediction == -1:
            fraud_score = 0.85
            is_model_fraud = True
        else:
            raw = bundle.score_samples(features)[0]
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
            is_model_fraud = False
    else:
        fraud_score = 0.10
        is_model_fraud = False

    reasons = []

    if not data.gps_zone_match:
        fraud_score = max(fraud_score, 0.85)
        reasons.append("GPS zone mismatch")

    if data.claim_velocity_7d > 5:
        fraud_score = max(fraud_score, 0.80)
        reasons.append(f"High claim velocity ({data.claim_velocity_7d} claims in 7 days)")

    if data.time_since_event_seconds < 300:
        fraud_score = max(fraud_score, 0.70)
        reasons.append("Claim filed within 5 min of event")

    if data.platform_activity_during_event < 0.2:
        fraud_score = max(fraud_score, 0.65)
        reasons.append("Very low platform activity during event")

    if data.claimed_amount_ratio is not None and data.claimed_amount_ratio > 0.85:
        fraud_score = max(fraud_score, 0.70)
        reasons.append("Claim amount near policy maximum")

    if data.prior_rejections_90d is not None and data.prior_rejections_90d >= 2:
        fraud_score = max(fraud_score, 0.68)
        reasons.append("Repeated recent rejections")

    if is_model_fraud and not reasons:
        reasons.append("Isolation Forest anomaly detected")

    if fraud_score < 0.40:
        decision = "auto_approve"
        reason = "Low fraud probability"
    elif fraud_score < 0.60:
        decision = "manual_review"
        reason = f"Moderate risk: {', '.join(reasons) or 'anomaly flagged for review'}"
    else:
        decision = "auto_reject"
        reason = f"High fraud probability: {', '.join(reasons) or 'anomaly detected'}"

    return FraudScoreOutput(
        fraud_score=round(fraud_score, 4),
        decision=decision,  # type: ignore[arg-type]
        reason=reason,
    )
