"""
AI Disruption Detection Model
Multi-factor weighted scoring using IMD India & CPCB AQI thresholds.
Weights reflect real-world impact of each factor on gig worker mobility.
"""

from typing import Dict

# --- Severity thresholds per factor (India-specific) ---
TEMP_T: Dict[str, float] = {"low": 38.0, "mod": 42.0, "high": 45.0, "extreme": 48.0}
RAIN_T: Dict[str, float] = {"low": 20.0, "mod": 50.0, "high": 100.0, "extreme": 150.0}
AQI_T:  Dict[str, float] = {"low": 151.0, "mod": 251.0, "high": 301.0, "extreme": 401.0}
WIND_T: Dict[str, float] = {"low": 30.0, "mod": 50.0, "high": 70.0,  "extreme": 90.0}


def _round4(x: float) -> float:
    """Round to 4 decimal places, returning an unambiguous float."""
    return round(x, 4)


def _score(value: float, t: Dict[str, float]) -> float:
    if value < t["low"]:       return 0.0
    elif value < t["mod"]:     return 0.30
    elif value < t["high"]:    return 0.60
    elif value < t["extreme"]: return 0.85
    else:                      return 1.0


def assess_disruption(
    temperature_celsius: float,
    rainfall_mm: float,
    aqi_score: int,
    wind_speed_kmh: float = 0.0,
) -> Dict[str, object]:
    ts: float = _score(temperature_celsius, TEMP_T)
    rs: float = _score(rainfall_mm,         RAIN_T)
    aq: float = _score(float(aqi_score),    AQI_T)
    ws: float = _score(wind_speed_kmh,      WIND_T)

    # Weighted probability — rain/heat dominate gig worker disruption
    weighted_sum: float = 0.30 * ts + 0.35 * rs + 0.25 * aq + 0.10 * ws
    prob: float = _round4(weighted_sum)

    # Determine primary disruption type
    flood_score:      float = rs if rainfall_mm > 100 else 0.0
    heavy_rain_score: float = rs if 50.0 <= rainfall_mm <= 100.0 else 0.0
    candidates: Dict[str, float] = {
        "flood":            flood_score,
        "heavy_rain":       heavy_rain_score,
        "heatwave":         ts,
        "poor_air_quality": aq,
        "storm":            ws,
    }
    primary: str = max(candidates, key=lambda k: candidates[k])
    if candidates[primary] == 0.0:
        primary = "none"

    # Compound if 2+ factors are elevated
    if sum(1 for s in [ts, rs, aq, ws] if s >= 0.6) >= 2:
        primary = "compound"

    severity: str
    if prob < 0.20:   severity = "none"
    elif prob < 0.40: severity = "low"
    elif prob < 0.60: severity = "moderate"
    elif prob < 0.80: severity = "high"
    else:             severity = "extreme"

    threshold_breached: bool = prob >= 0.50

    raw_impact: float = prob * 1.4
    income_impact_factor: float = _round4(raw_impact if raw_impact < 1.0 else 1.0)

    # Confidence = distance from decision boundary (0.5), normalised to 0–1
    # 1.0 = model is absolutely certain | 0.0 = right on the boundary
    raw_conf: float = abs(prob - 0.5) * 2.0
    clamped_conf: float = max(0.0, min(raw_conf, 1.0))
    disruption_confidence: float = _round4(clamped_conf)

    reasons = []
    if temperature_celsius >= TEMP_T["low"]: reasons.append(f"Temp {temperature_celsius}C")
    if rainfall_mm >= RAIN_T["low"]:         reasons.append(f"Rainfall {rainfall_mm}mm")
    if float(aqi_score) >= AQI_T["low"]:     reasons.append(f"AQI {aqi_score}")
    if wind_speed_kmh >= WIND_T["low"]:      reasons.append(f"Wind {wind_speed_kmh}km/h")
    trigger_reason: str = ", ".join(reasons) if reasons else "Normal conditions"

    return {
        "disruption_probability":  prob,
        "disruption_type":         primary,
        "severity":                severity,
        "threshold_breached":      threshold_breached,
        "trigger_reason":          trigger_reason,
        "income_impact_factor":    income_impact_factor,
        "disruption_confidence":   disruption_confidence,
    }
