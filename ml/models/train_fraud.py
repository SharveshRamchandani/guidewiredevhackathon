import json
import os
from datetime import UTC, datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


NUMERIC_FEATURES = [
    "gps_zone_match",
    "claim_velocity_7d",
    "historical_zone_presence",
    "time_since_event_seconds",
    "platform_activity_during_event",
    "plan_base_premium",
    "plan_max_payout",
    "claimed_amount",
    "claimed_amount_ratio",
    "prior_rejections_90d",
]

CATEGORICAL_FEATURES = [
    "plan_name",
    "season",
    "event_type",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def train():
    print("Training Fraud Model (Isolation Forest, plan-aware)...")

    csv_path = os.path.join(os.path.dirname(__file__), "synthetic_fraud_data.csv")
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_data.py first.")
        return

    df = pd.read_csv(csv_path)
    missing = [feature for feature in ALL_FEATURES + ["is_fraud"] if feature not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in synthetic_fraud_data.csv: {missing}")

    X = df[ALL_FEATURES].copy()
    y_true = df["is_fraud"]

    print("\nFraud class distribution:")
    print(y_true.value_counts().to_string())
    print("\nFeature sample:")
    print(X.head(3).to_string(index=False))

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", IsolationForest(
            n_estimators=250,
            contamination=0.10,
            max_samples="auto",
            random_state=42,
            n_jobs=1,
        )),
    ])

    pipeline.fit(X)

    preds = pipeline.predict(X)
    y_pred_binary = np.where(preds == -1, 1, 0)

    print("\nEvaluation against known labels (sanity check):")
    print(classification_report(y_true, y_pred_binary, target_names=["normal", "fraud"], zero_division=0))

    saved_dir = os.path.join(os.path.dirname(__file__), "saved")
    os.makedirs(saved_dir, exist_ok=True)

    bundle = {
      "pipeline": pipeline,
      "feature_columns": ALL_FEATURES,
      "numeric_features": NUMERIC_FEATURES,
      "categorical_features": CATEGORICAL_FEATURES,
      "model_version": "fraud_if_planaware_v2",
    }
    joblib.dump(bundle, os.path.join(saved_dir, "fraud_model.joblib"))
    print("Model bundle saved to saved/fraud_model.joblib")

    report = classification_report(y_true, y_pred_binary, target_names=["normal", "fraud"], output_dict=True, zero_division=0)
    metrics = {
        "model": "IsolationForest",
        "model_version": "fraud_if_planaware_v2",
        "trained_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_samples": int(len(X)),
        "overall_accuracy": round(float(accuracy_score(y_true, y_pred_binary)), 4),
        "fraud_precision": round(float(report["fraud"]["precision"]), 4),
        "fraud_recall": round(float(report["fraud"]["recall"]), 4),
        "fraud_f1": round(float(report["fraud"]["f1-score"]), 4),
        "normal_precision": round(float(report["normal"]["precision"]), 4),
        "normal_recall": round(float(report["normal"]["recall"]), 4),
        "type": "unsupervised_anomaly_detection",
        "contamination": 0.10,
        "feature_columns": ALL_FEATURES,
        "n_estimators": 250,
        "sklearn_version": __import__("sklearn").__version__,
    }
    with open(os.path.join(saved_dir, "fraud_model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    print("Metrics saved to saved/fraud_model_metrics.json")


if __name__ == "__main__":
    train()
