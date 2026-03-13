import { useState, useEffect } from 'react';

export interface WeatherData {
  city: string;
  temp: number;          // celsius
  rainfall: number;      // mm/hr, 0 if no rain
  humidity: number;      // percentage
  description: string;   // e.g. "clear sky"
  aqi: number;           // 1-5
  aqiLabel: string;      // "Good" | "Fair" | "Moderate" | "Poor" | "Very Poor"
  lat: number;
  lng: number;
}

const API_KEY = 'bdad885b9049f27274ccec34d9f9fb3c';
const AQI_LABELS: Record<number, string> = {
  1: 'Good',
  2: 'Fair',
  3: 'Moderate',
  4: 'Poor',
  5: 'Very Poor'
};

export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          const [weatherRes, aqiRes] = await Promise.all([
            fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric`
            ),
            fetch(
              `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${API_KEY}`
            )
          ]);

          if (!weatherRes.ok || !aqiRes.ok) {
            throw new Error('Failed to fetch weather data');
          }

          const weatherData = await weatherRes.json();
          const aqiData = await aqiRes.json();

          const aqi = aqiData.list[0].main.aqi;

          const data: WeatherData = {
            city: weatherData.name,
            temp: weatherData.main.temp,
            rainfall: weatherData.rain ? (weatherData.rain['1h'] || 0) : 0,
            humidity: weatherData.main.humidity,
            description: weatherData.weather[0].description,
            aqi: aqi,
            aqiLabel: AQI_LABELS[aqi] || 'Unknown',
            lat,
            lng
          };

          setWeather(data);
          console.log('Weather Data Received:', data);
        } catch (err: any) {
          setError(err.message || 'An error occurred while fetching weather');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return { weather, loading, error, fetchWeather };
};

export default useWeather;
