def get_weather(zone_id: str) -> dict:
    # Mock OpenWeatherMap API wrapper
    # TODO: Replace with real httpx call to OpenWeatherMap
    # Trigger rules: heavy_rain > 50mm, flood > 100mm, extreme_heat > 45°C
    temperature = 38.5
    rainfall_mm = 0.0

    threshold_breached = temperature > 45.0 or rainfall_mm > 50.0
    
    if rainfall_mm > 100:
        severity = 1.0
        trigger_type = "flood"
    elif rainfall_mm > 50:
        severity = 0.7
        trigger_type = "heavy_rain"
    elif temperature > 45:
        severity = 0.5
        trigger_type = "extreme_heat"
    else:
        severity = 0.0
        trigger_type = "none"

    return {
        "zone_id": zone_id,
        "temperature_celsius": temperature,
        "rainfall_mm": rainfall_mm,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": trigger_type
    }
