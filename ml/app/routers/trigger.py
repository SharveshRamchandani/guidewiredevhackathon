"""
AI Parametric Trigger Engine - core orchestration router.
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import APIRouter
from app.schemas.trigger import TriggerInput, TriggerOutput
from app.services.disruption_model import assess_disruption
from app.services.income_loss import predict_income_loss
from app.services.ai_explainer import generate_payout_explanation
from app.services.model_info import get_model_metadata

router = APIRouter(prefix="/ml", tags=["Trigger"])

_FRAUD_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "saved" / "fraud_model.joblib"
_fraud_model_bundle = None

DISRUPTION_THRESHOLD = 0.39
FRAUD_REJECT_THRESHOLD = 0.60

FRAUD_DEFAULTS = {
    "plan_name": "basic",
    "season": "monsoon",
    "event_type": "Platform Outage",
    "plan_base_premium": 49.0,
    "plan_max_payout": 1000.0,
    "claimed_amount": 250.0,
    "claimed_amount_ratio": 0.25,
    "prior_rejections_90d": 0,
}

LEGACY_FRAUD_FEATURES = [
    "gps_zone_match",
    "claim_velocity_7d",
    "historical_zone_presence",
    "time_since_event_seconds",
    "platform_activity_during_event",
]


def _get_fraud_model_bundle():
    global _fraud_model_bundle
    if _fraud_model_bundle is None and _FRAUD_MODEL_PATH.exists():
        _fraud_model_bundle = joblib.load(_FRAUD_MODEL_PATH)
    return _fraud_model_bundle


def _adaptive_fraud_review_threshold(disruption_prob: float) -> float:
    if disruption_prob > 0.70:
        return 0.55
    return 0.40


def _build_fraud_feature_row(data: TriggerInput, event_type: str, payout_amount: float, feature_columns: list[str]) -> dict:
    plan_max_payout = data.plan_max_payout or FRAUD_DEFAULTS["plan_max_payout"]
    claimed_amount = data.claimed_amount if data.claimed_amount else payout_amount
    claimed_amount_ratio = data.claimed_amount_ratio if data.claimed_amount_ratio else (claimed_amount / plan_max_payout if plan_max_payout else 0.25)

    base = {
        "gps_zone_match": int(data.gps_zone_match),
        "claim_velocity_7d": data.claim_velocity_7d,
        "historical_zone_presence": data.historical_zone_presence,
        "time_since_event_seconds": data.time_since_event_seconds,
        "platform_activity_during_event": data.platform_activity_during_event,
        "plan_name": data.plan_name or FRAUD_DEFAULTS["plan_name"],
        "season": data.season or FRAUD_DEFAULTS["season"],
        "event_type": data.event_type or event_type or FRAUD_DEFAULTS["event_type"],
        "plan_base_premium": data.plan_base_premium or FRAUD_DEFAULTS["plan_base_premium"],
        "plan_max_payout": plan_max_payout,
        "claimed_amount": claimed_amount,
        "claimed_amount_ratio": round(float(claimed_amount_ratio), 4),
        "prior_rejections_90d": data.prior_rejections_90d,
    }
    return {column: base[column] for column in feature_columns}


def _score_fraud(data: TriggerInput, event_type: str, payout_amount: float) -> float:
    bundle = _get_fraud_model_bundle()

    if isinstance(bundle, dict) and "pipeline" in bundle:
        feature_columns = bundle.get("feature_columns", LEGACY_FRAUD_FEATURES)
        row = _build_fraud_feature_row(data, event_type, payout_amount, feature_columns)
        features = pd.DataFrame([row], columns=feature_columns)
        pipeline = bundle["pipeline"]
        prediction = pipeline.predict(features)[0]
        if prediction == -1:
            fraud_score = 0.85
        else:
            raw = pipeline.score_samples(features)[0]
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
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
        else:
            raw = bundle.score_samples(features)[0]
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
    else:
        fraud_score = 0.10

    if not data.gps_zone_match:
        fraud_score = max(fraud_score, 0.80)
    if data.claim_velocity_7d > 5:
        fraud_score = max(fraud_score, 0.75)
    if data.time_since_event_seconds < 300:
        fraud_score = max(fraud_score, 0.65)
    if data.platform_activity_during_event < 0.2:
        fraud_score = max(fraud_score, 0.60)
    if (data.claimed_amount_ratio or 0) > 0.85:
        fraud_score = max(fraud_score, 0.70)
    if data.prior_rejections_90d >= 2:
        fraud_score = max(fraud_score, 0.68)

    return round(float(fraud_score), 4)


@router.post("/trigger", response_model=TriggerOutput)
def parametric_trigger(data: TriggerInput):
    model_metadata = get_model_metadata()

    disruption = assess_disruption(
        temperature_celsius=data.temperature_celsius,
        rainfall_mm=data.rainfall_mm,
        aqi_score=data.aqi_score,
        wind_speed_kmh=data.wind_speed_kmh,
    )
    disruption_prob = disruption["disruption_probability"]
    disruption_type = disruption["disruption_type"]
    disruption_confidence = disruption["disruption_confidence"]

    if disruption_prob < DISRUPTION_THRESHOLD:
        status = "no_disruption"
        reason = (
            f"Disruption probability {disruption_prob:.0%} below threshold "
            f"({DISRUPTION_THRESHOLD:.0%}) - no payout triggered"
        )
        ai_explanation = generate_payout_explanation(
            disruption_type=disruption_type,
            temperature=data.temperature_celsius,
            rainfall=data.rainfall_mm,
            aqi=data.aqi_score,
            disruption_probability=disruption_prob,
            income_loss=0.0,
            fraud_score=0.0,
            payout_amount=0.0,
            status=status,
        )
        return TriggerOutput(
            worker_id=data.worker_id,
            policy_id=data.policy_id,
            zone_id=data.zone_id,
            payout_triggered=False,
            payout_amount_inr=0.0,
            disruption_probability=disruption_prob,
            disruption_confidence=disruption_confidence,
            disruption_type=disruption_type,
            fraud_score=0.0,
            fraud_cleared=True,
            expected_income_loss_inr=0.0,
            decision_reason=reason,
            ai_explanation=ai_explanation,
            model_metadata=model_metadata,
            status=status,
        )

    fraud_review_threshold = _adaptive_fraud_review_threshold(disruption_prob)

    income = predict_income_loss(
        worker_daily_orders=data.worker_daily_orders,
        avg_income_per_order=data.avg_income_per_order,
        disruption_type=disruption_type,
        disruption_severity=disruption_prob,
        days_affected=7,
        risk_label=data.risk_label,
    )
    payout = income["payout_recommended_inr"]
    weekly_loss = income["expected_weekly_loss_inr"]

    fraud_score = _score_fraud(data, disruption_type, payout)
    fraud_cleared = fraud_score < FRAUD_REJECT_THRESHOLD

    if not fraud_cleared:
        status = "rejected"
        reason = f"Claim rejected - fraud score {fraud_score:.2f} exceeds threshold"
        ai_explanation = generate_payout_explanation(
            disruption_type=disruption_type,
            temperature=data.temperature_celsius,
            rainfall=data.rainfall_mm,
            aqi=data.aqi_score,
            disruption_probability=disruption_prob,
            income_loss=0.0,
            fraud_score=fraud_score,
            payout_amount=0.0,
            status=status,
        )
        return TriggerOutput(
            worker_id=data.worker_id,
            policy_id=data.policy_id,
            zone_id=data.zone_id,
            payout_triggered=False,
            payout_amount_inr=0.0,
            disruption_probability=disruption_prob,
            disruption_confidence=disruption_confidence,
            disruption_type=disruption_type,
            fraud_score=fraud_score,
            fraud_cleared=False,
            expected_income_loss_inr=0.0,
            decision_reason=reason,
            ai_explanation=ai_explanation,
            model_metadata=model_metadata,
            status=status,
        )

    if fraud_score < fraud_review_threshold:
        status = "approved"
        reason = (
            f"Auto-approved. Disruption: {disruption_type} ({disruption_prob:.0%} probability, "
            f"confidence {disruption_confidence:.0%}). "
            f"Estimated weekly loss: Rs.{weekly_loss}. Payout: Rs.{payout}."
        )
        payout_triggered = True
    else:
        status = "pending_review"
        reason = (
            f"Manual review required. Disruption confirmed ({disruption_prob:.0%}), "
            f"but fraud score {fraud_score:.2f} exceeds review threshold "
            f"({fraud_review_threshold:.2f}) for this disruption level."
        )
        payout_triggered = False

    ai_explanation = generate_payout_explanation(
        disruption_type=disruption_type,
        temperature=data.temperature_celsius,
        rainfall=data.rainfall_mm,
        aqi=data.aqi_score,
        disruption_probability=disruption_prob,
        income_loss=weekly_loss,
        fraud_score=fraud_score,
        payout_amount=payout if payout_triggered else 0.0,
        status=status,
    )

    return TriggerOutput(
        worker_id=data.worker_id,
        policy_id=data.policy_id,
        zone_id=data.zone_id,
        payout_triggered=payout_triggered,
        payout_amount_inr=payout if payout_triggered else 0.0,
        disruption_probability=disruption_prob,
        disruption_confidence=disruption_confidence,
        disruption_type=disruption_type,
        fraud_score=fraud_score,
        fraud_cleared=fraud_cleared,
        expected_income_loss_inr=weekly_loss,
        decision_reason=reason,
        ai_explanation=ai_explanation,
        model_metadata=model_metadata,
        status=status,  # type: ignore[arg-type]
    )
