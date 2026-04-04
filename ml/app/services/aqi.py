from app.services.trigger_context import build_trigger_context


def get_aqi(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    """
    Mock AQI feed tuned by city risk and seasonality.

    Hazard trigger:
    - AQI > 300
    """

    ctx = build_trigger_context(zone_id, city=city, lat=lat, lng=lng)
    profile = ctx["profile"]
    season = ctx["season"]

    aqi_risk = float(profile["aqi"])
    aqi_ratio = float(ctx["aqi_ratio"])

    baseline = {
        "winter": 90 + aqi_risk * 180,
        "summer": 60 + aqi_risk * 120,
        "monsoon": 35 + aqi_risk * 70,
        "post_monsoon": 80 + aqi_risk * 150,
    }[season]
    spike = {
        "winter": aqi_ratio**2 * 210,
        "summer": aqi_ratio**2 * 150,
        "monsoon": aqi_ratio**2 * 95,
        "post_monsoon": aqi_ratio**2 * 185,
    }[season]
    aqi_score = int(round(min(500, baseline + spike)))

    severity = round(min(aqi_score / 500, 1.0), 2)
    threshold_breached = aqi_score > 300

    if aqi_score > 400:
        label = "hazardous"
    elif aqi_score > 300:
        label = "very_poor"
    elif aqi_score > 200:
        label = "poor"
    elif aqi_score > 100:
        label = "moderate"
    else:
        label = "fair"

    return {
        "zone_id": str(zone_id),
        "city": ctx["city"],
        "lat": ctx["lat"],
        "lng": ctx["lng"],
        "season": season,
        "aqi_score": aqi_score,
        "aqi_label": label,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": "high_aqi",
        "source": ctx["source"],
    }
