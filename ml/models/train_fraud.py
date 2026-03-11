import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
import numpy as np
import json
from datetime import datetime

def train():
    print("Training Fraud Model (Isolation Forest)...")

    csv_path = os.path.join(os.path.dirname(__file__), 'synthetic_fraud_data.csv')

    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_data.py first.")
        return

    df = pd.read_csv(csv_path)

    features = [
        'gps_zone_match',
        'claim_velocity_7d',
        'historical_zone_presence',
        'time_since_event_seconds',
        'platform_activity_during_event'
    ]

    X = df[features]
    y_true = df['is_fraud']  # only used for evaluation, NOT for training

    # Train — IsolationForest is unsupervised, no labels passed
    model = IsolationForest(
        n_estimators=200,
        contamination=0.10,   # expect ~10% fraud
        max_samples='auto',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X)

    # Evaluate against our known labels to sanity check
    # IsolationForest: -1 = anomaly (fraud), 1 = normal
    preds = model.predict(X)
    y_pred_binary = np.where(preds == -1, 1, 0)   # convert to 0=normal, 1=fraud

    print("\nEvaluation against known labels (sanity check):")
    print(classification_report(y_true, y_pred_binary, target_names=['normal', 'fraud']))

    # Save model
    saved_dir = os.path.join(os.path.dirname(__file__), 'saved')
    os.makedirs(saved_dir, exist_ok=True)
    joblib.dump(model, os.path.join(saved_dir, 'fraud_model.joblib'))
    print("Model saved to saved/fraud_model.joblib")

    # Save metrics JSON
    report = classification_report(y_true, y_pred_binary, target_names=['normal', 'fraud'], output_dict=True)
    metrics = {
        "model":              "IsolationForest",
        "trained_at":         datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_samples":   int(len(X)),
        "overall_accuracy":   round(float(accuracy_score(y_true, y_pred_binary)), 4),
        "fraud_precision":    round(float(report["fraud"]["precision"]), 4),
        "fraud_recall":       round(float(report["fraud"]["recall"]), 4),
        "fraud_f1":           round(float(report["fraud"]["f1-score"]), 4),
        "normal_precision":   round(float(report["normal"]["precision"]), 4),
        "normal_recall":      round(float(report["normal"]["recall"]), 4),
        "type":               "unsupervised_anomaly_detection",
        "contamination":      0.10,
        "n_estimators":       200,
        "sklearn_version":    __import__('sklearn').__version__,
    }
    with open(os.path.join(saved_dir, 'fraud_model_metrics.json'), 'w') as f:
        json.dump(metrics, f, indent=2)
    print("Metrics saved to saved/fraud_model_metrics.json")

if __name__ == "__main__":
    train()
