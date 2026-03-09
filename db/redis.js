const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

client.on('connect',  () => console.log('✅ Redis connected'));
client.on('error',   (err) => console.error('❌ Redis error:', err.message));

client.connect();

// ─────────────────────────────────────────
// TTL CONSTANTS
// ─────────────────────────────────────────
const TTL = {
  WEATHER:       60 * 2,        // 2 min  — live weather/AQI per zone
  DASHBOARD:     60 * 3,        // 3 min  — admin KPIs, funnel
  RISK_ZONES:    60 * 5,        // 5 min  — zone risk levels
  CONFIG:        60 * 1,        // 1 min  — system config for cron
  SESSION:       60 * 60 * 24,  // 24 hrs — worker/admin sessions
  RATE_LIMIT:    60 * 1,        // 1 min  — API rate limit window
};

// ─────────────────────────────────────────
// HELPER WRAPPERS
// ─────────────────────────────────────────

/** Cache weather/AQI data per zone */
async function cacheWeather(zone, data) {
  await client.setEx(`weather:${zone}`, TTL.WEATHER, JSON.stringify(data));
}
async function getWeather(zone) {
  const val = await client.get(`weather:${zone}`);
  return val ? JSON.parse(val) : null;
}

/** Cache dashboard KPIs */
async function cacheDashboard(data) {
  await client.setEx('dashboard:kpis', TTL.DASHBOARD, JSON.stringify(data));
}
async function getDashboard() {
  const val = await client.get('dashboard:kpis');
  return val ? JSON.parse(val) : null;
}

/** System config cache (for trigger engine / cron) */
async function cacheConfig(data) {
  await client.setEx('system:config', TTL.CONFIG, JSON.stringify(data));
}
async function getConfig() {
  const val = await client.get('system:config');
  return val ? JSON.parse(val) : null;
}

/** Worker session */
async function setSession(workerId, sessionData) {
  await client.setEx(`session:worker:${workerId}`, TTL.SESSION, JSON.stringify(sessionData));
}
async function getSession(workerId) {
  const val = await client.get(`session:worker:${workerId}`);
  return val ? JSON.parse(val) : null;
}
async function deleteSession(workerId) {
  await client.del(`session:worker:${workerId}`);
}

/** Admin session */
async function setAdminSession(adminId, sessionData) {
  await client.setEx(`session:admin:${adminId}`, TTL.SESSION, JSON.stringify(sessionData));
}
async function getAdminSession(adminId) {
  const val = await client.get(`session:admin:${adminId}`);
  return val ? JSON.parse(val) : null;
}

// ─────────────────────────────────────────
// QUEUES (Redis Lists)
// ─────────────────────────────────────────

/** Push claim to fraud-check queue */
async function enqueueClaim(claimId) {
  await client.rPush('queue:claims:fraud', claimId);
}
/** Pop next claim from fraud-check queue */
async function dequeueClaim() {
  return await client.lPop('queue:claims:fraud');
}

/** Push approved claim to payout queue */
async function enqueuePayout(payoutId) {
  await client.rPush('queue:payouts', payoutId);
}
/** Pop next payout from payout queue */
async function dequeuePayout() {
  return await client.lPop('queue:payouts');
}

// ─────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────

/** Returns false if rate limit exceeded */
async function checkRateLimit(key, maxRequests = 10) {
  const current = await client.incr(`ratelimit:${key}`);
  if (current === 1) await client.expire(`ratelimit:${key}`, TTL.RATE_LIMIT);
  return current <= maxRequests;
}

// ─────────────────────────────────────────
// INVALIDATION
// ─────────────────────────────────────────

async function invalidateDashboard() {
  await client.del('dashboard:kpis');
}
async function invalidateWeather(zone) {
  await client.del(`weather:${zone}`);
}
async function invalidateConfig() {
  await client.del('system:config');
}

module.exports = {
  client,
  TTL,
  // Weather
  cacheWeather, getWeather, invalidateWeather,
  // Dashboard
  cacheDashboard, getDashboard, invalidateDashboard,
  // Config
  cacheConfig, getConfig, invalidateConfig,
  // Sessions
  setSession, getSession, deleteSession,
  setAdminSession, getAdminSession,
  // Queues
  enqueueClaim, dequeueClaim,
  enqueuePayout, dequeuePayout,
  // Rate Limiting
  checkRateLimit,
};
