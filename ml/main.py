from fastapi import FastAPI
from app.routers import health, risk, fraud
from app.services import weather, aqi, mock_alerts

app = FastAPI(
    title="GigShield ML Service",
    description="ML Microservice for calculating risk & fraud scores for parametric insurance",
    version="1.0.0"
)

# Include routers
app.include_router(health.router)
app.include_router(risk.router)
app.include_router(fraud.router)

@app.get("/triggers/weather", tags=["Triggers"])
def trigger_weather(zone_id: str):
    return weather.get_weather(zone_id)

@app.get("/triggers/aqi", tags=["Triggers"])
def trigger_aqi(zone_id: str):
    return aqi.get_aqi(zone_id)

@app.get("/triggers/mock-alerts", tags=["Triggers"])
def trigger_mock_alerts(zone_id: str):
    return mock_alerts.get_mock_alerts(zone_id)
