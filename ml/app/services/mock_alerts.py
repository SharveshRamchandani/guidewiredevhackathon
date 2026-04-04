from app.services.trigger_context import build_trigger_context


def get_mock_alerts(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    """
    Mock platform / civic alerts.

    These are intentionally rarer than weather and AQI events. The output is
    deterministic for a 6-hour window and varies by city worker density.
    """

    ctx = build_trigger_context(zone_id, city=city, lat=lat, lng=lng)
    profile = ctx["profile"]
    alert_ratio = float(ctx["alert_ratio"])
    density = float(profile["density"])

    breach_threshold = 0.92 - density * 0.10
    threshold_breached = alert_ratio >= breach_threshold

    if alert_ratio >= 0.985:
        alert_type = "curfew"
        severity = 0.95
        headline = "Municipal movement restrictions reported"
    elif alert_ratio >= 0.955:
        alert_type = "traffic"
        severity = 0.72
        headline = "Major road restrictions delaying deliveries"
    elif threshold_breached:
        alert_type = "strike"
        severity = 0.64
        headline = "Localized worker strike signal detected"
    else:
        alert_type = "none"
        severity = 0.0
        headline = "No civic or platform alert detected"

    return {
        "zone_id": str(zone_id),
        "city": ctx["city"],
        "alert_type": alert_type,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": alert_type,
        "headline": headline,
        "source": ctx["source"],
    }
