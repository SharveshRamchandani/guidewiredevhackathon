"""
AI Parametric Trigger Engine — core orchestration router.

Workflow:
  1. Assess disruption from live weather + AQI data
  2. If disruption_probability < threshold -> no payout
  3. Adaptive fraud threshold (lower bar during major disasters)
  4. Run fraud check on worker's claim signals
  5. If fraud_score >= adaptive threshold -> reject
  6. Predict income loss from disruption type + severity
  7. Generate AI explanation via Groq Llama 3
  8. Issue payout (or flag for manual review)
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
_fraud_model = None


def _get_fraud_model():
    global _fraud_model
    if _fraud_model is None and _FRAUD_MODEL_PATH.exists():
        _fraud_model = joblib.load(_FRAUD_MODEL_PATH)
    return _fraud_model


# ── Trigger constants ─────────────────────────────────────────────────────────
DISRUPTION_THRESHOLD   = 0.39   # minimum probability to consider payout
FRAUD_REJECT_THRESHOLD = 0.60   # above this = hard reject regardless


def _adaptive_fraud_review_threshold(disruption_prob: float) -> float:
    """
    Improvement 3: Adaptive Fraud Threshold.
    During major disasters (disruption > 70%), workers are less likely to commit
    fraud — raise the review bar so genuine claims aren't held up.
    During normal disruptions, apply the stricter standard.
    """
    if disruption_prob > 0.70:
        return 0.50   # more lenient during severe events
    return 0.30       # standard threshold


@router.post("/trigger", response_model=TriggerOutput)
def parametric_trigger(data: TriggerInput):
    """
    AI Parametric Trigger Engine.
    Orchestrates disruption detection -> adaptive fraud check -> income loss -> AI explanation -> payout.
    """
    # Load model accuracy metadata (reads from JSON saved during training)
    model_metadata = get_model_metadata()

    # ── Step 1: Disruption Assessment ─────────────────────────────────────────
    disruption = assess_disruption(
        temperature_celsius=data.temperature_celsius,
        rainfall_mm=data.rainfall_mm,
        aqi_score=data.aqi_score,
        wind_speed_kmh=data.wind_speed_kmh,
    )
    disruption_prob       = disruption["disruption_probability"]
    disruption_type       = disruption["disruption_type"]
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

    # ── Step 2: Adaptive Fraud Threshold ──────────────────────────────────────
    fraud_review_threshold = _adaptive_fraud_review_threshold(disruption_prob)

    # ── Step 3: Fraud Check ───────────────────────────────────────────────────
    fraud_model = _get_fraud_model()
    features = pd.DataFrame([{
        "gps_zone_match":                 int(data.gps_zone_match),
        "claim_velocity_7d":              data.claim_velocity_7d,
        "historical_zone_presence":       data.historical_zone_presence,
        "time_since_event_seconds":       data.time_since_event_seconds,
        "platform_activity_during_event": data.platform_activity_during_event,
    }])

    if fraud_model is not None:
        prediction = fraud_model.predict(features)[0]    # 1=normal, -1=fraud
        if prediction == -1:
            fraud_score = 0.85
        else:
            raw = fraud_model.score_samples(features)[0]
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
    else:
        fraud_score = 0.10

    # Rule-based overrides (high-confidence signals)
    if not data.gps_zone_match:
        fraud_score = max(fraud_score, 0.80)
    if data.claim_velocity_7d > 5:
        fraud_score = max(fraud_score, 0.75)
    if data.time_since_event_seconds < 300:
        fraud_score = max(fraud_score, 0.65)
    if data.platform_activity_during_event < 0.2:
        fraud_score = max(fraud_score, 0.60)

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

    # ── Step 4: Income Loss Prediction ────────────────────────────────────────
    income = predict_income_loss(
        worker_daily_orders=data.worker_daily_orders,
        avg_income_per_order=data.avg_income_per_order,
        disruption_type=disruption_type,
        disruption_severity=disruption_prob,
        days_affected=7,
        risk_label=data.risk_label,
    )
    payout      = income["payout_recommended_inr"]
    weekly_loss = income["expected_weekly_loss_inr"]

    # ── Step 5: Payout Decision (adaptive threshold applied here) ─────────────
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

    # ── Step 6: AI Explanation ────────────────────────────────────────────────
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
        status=status,          # type: ignore
    )
