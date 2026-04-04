const mlClient = require('../config/mlClient');
const { query } = require('../config/db');
const { initiateClaimAuto } = require('./claimsService');
const { normaliseClaimType } = require('./claimsService');
const {
  cacheWeather, getWeather,
  cacheConfig, getConfig,
  invalidateDashboard,
} = require('../config/redis');

// ─── ML Trigger calls (GET endpoints with ?zone_id= param) ───────────────────

async function checkWeatherTrigger(zone) {
  const cacheKey = `weather_${zone.id}`;
  const cached   = await getWeather(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    zone_id: String(zone.id),
    city: String(zone.city_name || ''),
  });

  const { data } = await mlClient.get(`/triggers/weather?${params.toString()}`);
  await cacheWeather(cacheKey, data);
  return data;
}

async function checkAqiTrigger(zone) {
  const cacheKey = `aqi_${zone.id}`;
  const cached   = await getWeather(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    zone_id: String(zone.id),
    city: String(zone.city_name || ''),
  });

  const { data } = await mlClient.get(`/triggers/aqi?${params.toString()}`);
  await cacheWeather(cacheKey, data);
  return data;
}

async function checkAlertTrigger(zone) {
  // Mock alerts aren't cached aggressively (they simulate live events)
  const params = new URLSearchParams({
    zone_id: String(zone.id),
    city: String(zone.city_name || ''),
  });
  const { data } = await mlClient.get(`/triggers/mock-alerts?${params.toString()}`);
  return data;
}

// ─── Map ML trigger_type to schema-valid event type ───────────────────────────

function mlTypeToEventType(triggerKind) {
  const map = {
    flood:             'Heavy Rain',
    heavy_rain:        'Heavy Rain',
    extreme_heat:      'Heatwave',
    high_aqi:          'Poor AQI',
    strike:            'Platform Outage',
    curfew:            'Platform Outage',
    traffic:           'Platform Outage',
    none:              null,
  };
  return map[triggerKind] || null;
}

// Schema valid severities
function mapSeverity(severityFloat) {
  if (!severityFloat || severityFloat === 0) return 'low';
  if (severityFloat < 0.4)  return 'low';
  if (severityFloat < 0.6)  return 'medium';
  if (severityFloat < 0.85) return 'high';
  return 'critical';
}

// Schema valid sources: weather, aqi, platform, manual
function mlCategoryToSource(category) {
  const map = { weather: 'weather', aqi: 'aqi', alert: 'platform' };
  return map[category] || 'manual';
}

// ─── Process a trigger response ───────────────────────────────────────────────

async function processTrigger(category, mlData, zone) {
  if (!mlData || !mlData.threshold_breached) return null;

  const eventType = mlTypeToEventType(mlData.trigger_type);
  if (!eventType) return null; // trigger_type='none' → skip

  const severity   = mapSeverity(mlData.severity);
  const source     = mlCategoryToSource(category);
  const eventNum   = `EVT-${String(Date.now()).slice(-6)}`;
  const valueLabel = mlData.rainfall_mm != null
    ? `${mlData.rainfall_mm}mm`
    : mlData.temperature_celsius != null
      ? `${mlData.temperature_celsius}°C`
      : mlData.aqi_score != null
        ? `AQI ${mlData.aqi_score}`
        : JSON.stringify(mlData);

  // 1. Insert disruption_event
  const { rows: eventRows } = await query(
    `INSERT INTO disruption_events
       (event_number, type, zone_id, city_id, severity, value, source, verified,
        claims_generated, triggered_at)
     VALUES ($1, $2, $3,
             (SELECT city_id FROM zones WHERE id = $3),
             $4, $5, $6, false, 0, NOW())
     RETURNING *`,
    [eventNum, eventType, zone.id, severity, valueLabel, source]
  );
  const event = eventRows[0];
  console.log(`[Trigger] ✅ disruption_event ${event.event_number} — ${eventType}, zone: ${zone.name}, severity: ${severity}`);

  // 2. Find active policies for workers in this zone
  const { rows: affectedPolicies } = await query(
    `SELECT p.id AS policy_id, p.worker_id
     FROM policies p
     JOIN workers w ON w.id = p.worker_id
     WHERE p.status = 'active'
       AND w.zone_id = $1
       AND w.active = TRUE`,
    [zone.id]
  );
  console.log(`[Trigger] ${affectedPolicies.length} active policies in zone ${zone.name}`);

  // 3. Auto-initiate claims
  let claimsCount = 0;
  for (const { policy_id, worker_id } of affectedPolicies) {
    try {
      await initiateClaimAuto({
        workerId:    worker_id,
        policyId:    policy_id,
        eventId:     event.id,
        type:        eventType,
        description: `Auto-triggered: ${eventType} in ${zone.name}`,
        gpsMatch:    true,
      });
      claimsCount++;
    } catch (e) {
      console.error(`[Trigger] Claim error worker=${worker_id}: ${e.message}`);
    }
  }

  // 4. Update event claims_generated count
  await query(
    'UPDATE disruption_events SET claims_generated = $1 WHERE id = $2',
    [claimsCount, event.id]
  );

  await invalidateDashboard();
  return { event, claimsInitiated: claimsCount };
}

// ─── Main cron runner ─────────────────────────────────────────────────────────

async function runAllTriggers() {
  console.log(`\n[Trigger Engine] 🔄 ${new Date().toISOString()}`);

  // Read system config (Redis cache → DB fallback)
  let config = await getConfig();
  if (!config) {
    const { rows } = await query(
      'SELECT engine_active, check_interval_minutes, thresholds FROM system_config LIMIT 1'
    );
    config = rows[0] || { engine_active: true };
    await cacheConfig(config);
  }

  if (!config.engine_active) {
    console.log('[Trigger Engine] ⏸  Engine disabled. Skipping.');
    return;
  }

  // Fetch all zones (schema has no is_active column — use all)
  const { rows: zones } = await query(
    `SELECT z.id, z.name, z.city_id, c.name AS city_name
     FROM zones z
     LEFT JOIN cities c ON c.id = z.city_id`
  );

  if (!zones.length) {
    console.log('[Trigger Engine] No zones found.');
    return;
  }

  for (const zone of zones) {
    try {
      const [weatherResult, aqiResult, alertResult] = await Promise.allSettled([
        checkWeatherTrigger(zone),
        checkAqiTrigger(zone),
        checkAlertTrigger(zone),
      ]);

      if (weatherResult.status === 'fulfilled') {
        await processTrigger('weather', weatherResult.value, zone);
      } else {
        console.warn(`[Trigger] weather check failed for zone ${zone.name}:`, weatherResult.reason?.message);
      }

      if (aqiResult.status === 'fulfilled') {
        await processTrigger('aqi', aqiResult.value, zone);
      } else {
        console.warn(`[Trigger] AQI check failed for zone ${zone.name}:`, aqiResult.reason?.message);
      }

      if (alertResult.status === 'fulfilled') {
        await processTrigger('alert', alertResult.value, zone);
      } else {
        console.warn(`[Trigger] alert check failed for zone ${zone.name}:`, alertResult.reason?.message);
      }
    } catch (e) {
      console.error(`[Trigger] Zone ${zone.name} unexpected error: ${e.message}`);
    }
  }

  console.log('[Trigger Engine] ✅ Cycle complete.\n');
}

module.exports = {
  runAllTriggers, processTrigger,
  checkWeatherTrigger, checkAqiTrigger, checkAlertTrigger,
};
