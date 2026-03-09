import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import os
import numpy as np

def train():
    print("Training Fraud Model (Isolation Forest)...")
    
    # We will generate synthetic data inline for the fraud model demonstration 
    num_samples = 500
    np.random.seed(42)
    
    X = pd.DataFrame({
        'gps_zone_match': np.random.choice([0, 1], num_samples, p=[0.1, 0.9]), # 0=False, 1=True
        'claim_velocity_7d': np.random.poisson(0.5, num_samples),
        'historical_zone_presence': np.random.uniform(0.0, 1.0, num_samples),
        'time_since_event_seconds': np.random.exponential(3600, num_samples),
        'platform_activity_during_event': np.random.uniform(0.0, 1.0, num_samples)
    })
    
    # Train
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(X)
    
    # Save
    saved_dir = os.path.join(os.path.dirname(__file__), 'saved')
    os.makedirs(saved_dir, exist_ok=True)
    joblib.dump(model, os.path.join(saved_dir, 'fraud_model.joblib'))
    print("Model saved to saved/fraud_model.joblib")

if __name__ == "__main__":
    train()
