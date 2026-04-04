from app.services.trigger_context import build_trigger_context


def get_weather(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    """
    Mock weather feed with seasonal and city-aware behavior.

    Trigger rules:
    - heavy_rain > 50mm
    - flood > 100mm
    - extreme_heat > 45C
    """

    ctx = build_trigger_context(zone_id, city=city, lat=lat, lng=lng)
    profile = ctx["profile"]
    season = ctx["season"]

    flood_risk = float(profile["flood"])
    heat_risk = float(profile["heat"])
    rain_ratio = float(ctx["rain_ratio"])
    temp_ratio = float(ctx["temp_ratio"])

    rainfall_base = {
        "monsoon": 15 + flood_risk * 55,
        "post_monsoon": 8 + flood_risk * 28,
        "summer": 1 + flood_risk * 10,
        "winter": 0 + flood_risk * 6,
    }[season]
    rainfall_spike = {
        "monsoon": rain_ratio**2 * (90 + flood_risk * 70),
        "post_monsoon": rain_ratio**2 * (55 + flood_risk * 45),
        "summer": rain_ratio**3 * 22,
        "winter": rain_ratio**3 * 12,
    }[season]
    rainfall_mm = round(rainfall_base + rainfall_spike, 1)

    temperature_base = {
        "summer": 33 + heat_risk * 8,
        "monsoon": 27 + heat_risk * 4,
        "post_monsoon": 29 + heat_risk * 5,
        "winter": 19 + heat_risk * 5,
    }[season]
    temperature_spike = {
        "summer": temp_ratio**2 * (8 + heat_risk * 4),
        "monsoon": temp_ratio * 3.5,
        "post_monsoon": temp_ratio * 4.5,
        "winter": temp_ratio * 3.0,
    }[season]
    temperature = round(temperature_base + temperature_spike, 1)

    humidity = round(
        max(28.0, min(98.0, 48 + rainfall_mm * 0.22 + flood_risk * 18 - (temperature - 28) * 0.4)),
        1,
    )

    if rainfall_mm >= 100:
        severity = round(min(1.0, 0.82 + min((rainfall_mm - 100) / 120, 0.18)), 2)
        trigger_type = "flood"
        description = "Severe waterlogging or flood conditions likely"
    elif rainfall_mm >= 50:
        severity = round(min(0.85, 0.50 + (rainfall_mm - 50) / 100), 2)
        trigger_type = "heavy_rain"
        description = "Heavy rainfall disrupting delivery routes"
    elif temperature >= 45:
        severity = round(min(0.75, 0.45 + (temperature - 45) / 10), 2)
        trigger_type = "extreme_heat"
        description = "Extreme heat conditions reducing worker safety"
    else:
        severity = 0.0
        trigger_type = "none"
        description = "No weather threshold breached"

    return {
        "zone_id": str(zone_id),
        "city": ctx["city"],
        "lat": ctx["lat"],
        "lng": ctx["lng"],
        "season": season,
        "temperature_celsius": temperature,
        "rainfall_mm": rainfall_mm,
        "humidity": humidity,
        "threshold_breached": trigger_type != "none",
        "severity": severity,
        "trigger_type": trigger_type,
        "description": description,
        "source": ctx["source"],
    }
