"""
AI Disruption Detection Model
Multi-factor weighted scoring using IMD India & CPCB AQI thresholds.
Weights reflect real-world impact of each factor on gig worker mobility.
"""

# --- Severity thresholds per factor (India-specific) ---
TEMP_T  = {"low": 38.0, "mod": 42.0, "high": 45.0, "extreme": 48.0}
RAIN_T  = {"low": 20.0, "mod": 50.0, "high": 100.0, "extreme": 150.0}
AQI_T   = {"low": 151,  "mod": 251,  "high": 301,   "extreme": 401}
WIND_T  = {"low": 30.0, "mod": 50.0, "high": 70.0,  "extreme": 90.0}


def _score(value: float, t: dict) -> float:
    if value < t["low"]:     return 0.0
    elif value < t["mod"]:   return 0.30
    elif value < t["high"]:  return 0.60
    elif value < t["extreme"]: return 0.85
    else:                    return 1.0


def assess_disruption(
    temperature_celsius: float,
    rainfall_mm: float,
    aqi_score: int,
    wind_speed_kmh: float = 0.0,
) -> dict:
    ts = _score(temperature_celsius, TEMP_T)
    rs = _score(rainfall_mm,         RAIN_T)
    aq = _score(aqi_score,           AQI_T)
    ws = _score(wind_speed_kmh,      WIND_T)

    # Weighted probability — rain/heat dominate gig worker disruption
    prob = round(0.30 * ts + 0.35 * rs + 0.25 * aq + 0.10 * ws, 4)

    # Determine primary disruption type
    candidates = {
        "flood":            rs if rainfall_mm > 100 else 0,
        "heavy_rain":       rs if 50 <= rainfall_mm <= 100 else 0,
        "heatwave":         ts,
        "poor_air_quality": aq,
        "storm":            ws,
    }
    primary = max(candidates, key=candidates.get)
    if candidates[primary] == 0:
        primary = "none"

    # Compound if 2+ factors are elevated
    if sum(1 for s in [ts, rs, aq, ws] if s >= 0.6) >= 2:
        primary = "compound"

    if prob < 0.20:   severity = "none"
    elif prob < 0.40: severity = "low"
    elif prob < 0.60: severity = "moderate"
    elif prob < 0.80: severity = "high"
    else:             severity = "extreme"

    threshold_breached = prob >= 0.50
    income_impact_factor = round(min(prob * 1.4, 1.0), 4)

    # Confidence = distance from decision boundary (0.5), normalised to 0–1
    # 1.0 = model is absolutely certain | 0.0 = right on the boundary
    disruption_confidence = round(min(max(abs(prob - 0.5) * 2, 0.0), 1.0), 4)

    reasons = []
    if temperature_celsius >= TEMP_T["low"]: reasons.append(f"Temp {temperature_celsius}C")
    if rainfall_mm >= RAIN_T["low"]:         reasons.append(f"Rainfall {rainfall_mm}mm")
    if aqi_score >= AQI_T["low"]:            reasons.append(f"AQI {aqi_score}")
    if wind_speed_kmh >= WIND_T["low"]:      reasons.append(f"Wind {wind_speed_kmh}km/h")
    trigger_reason = ", ".join(reasons) if reasons else "Normal conditions"

    return {
        "disruption_probability":  prob,
        "disruption_type":         primary,
        "severity":                severity,
        "threshold_breached":      threshold_breached,
        "trigger_reason":          trigger_reason,
        "income_impact_factor":    income_impact_factor,
        "disruption_confidence":   disruption_confidence,
    }
