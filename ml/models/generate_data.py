import os
from typing import Dict, List

import numpy as np
import pandas as pd


# -------------------------------------------------------------------
# Product catalog aligned with the live DB plan structure.
# These values are used only for synthetic feature generation.
# -------------------------------------------------------------------
PLAN_CATALOG = {
    "nano": {
        "base_premium": 25.0,
        "max_payout": 500.0,
        "coverage_days": 7,
        "covered_events": ["heavyRain", "platformOutage"],
        "avg_copay": 0.25,
    },
    "basic": {
        "base_premium": 49.0,
        "max_payout": 1000.0,
        "coverage_days": 7,
        "covered_events": ["heavyRain", "platformOutage", "poorAqi", "heatwave"],
        "avg_copay": 0.20,
    },
    "standard": {
        "base_premium": 79.0,
        "max_payout": 2000.0,
        "coverage_days": 7,
        "covered_events": ["heavyRain", "platformOutage", "poorAqi", "heatwave", "strike", "curfew"],
        "avg_copay": 0.10,
    },
    "premium": {
        "base_premium": 99.0,
        "max_payout": 3500.0,
        "coverage_days": 7,
        "covered_events": ["heavyRain", "platformOutage", "poorAqi", "heatwave", "strike", "curfew", "accident"],
        "avg_copay": 0.0,
    },
}


# -------------------------------------------------------------------
# Zone profiles simulate hazard intensity and worker economics by city.
# -------------------------------------------------------------------
ZONE_PROFILES = {
    "Z_MUM_001": {"city": "Mumbai", "flood": 0.86, "heat": 0.58, "aqi": 0.42, "income": 0.82, "label": "Mumbai_Coastal"},
    "Z_MUM_002": {"city": "Mumbai", "flood": 0.72, "heat": 0.55, "aqi": 0.48, "income": 0.78, "label": "Mumbai_Suburbs"},
    "Z_DEL_001": {"city": "Delhi", "flood": 0.34, "heat": 0.92, "aqi": 0.88, "income": 0.80, "label": "Delhi_Central"},
    "Z_DEL_002": {"city": "Delhi", "flood": 0.28, "heat": 0.89, "aqi": 0.84, "income": 0.76, "label": "Delhi_NCR"},
    "Z_BLR_001": {"city": "Bangalore", "flood": 0.46, "heat": 0.42, "aqi": 0.34, "income": 0.84, "label": "Bangalore_Central"},
    "Z_BLR_002": {"city": "Bangalore", "flood": 0.39, "heat": 0.37, "aqi": 0.30, "income": 0.81, "label": "Bangalore_East"},
    "Z_CHE_001": {"city": "Chennai", "flood": 0.77, "heat": 0.83, "aqi": 0.39, "income": 0.74, "label": "Chennai_Central"},
    "Z_CHE_002": {"city": "Chennai", "flood": 0.64, "heat": 0.87, "aqi": 0.33, "income": 0.70, "label": "Chennai_Suburban"},
    "Z_HYD_001": {"city": "Hyderabad", "flood": 0.57, "heat": 0.77, "aqi": 0.41, "income": 0.73, "label": "Hyderabad_Central"},
    "Z_KOL_001": {"city": "Kolkata", "flood": 0.81, "heat": 0.67, "aqi": 0.52, "income": 0.69, "label": "Kolkata_Central"},
}


PLATFORMS = ["Swiggy", "Zomato", "Zepto", "Blinkit", "Amazon"]
PLATFORM_WEIGHTS = [0.34, 0.32, 0.13, 0.13, 0.08]
SEASONS = ["monsoon", "summer", "winter", "festival"]
SEASON_WEIGHTS = [0.32, 0.24, 0.18, 0.26]
EVENT_TYPES = ["Heavy Rain", "Poor AQI", "Heatwave", "Platform Outage"]


def _bounded_normal(rng: np.random.Generator, mean: float, std: float, size: int, low: float, high: float) -> np.ndarray:
    return rng.normal(mean, std, size).clip(low, high)


def _season_factor(season: str) -> Dict[str, float]:
    return {
        "monsoon": {"demand": 0.95, "disruption": 1.35, "hours": 1.05},
        "summer": {"demand": 1.00, "disruption": 1.15, "hours": 1.02},
        "winter": {"demand": 0.92, "disruption": 0.90, "hours": 0.96},
        "festival": {"demand": 1.18, "disruption": 0.98, "hours": 1.12},
    }[season]


def _plan_features(plan_name: str) -> Dict[str, float]:
    plan = PLAN_CATALOG[plan_name]
    return {
        "plan_name": plan_name,
        "plan_base_premium": plan["base_premium"],
        "plan_max_payout": plan["max_payout"],
        "coverage_days": plan["coverage_days"],
        "covered_event_count": len(plan["covered_events"]),
        "avg_copay": plan["avg_copay"],
    }


def _choose_plan(
    rng: np.random.Generator,
    risk_class: str,
    monthly_income_band: float,
    claims_history: int,
    zone_flood_risk: float,
    zone_heat_risk: float,
) -> str:
    protection_need = 0.40 * zone_flood_risk + 0.30 * zone_heat_risk + 0.20 * min(claims_history / 5.0, 1.0)
    affordability = np.clip((monthly_income_band - 15000.0) / 25000.0, 0.0, 1.0)

    scores = {
        "nano": 1.15 - 0.90 * affordability - 0.55 * protection_need,
        "basic": 0.90 + 0.05 * protection_need,
        "standard": 0.55 + 0.85 * affordability + 0.60 * protection_need,
        "premium": -0.05 + 1.15 * affordability + 0.95 * protection_need,
    }

    if risk_class == "high":
        scores["standard"] += 0.22
        scores["premium"] += 0.18
    elif risk_class == "low":
        scores["nano"] += 0.18

    logits = np.array([scores[name] for name in PLAN_CATALOG], dtype=float)
    logits = np.exp(logits - logits.max())
    probs = logits / logits.sum()
    return rng.choice(list(PLAN_CATALOG.keys()), p=probs)


def _make_risk_segment(n: int, risk_class: str, seed_offset: int) -> pd.DataFrame:
    rng = np.random.default_rng(2026 + seed_offset)
    zone_ids = rng.choice(list(ZONE_PROFILES.keys()), size=n)
    platforms = rng.choice(PLATFORMS, size=n, p=PLATFORM_WEIGHTS)
    seasons = rng.choice(SEASONS, size=n, p=SEASON_WEIGHTS)

    if risk_class == "high":
        months_active = rng.integers(1, 8, n)
        avg_daily_hours = _bounded_normal(rng, 10.0, 1.3, n, 6.5, 13.5)
        past_claims_count = rng.poisson(3.8, n).clip(1, 9)
    elif risk_class == "medium":
        months_active = rng.integers(6, 30, n)
        avg_daily_hours = _bounded_normal(rng, 8.1, 1.4, n, 4.5, 11.5)
        past_claims_count = rng.poisson(1.7, n).clip(0, 6)
    else:
        months_active = rng.integers(18, 60, n)
        avg_daily_hours = _bounded_normal(rng, 6.5, 1.2, n, 3.5, 9.0)
        past_claims_count = rng.poisson(0.5, n).clip(0, 3)

    rows: List[Dict[str, float]] = []

    for i in range(n):
        zone = ZONE_PROFILES[zone_ids[i]]
        season = seasons[i]
        season_fx = _season_factor(season)

        zone_flood_risk = float(np.clip(zone["flood"] * rng.uniform(0.88, 1.12), 0.05, 0.99))
        zone_heat_risk = float(np.clip(zone["heat"] * rng.uniform(0.88, 1.12), 0.05, 0.99))
        zone_aqi_risk = float(np.clip(zone["aqi"] * rng.uniform(0.86, 1.14), 0.05, 0.99))

        daily_orders = _bounded_normal(
            rng,
            mean=19.0 * zone["income"] * season_fx["demand"],
            std=4.0,
            size=1,
            low=8.0,
            high=34.0,
        )[0]
        avg_income_per_order = _bounded_normal(rng, 42.0 + 10.0 * zone["income"], 7.0, 1, 24.0, 80.0)[0]
        weekly_earnings = float(np.clip(daily_orders * avg_income_per_order * 6.2, 4500.0, 26000.0))
        monthly_income_band = weekly_earnings * 4.1

        plan_name = _choose_plan(
            rng,
            risk_class=risk_class,
            monthly_income_band=monthly_income_band,
            claims_history=int(past_claims_count[i]),
            zone_flood_risk=zone_flood_risk,
            zone_heat_risk=zone_heat_risk,
        )
        plan = _plan_features(plan_name)

        disruption_exposure = (
            0.42 * zone_flood_risk +
            0.28 * zone_heat_risk +
            0.18 * zone_aqi_risk +
            0.12 * min(avg_daily_hours[i] / 12.0, 1.0)
        )

        rows.append({
            "zone_id": zone_ids[i],
            "city": zone["city"],
            "zone_label": zone["label"],
            "platform": platforms[i],
            "season": season,
            "months_active": int(months_active[i]),
            "avg_daily_hours": round(float(avg_daily_hours[i] * season_fx["hours"]), 2),
            "past_claims_count": int(past_claims_count[i]),
            "zone_flood_risk": round(zone_flood_risk, 4),
            "zone_heat_risk": round(zone_heat_risk, 4),
            "zone_aqi_risk": round(zone_aqi_risk, 4),
            "weekly_earnings": round(weekly_earnings, 2),
            "daily_orders": round(float(daily_orders), 2),
            "avg_income_per_order": round(float(avg_income_per_order), 2),
            "disruption_exposure": round(float(np.clip(disruption_exposure, 0.0, 1.0)), 4),
            "risk_label": risk_class,
            **plan,
        })

    return pd.DataFrame(rows)


def generate_risk_data(seed: int = 42) -> pd.DataFrame:
    """
    Generate more realistic worker-level risk training data while preserving
    the original core columns used by the current risk model.

    Added signals:
    - city/season/platform context
    - earnings and order volume
    - plan chosen from the live 4-plan catalog
    - exposure richness for later pricing work
    """
    segments = [
        _make_risk_segment(700, "high", 0),
        _make_risk_segment(2700, "medium", 1),
        _make_risk_segment(1600, "low", 2),
    ]

    df = pd.concat(segments, ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    df.insert(0, "worker_id", [f"W_{i:05d}" for i in range(len(df))])

    out = os.path.join(os.path.dirname(__file__), "synthetic_risk_data.csv")
    df.to_csv(out, index=False)

    print(f"[Risk Data] Generated {len(df)} records -> {out}")
    print("  Label distribution:", df["risk_label"].value_counts().to_dict())
    print("  Plan distribution :", {str(k): int(v) for k, v in df["plan_name"].value_counts().to_dict().items()})
    print("  Avg weekly earnings by plan:")
    print(df.groupby("plan_name")["weekly_earnings"].mean().round(2).to_string())
    return df


def _event_for_claim(rng: np.random.Generator, season: str, plan_name: str) -> str:
    if season == "monsoon":
        pool = ["Heavy Rain", "Heavy Rain", "Platform Outage", "Poor AQI"]
    elif season == "summer":
        pool = ["Heatwave", "Heatwave", "Poor AQI", "Platform Outage"]
    elif season == "festival":
        pool = ["Platform Outage", "Platform Outage", "Poor AQI", "Heavy Rain"]
    else:
        pool = ["Poor AQI", "Platform Outage", "Heatwave", "Heavy Rain"]

    event = rng.choice(pool)
    if plan_name == "nano" and event in {"Poor AQI", "Heatwave"}:
        return rng.choice(["Heavy Rain", "Platform Outage"])
    return str(event)


def generate_fraud_data(num_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate fraud data with more realistic behavior:
    - good claims usually align with active season and worker plan
    - fraudulent claims show burstiness, low zone familiarity, and suspicious timing
    - premium plans are mildly over-represented in fraud attempts because payout upside is higher
    """
    rng = np.random.default_rng(seed + 17)

    plan_names = list(PLAN_CATALOG.keys())
    plan_weights_normal = np.array([0.24, 0.34, 0.27, 0.15])
    plan_weights_fraud = np.array([0.10, 0.24, 0.34, 0.32])

    normal_size = int(num_samples * 0.90)
    fraud_size = num_samples - normal_size
    rows: List[Dict[str, float]] = []

    for label, size in [(0, normal_size), (1, fraud_size)]:
        for _ in range(size):
            is_fraud = label == 1
            season = rng.choice(SEASONS, p=SEASON_WEIGHTS)
            plan_name = rng.choice(plan_names, p=plan_weights_fraud if is_fraud else plan_weights_normal)
            event_type = _event_for_claim(rng, season, plan_name)
            plan = PLAN_CATALOG[plan_name]
            plan_cap = plan["max_payout"]

            if is_fraud:
                gps_zone_match = int(rng.choice([1, 0], p=[0.22, 0.78]))
                claim_velocity_7d = int(np.clip(rng.poisson(4.8), 1, 10))
                historical_zone_presence = round(float(rng.beta(1.4, 5.4)), 4)
                time_since_event_seconds = int(np.clip(rng.exponential(210.0), 20, 1800))
                platform_activity_during_event = round(float(rng.beta(1.1, 4.2)), 4)
                claimed_amount = round(float(rng.uniform(0.72, 1.0) * plan_cap), 2)
                prior_rejections_90d = int(np.clip(rng.poisson(1.9), 0, 5))
            else:
                gps_zone_match = int(rng.choice([1, 0], p=[0.96, 0.04]))
                claim_velocity_7d = int(np.clip(rng.poisson(0.7), 0, 4))
                historical_zone_presence = round(float(rng.beta(5.1, 1.9)), 4)
                time_since_event_seconds = int(np.clip(rng.exponential(8200.0), 480, 172800))
                platform_activity_during_event = round(float(rng.beta(3.6, 1.7)), 4)
                claimed_amount = round(float(rng.uniform(0.18, 0.68) * plan_cap), 2)
                prior_rejections_90d = int(np.clip(rng.poisson(0.2), 0, 2))

            rows.append({
                "claim_id": f"CLM_{len(rows):05d}",
                "season": season,
                "plan_name": plan_name,
                "event_type": event_type,
                "plan_base_premium": plan["base_premium"],
                "plan_max_payout": plan["max_payout"],
                "gps_zone_match": gps_zone_match,
                "claim_velocity_7d": claim_velocity_7d,
                "historical_zone_presence": historical_zone_presence,
                "time_since_event_seconds": time_since_event_seconds,
                "platform_activity_during_event": platform_activity_during_event,
                "claimed_amount": claimed_amount,
                "claimed_amount_ratio": round(claimed_amount / plan_cap, 4),
                "prior_rejections_90d": prior_rejections_90d,
                "is_fraud": int(is_fraud),
            })

    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    out = os.path.join(os.path.dirname(__file__), "synthetic_fraud_data.csv")
    df.to_csv(out, index=False)

    print(f"[Fraud Data] Generated {len(df)} records -> {out}")
    print("  Fraud rate       :", round(df["is_fraud"].mean(), 4))
    print("  Plan distribution:", {str(k): int(v) for k, v in df["plan_name"].value_counts().to_dict().items()})
    print("  Avg claimed amount ratio by fraud label:")
    print(df.groupby("is_fraud")["claimed_amount_ratio"].mean().round(3).to_string())
    return df


if __name__ == "__main__":
    print("=" * 55)
    print("  GigShield - Synthetic Training Data Generator")
    print("=" * 55)
    generate_risk_data()
    generate_fraud_data(num_samples=5000)
    print("=" * 55)
    print("Done. Run train_risk.py and train_fraud.py next.")
    print("=" * 55)
