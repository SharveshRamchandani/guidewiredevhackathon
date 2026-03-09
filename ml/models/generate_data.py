import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_samples=500):
    np.random.seed(42)
    
    platforms = ['Swiggy', 'Zomato', 'Zepto', 'Blinkit']
    zones = ['Z_001', 'Z_002', 'Z_003', 'Z_004', 'Z_005']
    
    data = {
        'worker_id': [f'W_{i:04d}' for i in range(num_samples)],
        'zone_id': np.random.choice(zones, num_samples),
        'platform': np.random.choice(platforms, num_samples),
        'months_active': np.random.randint(1, 48, num_samples),
        'avg_daily_hours': np.random.uniform(2.0, 12.0, num_samples),
        'past_claims_count': np.random.poisson(0.5, num_samples),
        'zone_flood_risk': np.random.uniform(0.1, 0.9, num_samples),
        'zone_heat_risk': np.random.uniform(0.1, 0.9, num_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Target variable generation (synthetic logic)
    df['risk_score'] = (
        (df['past_claims_count'] * 0.15) + 
        (df['zone_flood_risk'] * 0.2) + 
        (df['zone_heat_risk'] * 0.2) + 
        (1.0 / df['months_active'].replace(0, 1) * 0.1)
    ).clip(0.0, 1.0)
    
    def get_label(score):
        if score < 0.33: return 'low'
        elif score < 0.66: return 'medium'
        else: return 'high'
        
    df['risk_label'] = df['risk_score'].apply(get_label)
    
    output_path = os.path.join(os.path.dirname(__file__), 'synthetic_gig_workers.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {num_samples} records in {output_path}")

if __name__ == "__main__":
    generate_synthetic_data(500)
