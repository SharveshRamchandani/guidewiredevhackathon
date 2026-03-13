"""
AI Dynamic Weekly Premium Pricing Engine
Personalises weekly premiums using risk label, city climate risk,
real-time disruption probability, and worker vulnerability score.
"""

BASE_PREMIUM  = {"low": 40.0,  "medium": 70.0,  "high": 120.0}
BASE_COVERAGE = {"low": 400.0, "medium": 700.0,  "high": 1200.0}


def calculate_premium(
    risk_label: str,
    city_climate_risk: float,
    disruption_probability: float,
    vulnerability_score: float,
) -> dict:
    base     = BASE_PREMIUM.get(risk_label, 70.0)
    coverage = BASE_COVERAGE.get(risk_label, 700.0)

    climate_mult    = round(1.0 + city_climate_risk     * 0.50, 3)  # max 1.5x
    disruption_mult = round(1.0 + disruption_probability * 0.40, 3)  # max 1.4x
    vuln_mult       = round(1.0 + vulnerability_score    * 0.30, 3)  # max 1.3x

    weekly_premium  = round(base * climate_mult * disruption_mult * vuln_mult, 2)
    final_coverage  = round(coverage * (1 + vulnerability_score * 0.5), 2)

    if weekly_premium <= 55:    tier = "Starter"
    elif weekly_premium <= 90:  tier = "Standard"
    elif weekly_premium <= 140: tier = "Enhanced"
    else:                       tier = "Premium"

    return {
        "weekly_premium_inr":  weekly_premium,
        "coverage_amount_inr": final_coverage,
        "pricing_tier":        tier,
        "breakdown": {
            "base_premium":              base,
            "climate_multiplier":        climate_mult,
            "disruption_multiplier":     disruption_mult,
            "vulnerability_multiplier":  vuln_mult,
        },
    }
