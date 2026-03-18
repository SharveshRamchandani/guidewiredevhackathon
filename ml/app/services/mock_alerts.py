def get_mock_alerts(zone_id: str) -> dict:
    # Mock endpoint for curfews, strikes, traffic
    # TODO: Replace with real govt/strike API when available
    alert_type = "strike"
    threshold_breached = True
    severity = 0.8

    return {
        "zone_id": int(zone_id),
        "alert_type": alert_type,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": alert_type
    }