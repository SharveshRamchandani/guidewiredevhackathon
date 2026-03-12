/**
 * Worker Routes - /api/worker/*
 * Location + zones for GigShield workers - FIXED VERSION
 */

const router = require('express').Router();
const { query } = require('../config/db');
const { requireWorkerAuth } = require('../middleware/authMiddleware');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asyncHandler = fn => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

function formatError(code, message) {
  return { success: false, message, code };
}

function formatSuccess(data) {
  return { success: true, ...data };
}

// ─── GET /api/worker/zones?city=Mumbai ────────────────────────────────────────

router.get('/zones', asyncHandler(async (req, res) => {
  try {
    let citySearch = req.query.city?.toString()?.trim().toLowerCase() || '';
    
    if (!citySearch) {
      return res.status(400).json(formatError('VALIDATION_ERROR', 'City parameter required'));
    }

    let detectedCity = citySearch;
    let remapped = false;

    // Step 1: Try exact/fuzzy match first
    let { rows: zones } = await query(`
      SELECT z.id, z.name, c.name as city_name
      FROM zones z 
      JOIN cities c ON c.id = z.city_id 
      WHERE LOWER(c.name) LIKE LOWER($1)
      ORDER BY c.name, z.name
    `, [`%${citySearch}%`]);

    // Step 2: If no match, try remapping
    if (zones.length === 0) {
      const NEARBY_CITY_MAP = {
        // Tamil Nadu
        'sathyamangalam': 'coimbatore', 'erode': 'coimbatore', 'tiruppur': 'coimbatore',
        'pollachi': 'coimbatore', 'mettupalayam': 'coimbatore', 'gobichettipalayam': 'coimbatore',
        'dindigul': 'coimbatore', 'salem': 'coimbatore', 'namakkal': 'coimbatore',
        'madurai': 'chennai', 'trichy': 'chennai', 'tiruchirappalli': 'chennai',
        'vellore': 'chennai', 'kanchipuram': 'chennai', 'tirunelveli': 'chennai',
        // Karnataka
        'mysuru': 'bangalore', 'mysore': 'bangalore', 'tumkur': 'bangalore',
        'mangalore': 'bangalore', 'hubli': 'bangalore', 'dharwad': 'bangalore',
        // Maharashtra
        'nashik': 'mumbai', 'aurangabad': 'mumbai', 'solapur': 'pune',
        'kolhapur': 'pune', 'satara': 'pune', 'sangli': 'pune',
        // Others
        'gurgaon': 'delhi', 'gurugram': 'delhi', 'noida': 'delhi', 'faridabad': 'delhi',
        'thane': 'mumbai', 'navi mumbai': 'mumbai', 'kalyan': 'mumbai',
        'secunderabad': 'hyderabad', 'warangal': 'hyderabad',
        'ghaziabad': 'delhi', 'meerut': 'delhi',
      };

      const remappedCity = NEARBY_CITY_MAP[citySearch];
      if (remappedCity) {
        citySearch = remappedCity;
        detectedCity = citySearch;
        remapped = true;

        ({ rows: zones } = await query(`
          SELECT z.id, z.name, c.name as city_name
          FROM zones z 
          JOIN cities c ON c.id = z.city_id 
          WHERE LOWER(c.name) LIKE LOWER($1)
          ORDER BY c.name, z.name
        `, [`%${citySearch}%`]));
      }
    }

    if (zones.length === 0) {
      const { rows: topCities } = await query(`
        SELECT c.name, COUNT(z.id) as zone_count
        FROM cities c
        LEFT JOIN zones z ON z.city_id = c.id
        GROUP BY c.id, c.name
        ORDER BY zone_count DESC NULLS LAST, c.name
        LIMIT 10
      `, []);
      const availableCities = topCities.map(row => row.name);

      return res.json({
        success: false,
        message: 'City not found',
        availableCities,
        detectedCity
      });
    }

    // Group by city
    const cityName = zones[0].city_name;
    const uniqueZones = zones.filter(z => z.city_name === cityName);

    res.json(formatSuccess({ 
      city: cityName, 
      detectedAs: remapped ? detectedCity : undefined,
      remapped,
      zones: uniqueZones.map(({id, name}) => ({
        id,
        name,
        zone_number: 1,
        risk_level: 'low'
      }))
    }));
  } catch (err) {
    console.error('Zones route error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}));

// ─── PATCH /api/worker/location ───────────────────────────────────────────────

router.patch('/location', requireWorkerAuth, asyncHandler(async (req, res) => {
  try {
    const { city, zone_id } = req.body;
    
    if (!city || zone_id === undefined) {
      return res.status(400).json(formatError('VALIDATION_ERROR', 'city and zone_id required'));
    }

    const { rows } = await query(`
      UPDATE workers 
      SET city = $1, zone_id = $2, updated_at = NOW() 
      WHERE id = $3 
      RETURNING id, city, zone_id
    `, [city, zone_id, req.worker.id]);

    if (rows.length === 0) {
      return res.status(404).json(formatError('WORKER_NOT_FOUND', 'Worker not found'));
    }

    res.json(formatSuccess({ worker: rows[0] }));
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}));

module.exports = router;

