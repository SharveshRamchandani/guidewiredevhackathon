import json
import os
from datetime import UTC, datetime

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


NUMERIC_FEATURES = [
    "months_active",
    "avg_daily_hours",
    "past_claims_count",
    "zone_flood_risk",
    "zone_heat_risk",
    "plan_base_premium",
    "plan_max_payout",
    "covered_event_count",
    "avg_copay",
]

CATEGORICAL_FEATURES = [
    "platform",
]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def _aggregate_importances(pipeline: Pipeline) -> dict:
    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["model"]
    transformed_names = preprocessor.get_feature_names_out()
    raw_importances = model.feature_importances_

    grouped = {}
    for name, importance in zip(transformed_names, raw_importances):
        clean = name.replace("num__", "").replace("cat__", "")
        group_name = clean.split("_", 1)[0] if clean.startswith("platform_") else clean
        grouped[group_name] = grouped.get(group_name, 0.0) + float(importance)

    return dict(sorted(
        {k: round(v, 4) for k, v in grouped.items()}.items(),
        key=lambda item: item[1],
        reverse=True,
    ))


def train():
    print("Training Risk Model (Random Forest, plan-aware)...")

    csv_path = os.path.join(os.path.dirname(__file__), "synthetic_risk_data.csv")
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_data.py first.")
        return

    df = pd.read_csv(csv_path)
    missing = [feature for feature in ALL_FEATURES + ["risk_label"] if feature not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in synthetic_risk_data.csv: {missing}")

    X = df[ALL_FEATURES].copy()
    y = df["risk_label"]

    print("\nClass distribution in full dataset:")
    print(y.value_counts().to_string())

    print("\nFeature sample:")
    print(X.head(3).to_string(index=False))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=4,
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=1,
        )),
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    importances = _aggregate_importances(pipeline)
    print("Aggregated feature importances (sorted):", importances)

    saved_dir = os.path.join(os.path.dirname(__file__), "saved")
    os.makedirs(saved_dir, exist_ok=True)

    bundle = {
        "pipeline": pipeline,
        "feature_columns": ALL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "feature_importances": importances,
        "top_features": list(importances.keys())[:3],
        "model_version": "risk_rf_planaware_v2",
    }
    joblib.dump(bundle, os.path.join(saved_dir, "risk_model.joblib"))
    print("\nModel bundle saved to saved/risk_model.joblib")

    report = classification_report(y_test, y_pred, zero_division=0, output_dict=True)
    metrics = {
        "model": "RandomForestClassifier",
        "model_version": "risk_rf_planaware_v2",
        "trained_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "overall_accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "class_f1": {
            "low": round(float(report["low"]["f1-score"]), 4),
            "medium": round(float(report["medium"]["f1-score"]), 4),
            "high": round(float(report["high"]["f1-score"]), 4),
        },
        "feature_importances": importances,
        "top_features": list(importances.keys())[:3],
        "feature_columns": ALL_FEATURES,
        "n_estimators": 300,
        "max_depth": 12,
        "min_samples_leaf": 4,
        "sklearn_version": __import__("sklearn").__version__,
    }
    with open(os.path.join(saved_dir, "risk_model_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    print("Metrics saved to saved/risk_model_metrics.json")


if __name__ == "__main__":
    train()
