import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import json
from datetime import datetime


def train():
    print("Training Risk Model (Random Forest)...")

    csv_path = os.path.join(os.path.dirname(__file__), 'synthetic_risk_data.csv')

    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_data.py first.")
        return

    df = pd.read_csv(csv_path)

    features = ['months_active', 'avg_daily_hours', 'past_claims_count', 'zone_flood_risk', 'zone_heat_risk']
    X = df[features]     
    y = df['risk_label']

    print(f"\nClass distribution in full dataset:")
    print(y.value_counts().to_string())

    # Stratified split preserves class ratios in train/test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # class_weight="balanced" automatically compensates for any remaining imbalance
    # by upweighting minority classes during tree building
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # Evaluate — zero_division=0 suppresses UndefinedMetricWarning
    y_pred = model.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Feature importance — useful for explaining to judges/investors
    importances = dict(zip(features, model.feature_importances_.round(3)))
    sorted_imp = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))
    print("Feature importances (sorted):", sorted_imp)

    # Save model
    saved_dir = os.path.join(os.path.dirname(__file__), 'saved')
    os.makedirs(saved_dir, exist_ok=True)
    joblib.dump(model, os.path.join(saved_dir, 'risk_model.joblib'))
    print("\nModel saved to saved/risk_model.joblib")

    # Save metrics JSON
    report = classification_report(y_test, y_pred, zero_division=0, output_dict=True)
    metrics = {
        "model":           "RandomForestClassifier",
        "trained_at":      datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_samples": int(len(X_train)),
        "test_samples":    int(len(X_test)),
        "overall_accuracy":round(float(accuracy_score(y_test, y_pred)), 4),
        "class_f1": {
            "low":    round(float(report["low"]["f1-score"]), 4),
            "medium": round(float(report["medium"]["f1-score"]), 4),
            "high":   round(float(report["high"]["f1-score"]), 4),
        },
        "feature_importances": importances,
        "top_features": list(sorted_imp.keys())[:3],
        "n_estimators":  200,
        "sklearn_version": __import__('sklearn').__version__,
    }
    with open(os.path.join(saved_dir, 'risk_model_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    print("Metrics saved to saved/risk_model_metrics.json")


if __name__ == "__main__":
    train()
