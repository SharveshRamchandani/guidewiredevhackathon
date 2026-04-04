from typing import Optional
from fastapi import FastAPI
from app.routers import health, risk, fraud, disruption, income, vulnerability, premium, trigger

app = FastAPI(
    title="GigShield ML Service",
    description=(
        "AI-powered ML microservice for GigShield — parametric insurance for gig workers. "
        "Covers risk scoring, fraud detection, disruption detection, income loss prediction, "
        "vulnerability scoring, dynamic premium pricing, and parametric payout triggers."
    ),
    version="2.0.0",
)

# ── Core ML endpoints ─────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(risk.router)
app.include_router(fraud.router)

# ── New AI modules ────────────────────────────────────────────────────
app.include_router(disruption.router)     # disruption-score, heatmap, correlations
app.include_router(income.router)         # income-loss, income-shock
app.include_router(vulnerability.router)  # vulnerability-score
app.include_router(premium.router)        # premium
app.include_router(trigger.router)        # trigger (core parametric engine)


# ── Legacy trigger endpoints (weather/AQI/alerts) ─────────────────────
from app.services import weather, aqi, mock_alerts

@app.get("/triggers/weather", tags=["Triggers"])
def trigger_weather(
    zone_id: str,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    return weather.get_weather(zone_id, city=city, lat=lat, lng=lng)

@app.get("/triggers/aqi", tags=["Triggers"])
def trigger_aqi(
    zone_id: str,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    return aqi.get_aqi(zone_id, city=city, lat=lat, lng=lng)

@app.get("/triggers/mock-alerts", tags=["Triggers"])
def trigger_mock_alerts(
    zone_id: str,
    city: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
):
    return mock_alerts.get_mock_alerts(zone_id, city=city, lat=lat, lng=lng)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
