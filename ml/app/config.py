from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openweathermap_api_key: str = "mock-weather-key"
    openweathermap_base_url: str = "https://api.openweathermap.org/data/2.5/weather"
    aqicn_api_key: str = "mock-aqi-key"
    aqicn_base_url: str = "https://api.waqi.info/feed"
    external_api_timeout_seconds: float = 4.0
    groq_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()


def has_live_weather_api() -> bool:
    return bool(settings.openweathermap_api_key and settings.openweathermap_api_key != "mock-weather-key")


def has_live_aqi_api() -> bool:
    return bool(settings.aqicn_api_key and settings.aqicn_api_key != "mock-aqi-key")
