from __future__ import annotations

import requests

from app.config import has_live_weather_api, settings
from app.services.trigger_context import build_trigger_context


def _build_weather_response(
    zone_id: str,
    city: str,
    lat: float | None,
    lng: float | None,
    season: str | None,
    temperature: float,
    rainfall_mm: float,
    humidity: float,
    source: str,
) -> dict:
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
        "city": city,
        "lat": lat,
        "lng": lng,
        "season": season,
        "temperature_celsius": round(float(temperature), 1),
        "rainfall_mm": round(float(rainfall_mm), 1),
        "humidity": round(float(humidity), 1),
        "threshold_breached": trigger_type != "none",
        "severity": severity,
        "trigger_type": trigger_type,
        "description": description,
        "source": source,
    }


def _get_live_weather(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict | None:
    if not has_live_weather_api():
        return None

    params: dict[str, str | float] = {
        "appid": settings.openweathermap_api_key,
        "units": "metric",
    }
    if lat is not None and lng is not None:
        params["lat"] = lat
        params["lon"] = lng
    elif city:
        params["q"] = city
    else:
        return None

    try:
        response = requests.get(
            settings.openweathermap_base_url,
            params=params,
            timeout=settings.external_api_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        print(f"[Weather] Live feed unavailable, falling back to deterministic feed: {exc}")
        return None

    main = payload.get("main") or {}
    rain = payload.get("rain") or {}
    coord = payload.get("coord") or {}
    weather = (payload.get("weather") or [{}])[0]
    rainfall_mm = rain.get("1h", rain.get("3h", 0.0))

    return _build_weather_response(
        zone_id=zone_id,
        city=payload.get("name") or city or "Mumbai",
        lat=coord.get("lat", lat),
        lng=coord.get("lon", lng),
        season=None,
        temperature=float(main.get("temp", 0.0)),
        rainfall_mm=float(rainfall_mm or 0.0),
        humidity=float(main.get("humidity", 0.0)),
        source=f"openweathermap-live:{weather.get('main', 'unknown')}",
    )


def get_weather(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    live_weather = _get_live_weather(zone_id, city=city, lat=lat, lng=lng)
    if live_weather is not None:
        return live_weather

    """
    Deterministic fallback weather feed with seasonal and city-aware behavior.

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

    return _build_weather_response(
        zone_id=str(zone_id),
        city=ctx["city"],
        lat=ctx["lat"],
        lng=ctx["lng"],
        season=season,
        temperature=temperature,
        rainfall_mm=rainfall_mm,
        humidity=humidity,
        source=ctx["source"],
    )
