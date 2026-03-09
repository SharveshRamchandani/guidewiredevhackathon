import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

def train():
    print("Training Risk Model (Random Forest)...")
    
    csv_path = os.path.join(os.path.dirname(__file__), 'synthetic_gig_workers.csv')
    
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run generate_data.py first.")
        return
        
    df = pd.read_csv(csv_path)
    
    # Feature engineering / selection
    features = ['months_active', 'avg_daily_hours', 'past_claims_count', 'zone_flood_risk', 'zone_heat_risk']
    X = df[features]
    y = df['risk_label']
    
    # Train
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    # Save
    saved_dir = os.path.join(os.path.dirname(__file__), 'saved')
    os.makedirs(saved_dir, exist_ok=True)
    joblib.dump(model, os.path.join(saved_dir, 'risk_model.joblib'))
    print("Model saved to saved/risk_model.joblib")

if __name__ == "__main__":
    train()
