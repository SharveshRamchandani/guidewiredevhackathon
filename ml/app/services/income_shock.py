"""
AI Income Shock Detector
Uses Isolation Forest fitted on the worker's own earnings history to detect
sudden anomalous income drops. No pre-trained model needed — fits inline.
"""

import numpy as np
from sklearn.ensemble import IsolationForest


def detect_income_shock(
    daily_earnings: list[float],
    daily_orders: list[int],
) -> dict:
    """
    Detect if last 3 days of earnings are anomalous vs historical baseline.
    Requires at least 7 days of data for meaningful detection.
    """
    if len(daily_earnings) < 7:
        baseline = float(np.mean(daily_earnings)) if daily_earnings else 0.0
        return {
            "shock_detected":      False,
            "shock_score":         0.0,
            "normal_baseline_inr": baseline,
            "current_avg_inr":     baseline,
            "drop_percentage":     0.0,
        }

    earnings = np.array(daily_earnings, dtype=float)
    orders   = np.array(daily_orders,   dtype=float)
    eps      = 1e-6

    # Feature matrix: [earnings, orders, earnings_per_order]
    X = np.column_stack([earnings, orders, earnings / (orders + eps)])

    # Fit on historical window (exclude last 3 days)
    model = IsolationForest(contamination=0.15, random_state=42)
    model.fit(X[:-3])

    # Score the last 3 days — more negative = more anomalous
    recent_raw    = model.score_samples(X[-3:])
    anomaly_score = float(np.mean(np.clip(0.5 - recent_raw, 0, 1)))

    baseline_avg = float(np.mean(earnings[:-3]))
    current_avg  = float(np.mean(earnings[-3:]))
    drop_pct     = round((1 - current_avg / (baseline_avg + eps)) * 100, 1) if baseline_avg > 0 else 0.0

    shock_detected = anomaly_score > 0.55 and drop_pct > 20.0

    return {
        "shock_detected":      shock_detected,
        "shock_score":         round(anomaly_score, 4),
        "normal_baseline_inr": round(baseline_avg, 2),
        "current_avg_inr":     round(current_avg, 2),
        "drop_percentage":     drop_pct,
    }
