"""
Model Info Service — loads accuracy metrics from JSON files saved during training.
Returns a unified model_metadata dict for inclusion in API responses.
"""

import json
import os
from pathlib import Path

_SAVED_DIR = Path(__file__).resolve().parents[2] / "models" / "saved"


def _load_json(filename: str) -> dict:
    path = _SAVED_DIR / filename
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


def get_model_metadata() -> dict:
    """
    Load and return a clean summary of both model metrics
    for inclusion in trigger API responses.
    """
    risk  = _load_json("risk_model_metrics.json")
    fraud = _load_json("fraud_model_metrics.json")

    return {
        "risk_model": {
            "algorithm":        risk.get("model", "RandomForestClassifier"),
            "overall_accuracy": risk.get("overall_accuracy", None),
            "class_f1":         risk.get("class_f1", {}),
            "top_features":     risk.get("top_features", []),
            "training_samples": risk.get("training_samples", None),
            "trained_at":       risk.get("trained_at", None),
            "sklearn_version":  risk.get("sklearn_version", None),
        },
        "fraud_model": {
            "algorithm":        fraud.get("model", "IsolationForest"),
            "type":             fraud.get("type", "unsupervised_anomaly_detection"),
            "overall_accuracy": fraud.get("overall_accuracy", None),
            "fraud_recall":     fraud.get("fraud_recall", None),
            "fraud_precision":  fraud.get("fraud_precision", None),
            "fraud_f1":         fraud.get("fraud_f1", None),
            "training_samples": fraud.get("training_samples", None),
            "trained_at":       fraud.get("trained_at", None),
            "sklearn_version":  fraud.get("sklearn_version", None),
        },
    }
