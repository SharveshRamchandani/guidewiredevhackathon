def get_aqi(zone_id: str) -> dict:
    # Mock AQI India (aqicn.org) wrapper
    # TODO: Replace with real httpx call to aqicn.org
    # Trigger rule: AQI > 300 = hazardous → threshold breached
    aqi_score = 142

    threshold_breached = aqi_score > 300
    severity_raw: float = min(aqi_score / 500, 1.0)
    severity = round(severity_raw, 2)

    return {
        "zone_id": zone_id,
        "aqi_score": aqi_score,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": "high_aqi"
    }