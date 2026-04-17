from __future__ import annotations

import requests

from app.config import has_live_aqi_api, settings
from app.services.trigger_context import build_trigger_context


def _build_aqi_response(
    zone_id: str,
    city: str,
    lat: float | None,
    lng: float | None,
    season: str | None,
    aqi_score: int,
    source: str,
) -> dict:
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
        "city": city,
        "lat": lat,
        "lng": lng,
        "season": season,
        "aqi_score": int(aqi_score),
        "aqi_label": label,
        "threshold_breached": threshold_breached,
        "severity": severity,
        "trigger_type": "high_aqi",
        "source": source,
    }


def _get_live_aqi(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict | None:
    if not has_live_aqi_api():
        return None

    if lat is not None and lng is not None:
        endpoint = f"{settings.aqicn_base_url}/geo:{lat};{lng}/"
    elif city:
        endpoint = f"{settings.aqicn_base_url}/{city}/"
    else:
        return None

    try:
        response = requests.get(
            endpoint,
            params={"token": settings.aqicn_api_key},
            timeout=settings.external_api_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        print(f"[AQI] Live feed unavailable, falling back to deterministic feed: {exc}")
        return None

    if payload.get("status") != "ok":
        print(f"[AQI] Provider returned non-ok status, using fallback: {payload.get('data')}")
        return None

    data = payload.get("data") or {}
    city_data = data.get("city") or {}
    geo = city_data.get("geo") or [lat, lng]

    return _build_aqi_response(
        zone_id=zone_id,
        city=city_data.get("name") or city or "Mumbai",
        lat=geo[0] if len(geo) > 0 else lat,
        lng=geo[1] if len(geo) > 1 else lng,
        season=None,
        aqi_score=int(data.get("aqi", 0) or 0),
        source="aqicn-live",
    )


def get_aqi(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    live_aqi = _get_live_aqi(zone_id, city=city, lat=lat, lng=lng)
    if live_aqi is not None:
        return live_aqi

    """
    Deterministic fallback AQI feed tuned by city risk and seasonality.

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

    return _build_aqi_response(
        zone_id=str(zone_id),
        city=ctx["city"],
        lat=ctx["lat"],
        lng=ctx["lng"],
        season=season,
        aqi_score=aqi_score,
        source=ctx["source"],
    )
