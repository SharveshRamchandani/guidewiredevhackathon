"""
Plan-aware dynamic premium engine.

The product catalog comes from the DB/backend. ML provides controlled signals,
not a black-box final price. This keeps pricing explainable and stable.
"""

from typing import Dict


PLAN_BOUNDS: Dict[str, tuple[float, float]] = {
    "nano": (20.0, 35.0),
    "basic": (40.0, 65.0),
    "standard": (65.0, 95.0),
    "premium": (85.0, 125.0),
}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _coverage_richness_multiplier(covered_event_count: int, avg_copay: float) -> float:
    event_bonus = min(max(covered_event_count - 2, 0), 5) * 0.025
    copay_bonus = max(0.0, 0.25 - avg_copay) * 0.20
    return round(1.0 + event_bonus + copay_bonus, 4)


def _risk_multiplier(risk_label: str, risk_score: float) -> float:
    label_base = {
        "low": 0.92,
        "medium": 1.02,
        "high": 1.12,
    }.get(risk_label, 1.02)
    confidence_adjustment = (risk_score - 0.5) * 0.18
    return round(_clamp(label_base + confidence_adjustment, 0.88, 1.22), 4)


def calculate_premium(
    plan_name: str,
    plan_base_premium: float,
    plan_max_payout: float,
    covered_event_count: int,
    avg_copay: float,
    risk_label: str,
    risk_score: float,
    city_climate_risk: float,
    disruption_probability: float,
    vulnerability_score: float,
) -> dict:
    plan_key = plan_name.lower()
    floor_price, ceiling_price = PLAN_BOUNDS.get(plan_key, (plan_base_premium * 0.85, plan_base_premium * 1.35))

    risk_mult = _risk_multiplier(risk_label, risk_score)
    climate_mult = round(_clamp(1.0 + city_climate_risk * 0.18, 1.0, 1.18), 4)
    disruption_mult = round(_clamp(1.0 + disruption_probability * 0.12, 1.0, 1.12), 4)
    vulnerability_mult = round(_clamp(1.0 + vulnerability_score * 0.08, 1.0, 1.08), 4)
    coverage_mult = _coverage_richness_multiplier(covered_event_count, avg_copay)

    raw_premium = plan_base_premium * risk_mult * climate_mult * disruption_mult * vulnerability_mult * coverage_mult
    weekly_premium = round(_clamp(raw_premium, floor_price, ceiling_price), 2)

    coverage_uplift = _clamp(
        1.0 + (0.03 if avg_copay <= 0.10 else 0.0) + vulnerability_score * 0.04,
        1.0,
        1.08,
    )
    coverage_amount = round(plan_max_payout * coverage_uplift, 2)

    tier_map = {
        "nano": "Nano Protect",
        "basic": "Core Shield",
        "standard": "Flex Shield",
        "premium": "Full Shield",
    }

    return {
        "weekly_premium_inr": weekly_premium,
        "coverage_amount_inr": coverage_amount,
        "pricing_tier": tier_map.get(plan_key, "Dynamic"),
        "breakdown": {
            "plan_name": plan_key,
            "base_premium": round(plan_base_premium, 2),
            "risk_multiplier": risk_mult,
            "climate_multiplier": climate_mult,
            "disruption_multiplier": disruption_mult,
            "vulnerability_multiplier": vulnerability_mult,
            "coverage_richness_multiplier": coverage_mult,
            "price_floor": floor_price,
            "price_ceiling": ceiling_price,
            "avg_copay": avg_copay,
            "covered_event_count": covered_event_count,
            "raw_premium_before_guardrails": round(raw_premium, 2),
        },
    }
