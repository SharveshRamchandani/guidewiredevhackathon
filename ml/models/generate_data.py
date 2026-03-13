import pandas as pd
import numpy as np
import os

# -------------------------------------------------------------------
# Realistic zone profiles based on Indian city delivery zones
# Each zone has a base flood risk, heat risk, and activity multiplier
# -------------------------------------------------------------------
ZONE_PROFILES = {
    'Z_MUM_001': {'flood': 0.85, 'heat': 0.55, 'label': 'Mumbai_Coastal'},
    'Z_MUM_002': {'flood': 0.70, 'heat': 0.50, 'label': 'Mumbai_Suburbs'},
    'Z_CHE_001': {'flood': 0.75, 'heat': 0.80, 'label': 'Chennai_Central'},
    'Z_CHE_002': {'flood': 0.60, 'heat': 0.85, 'label': 'Chennai_Suburban'},
    'Z_DEL_001': {'flood': 0.30, 'heat': 0.90, 'label': 'Delhi_Central'},
    'Z_DEL_002': {'flood': 0.25, 'heat': 0.88, 'label': 'Delhi_NCR'},
    'Z_BLR_001': {'flood': 0.45, 'heat': 0.40, 'label': 'Bangalore_Central'},
    'Z_BLR_002': {'flood': 0.40, 'heat': 0.35, 'label': 'Bangalore_East'},
    'Z_HYD_001': {'flood': 0.55, 'heat': 0.75, 'label': 'Hyderabad_Central'},
    'Z_KOL_001': {'flood': 0.80, 'heat': 0.65, 'label': 'Kolkata_Central'},
}

PLATFORMS = ['Swiggy', 'Zomato', 'Zepto', 'Blinkit']

# Platform-specific weights — matches real market share in India
PLATFORM_WEIGHTS = [0.35, 0.35, 0.15, 0.15]


def _make_segment(n, risk_class, seed_offset, zone_keys):
    """
    Generate a segment of workers for a specific risk class.
    Each class has distinct, realistic feature distributions that
    reflect real-world risk factors for gig workers.
    """
    rng = np.random.default_rng(42 + seed_offset)

    if risk_class == 'high':
        # New, overworked workers in dangerous zones — disproportionately high risk
        months_active     = rng.integers(1, 6, n)                              # inexperienced
        avg_daily_hours   = rng.normal(10.5, 1.2, n).clip(7.0, 14.0)          # overworked
        past_claims_count = rng.integers(3, 9, n)                              # high claim history
        zone_flood_risk   = rng.uniform(0.65, 1.0, n)                          # high flood zones
        zone_heat_risk    = rng.uniform(0.65, 1.0, n)                          # high heat zones

    elif risk_class == 'medium':
        # Moderate tenure, moderate hours, middle-risk zones
        months_active               = rng.integers(6, 24, n)
        avg_daily_hours   = rng.normal(7.5, 1.8, n).clip(4.0, 12.0)
        past_claims_count = rng.integers(1, 4, n)
        zone_flood_risk   = rng.uniform(0.35, 0.70, n)
        zone_heat_risk    = rng.uniform(0.35, 0.70, n)

    else:  # low
        # Experienced workers in safe zones with clean claim history
        months_active     = rng.integers(12, 60, n)                            # experienced
        avg_daily_hours   = rng.normal(6.0, 1.5, n).clip(2.0, 9.0)            # reasonable hours
        past_claims_count = rng.integers(0, 2, n)                              # clean history
        zone_flood_risk   = rng.uniform(0.05, 0.40, n)                         # safe zones
        zone_heat_risk    = rng.uniform(0.05, 0.40, n)                         # safe zones

    zone_id  = rng.choice(zone_keys, n)
    platform = rng.choice(PLATFORMS, n, p=PLATFORM_WEIGHTS)

    return pd.DataFrame({
        'zone_id':           zone_id,
        'platform':          platform,
        'months_active':     months_active,
        'avg_daily_hours':   avg_daily_hours.round(2),
        'past_claims_count': past_claims_count,
        'zone_flood_risk':   zone_flood_risk.round(4),
        'zone_heat_risk':    zone_heat_risk.round(4),
        'risk_label':        risk_class,
    })


def generate_risk_data(seed=42):
    """
    Generate balanced synthetic gig worker risk data.

    Target distribution:
        low    → 1500 records (~30%)
        medium → 3000 records (~60%)
        high   →  500 records (~10%)
        Total  → 5000 records

    Each segment uses distinct, realistic feature ranges per risk class
    so the model can actually learn to separate them.
    """
    zone_keys = list(ZONE_PROFILES.keys())

    segments = [
        _make_segment(500,  'high',   0, zone_keys),
        _make_segment(3000, 'medium', 1, zone_keys),
        _make_segment(1500, 'low',    2, zone_keys),
    ]

    df = pd.concat(segments, ignore_index=True)

    # Shuffle so classes aren't block-ordered
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    df.insert(0, 'worker_id', [f'W_{i:05d}' for i in range(len(df))])

    out = os.path.join(os.path.dirname(__file__), 'synthetic_risk_data.csv')
    df.to_csv(out, index=False)

    label_counts = df['risk_label'].value_counts().to_dict()
    print(f"[Risk Data] Generated {len(df)} records -> {out}")
    print(f"  Label distribution: {label_counts}")
    return df


def generate_fraud_data(num_samples=5000, seed=42):
    """
    Generate realistic synthetic claim fraud data.

    Key design decisions:
    - 90% normal claims, 10% anomalous (matches contamination=0.1 in IsolationForest)
    - Normal claims: GPS match, low velocity, filed hours-days after event
    - Fraudulent claims: GPS mismatch, high velocity, filed suspiciously fast,
      low platform activity during the event window
    - Intermediate cases exist (intentionally noisy) to avoid trivial separation
    """
    np.random.seed(seed + 1)
    n = num_samples
    n_fraud  = int(n * 0.10)
    n_normal = n - n_fraud

    def make_normal(size):
        return pd.DataFrame({
            'gps_zone_match':                 np.random.choice([1, 0], size, p=[0.95, 0.05]),
            'claim_velocity_7d':              np.random.poisson(0.4, size).clip(0, 3),
            'historical_zone_presence':       np.random.beta(5, 2, size).round(4),
            'time_since_event_seconds':       np.random.exponential(7200, size).clip(600, 86400).astype(int),
            'platform_activity_during_event': np.random.beta(3, 1.5, size).round(4),
            'is_fraud': 0
        })

    def make_fraud(size):
        return pd.DataFrame({
            'gps_zone_match':                 np.random.choice([1, 0], size, p=[0.20, 0.80]),
            'claim_velocity_7d':              np.random.poisson(4.5, size).clip(1, 10),
            'historical_zone_presence':       np.random.beta(1.5, 5, size).round(4),
            'time_since_event_seconds':       np.random.exponential(120, size).clip(30, 900).astype(int),
            'platform_activity_during_event': np.random.beta(1, 4, size).round(4),
            'is_fraud': 1
        })

    df = pd.concat([make_normal(n_normal), make_fraud(n_fraud)], ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    df.insert(0, 'claim_id', [f'CLM_{i:05d}' for i in range(n)])

    out = os.path.join(os.path.dirname(__file__), 'synthetic_fraud_data.csv')
    df.to_csv(out, index=False)

    print(f"[Fraud Data] Generated {n} records -> {out}")
    print(f"  Normal: {n_normal}  |  Fraudulent: {n_fraud}  (10% contamination)")
    return df


if __name__ == "__main__":
    print("=" * 55)
    print("  GigShield — Synthetic Training Data Generator")
    print("=" * 55)
    generate_risk_data()
    generate_fraud_data(num_samples=5000)
    print("=" * 55)
    print("Done. Run train_risk.py and train_fraud.py next.")
    print("=" * 55)
