import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import APIRouter
from app.schemas.fraud import FraudScoreInput, FraudScoreOutput

router = APIRouter(prefix="/ml", tags=["Fraud"])

_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "saved" / "fraud_model.joblib"
_model = None


def _get_model():
    global _model
    if _model is None and _MODEL_PATH.exists():
        _model = joblib.load(_MODEL_PATH)
    return _model


@router.post("/fraud-score", response_model=FraudScoreOutput)
def calculate_fraud_score(data: FraudScoreInput):
    """
    Fraud scoring using IsolationForest.

    IsolationForest.predict() returns:
        1  = normal (not fraud)
       -1  = anomaly (potential fraud)

    Feature order MUST match training order in train_fraud.py:
        [gps_zone_match, claim_velocity_7d, historical_zone_presence,
         time_since_event_seconds, platform_activity_during_event]
    """
    model = _get_model()

    # Feature order MUST match training order in train_fraud.py:
    #   [gps_zone_match, claim_velocity_7d, historical_zone_presence,
    #    time_since_event_seconds, platform_activity_during_event]
    # Use DataFrame so IsolationForest (fitted with feature names) doesn't warn
    features = pd.DataFrame([{
        "gps_zone_match":                int(data.gps_zone_match),
        "claim_velocity_7d":             data.claim_velocity_7d,
        "historical_zone_presence":      data.historical_zone_presence,
        "time_since_event_seconds":      data.time_since_event_seconds,
        "platform_activity_during_event": data.platform_activity_during_event,
    }])

    if model is not None:
        # predict() returns 1 (normal) or -1 (anomaly/fraud)
        prediction = model.predict(features)[0]

        if prediction == -1:
            # Anomaly detected by model
            fraud_score = 0.85
            is_model_fraud = True
        else:
            # Normal claim — use score_samples for a meaningful continuous score
            # score_samples: more negative = more anomalous
            raw = model.score_samples(features)[0]
            # For normal predictions, keep score in 0.0–0.45 range
            fraud_score = round(float(np.clip(0.5 - raw, 0.0, 0.45)), 4)
            is_model_fraud = False
    else:
        # Fallback if model not loaded — use rules only
        fraud_score = 0.10
        is_model_fraud = False

    # ── Rule-based overrides (high-confidence signals trump model) ────
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

    if is_model_fraud and not reasons:
        reasons.append("Isolation Forest anomaly detected")

    # ── Final decision ────────────────────────────────────────────────
    if fraud_score < 0.30:
        decision = "auto_approve"
        reason   = "Low fraud probability"
    elif fraud_score < 0.60:
        decision = "manual_review"
        reason   = f"Moderate risk: {', '.join(reasons) or 'anomaly flagged for review'}"
    else:
        decision = "auto_reject"
        reason   = f"High fraud probability: {', '.join(reasons)}"

    return FraudScoreOutput(
        fraud_score=round(fraud_score, 4),
        decision=decision,   # type: ignore
        reason=reason,
    )
