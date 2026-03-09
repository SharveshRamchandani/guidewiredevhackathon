from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openweathermap_api_key: str = "mock-weather-key"
    aqicn_api_key: str = "mock-aqi-key"

    class Config:
        env_file = ".env"

settings = Settings()
