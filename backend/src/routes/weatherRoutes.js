const router = require('express').Router();
const mlClient = require('../config/mlClient');

router.get('/current', async (req, res, next) => {
  try {
    const zoneId = req.query.zone_id ? String(req.query.zone_id) : 'live';
    const city = req.query.city ? String(req.query.city) : '';
    const lat = req.query.lat ? String(req.query.lat) : '';
    const lng = req.query.lng ? String(req.query.lng) : '';

    const weatherQs = new URLSearchParams({ zone_id: zoneId });
    const aqiQs = new URLSearchParams({ zone_id: zoneId });

    if (city) {
      weatherQs.set('city', city);
      aqiQs.set('city', city);
    }
    if (lat && lng) {
      weatherQs.set('lat', lat);
      weatherQs.set('lng', lng);
      aqiQs.set('lat', lat);
      aqiQs.set('lng', lng);
    }

    const [weatherRes, aqiRes] = await Promise.all([
      mlClient.get(`/triggers/weather?${weatherQs.toString()}`),
      mlClient.get(`/triggers/aqi?${aqiQs.toString()}`),
    ]);

    const aqiScore = Number(aqiRes.data?.aqi_score || 0);

    res.json({
      success: true,
      data: {
        city: weatherRes.data?.city || city || 'Unknown',
        temp: Number(weatherRes.data?.temperature_celsius || 0),
        rainfall: Number(weatherRes.data?.rainfall_mm || 0),
        humidity: Number(weatherRes.data?.humidity || 0),
        description: weatherRes.data?.description || 'unknown',
        aqi: aqiScore,
        aqiLabel: aqiScore > 300
          ? 'Very Poor'
          : aqiScore > 200
            ? 'Poor'
            : aqiScore > 100
              ? 'Moderate'
              : aqiScore > 50
                ? 'Fair'
                : 'Good',
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
        source: {
          weather: weatherRes.data?.source || 'unknown',
          aqi: aqiRes.data?.source || 'unknown',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
