"""
Shared deterministic context for mock trigger feeds.

This keeps trigger outputs realistic enough for demos without requiring live
third-party APIs. Values are:
- zone-aware
- city-aware
- season-aware
- stable within the same 6-hour window
"""

from __future__ import annotations

from datetime import datetime
import hashlib
from typing import Any

from app.services.city_risk import CITY_PROFILES


DEFAULT_CITY = "Mumbai"


def _normalise_city(city: str | None) -> str:
    if not city:
        return DEFAULT_CITY

    candidate = str(city).strip().lower()
    for profile_name in CITY_PROFILES:
        if profile_name.lower() == candidate:
            return profile_name
    return DEFAULT_CITY


def _stable_ratio(seed: str) -> float:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(2**64 - 1)


def _season(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "monsoon"
    if month in (3, 4, 5):
        return "summer"
    if month in (10, 11):
        return "post_monsoon"
    return "winter"


def build_trigger_context(
    zone_id: str,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict[str, Any]:
    now = datetime.utcnow()
    city_name = _normalise_city(city)
    profile = CITY_PROFILES[city_name]
    season = _season(now.month)
    window = now.hour // 6
    seed_prefix = f"{zone_id}:{city_name}:{now.year}:{now.month}:{now.day}:{window}"

    return {
        "zone_id": str(zone_id),
        "city": city_name,
        "lat": lat if lat is not None else profile["lat"],
        "lng": lng if lng is not None else profile["lon"],
        "month": now.month,
        "season": season,
        "profile": profile,
        "rain_ratio": _stable_ratio(f"{seed_prefix}:rain"),
        "temp_ratio": _stable_ratio(f"{seed_prefix}:temp"),
        "aqi_ratio": _stable_ratio(f"{seed_prefix}:aqi"),
        "alert_ratio": _stable_ratio(f"{seed_prefix}:alert"),
        "source": "deterministic-mock-feed",
    }
