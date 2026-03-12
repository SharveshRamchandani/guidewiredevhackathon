const { createClient } = require('redis');

let client       = null;
let isConnected  = false;
let connectTried = false;

// ─── Connection ────────────────────────────────────────────────────────────────

async function getRedisClient() {
  if (client && isConnected) return client;
  if (connectTried) return null; // already failed once — don't retry in same process

  connectTried = true;

  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'disabled') {
    console.warn('[Redis] REDIS_URL not set — running without Redis cache.');
    return null;
  }

  // Capture a local ref so we can force-disconnect the orphaned client
  // if the Promise.race timeout fires before connect() completes.
  let _client = null;

  try {
    _client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        // ─── IMPORTANT ──────────────────────────────────────────────────────
        // Return false immediately (no retries) on the very first failure.
        // This prevents the "Max retries reached" + "Reconnecting..." spam
        // when the host is genuinely unreachable at startup.
        // If you want background retries after a successful first connect,
        // handle that in the 'error' listener instead.
        // ────────────────────────────────────────────────────────────────────
        reconnectStrategy: false,
      },
    });

    // Only log errors after we've confirmed a working connection.
    // This suppresses the flood of ECONNREFUSED / ETIMEDOUT on startup.
    _client.on('error',   (err) => { if (isConnected) console.warn('[Redis] Error:', err.message); });
    _client.on('connect', ()    => { isConnected = true; console.log('✅ Redis connected'); });
    _client.on('end',     ()    => { isConnected = false; });
    // 'reconnecting' listener intentionally omitted — reconnectStrategy:false means
    // reconnects won't happen, so this event would never fire in normal operation.

    await Promise.race([
      _client.connect(),
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('connect timeout')), 6000)
      ),
    ]);

    // ── Success path ──────────────────────────────────────────────────────────
    isConnected = true;
    client      = _client;
    return client;

  } catch (err) {
    // ── Failure path ──────────────────────────────────────────────────────────
    // Force-kill the underlying socket so the orphaned client stops retrying.
    // Without this, the redis lib's internal loop keeps firing 'reconnecting'
    // events and eventually logs "Max retries reached" even though we already
    // gave up and set client = null above.
    if (_client) {
      try { await _client.disconnect(); } catch (_) { /* best-effort */ }
    }

    console.warn(`[Redis] Could not connect (${err.message}) — running without cache.`);
    isConnected = false;
    client      = null;
    return null;
  }
}

// ─── No-op safe helpers ────────────────────────────────────────────────────────
// Every function is safe to call even when Redis is offline — they silently return.

async function set(key, value, ttlSeconds) {
  try {
    const r = await getRedisClient();
    if (!r) return;
    const opts = ttlSeconds ? { EX: ttlSeconds } : {};
    await r.set(key, JSON.stringify(value), opts);
  } catch { /* silently ignore */ }
}

async function get(key) {
  try {
    const r   = await getRedisClient();
    if (!r) return null;
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function del(key) {
  try {
    const r = await getRedisClient();
    if (!r) return;
    await r.del(key);
  } catch { /* silently ignore */ }
}

// ─── Auth Sessions ────────────────────────────────────────────────────────────

async function setSession(id, data, role = 'worker') {
  await set(`session:${role}:${id}`, data, 86400);
}

async function getSession(id, role = 'worker') {
  return get(`session:${role}:${id}`);
}

async function deleteSession(id, role = 'worker') {
  await del(`session:${role}:${id}`);
}

async function blacklistToken(token, ttlSeconds = 604800) {
  await set(`blacklist:${token}`, true, ttlSeconds);
}

async function isTokenBlacklisted(token) {
  return (await get(`blacklist:${token}`)) === true;
}

// ─── Weather cache ────────────────────────────────────────────────────────────

async function cacheWeather(zoneId, data) {
  await set(`weather:${zoneId}`, data, 120);
}

async function getWeather(zoneId) {
  return get(`weather:${zoneId}`);
}

// ─── System config cache ──────────────────────────────────────────────────────

async function cacheConfig(data) {
  await set('system:config', data, 60);
}

async function getConfig() {
  return get('system:config');
}

// ─── Dashboard KPIs cache ─────────────────────────────────────────────────────

async function cacheDashboard(data) {
  await set('dashboard:kpis', data, 180);
}

async function getDashboard() {
  return get('dashboard:kpis');
}

async function invalidateDashboard() {
  await del('dashboard:kpis');
}

// ─── Risk zones cache ─────────────────────────────────────────────────────────

async function cacheRiskZones(cityId, data) {
  await set(`risk_zones:${cityId}`, data, 300);
}

async function getRiskZones(cityId) {
  return get(`risk_zones:${cityId}`);
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

async function checkRateLimit(key, maxRequests = 60) {
  try {
    const r = await getRedisClient();
    if (!r) return true; // allow on Redis failure
    const rlKey = `ratelimit:${key}`;
    const count = await r.incr(rlKey);
    if (count === 1) await r.expire(rlKey, 60);
    return count <= maxRequests;
  } catch { return true; }
}

// ─── Claim fraud queue ────────────────────────────────────────────────────────

async function enqueueClaim(claimId) {
  try {
    const r = await getRedisClient();
    if (!r) return;
    await r.lPush('queue:claims:fraud', String(claimId));
  } catch { /* silently ignore */ }
}

async function dequeueClaim() {
  try {
    const r   = await getRedisClient();
    if (!r) return null;
    const val = await r.rPop('queue:claims:fraud');
    return val || null;
  } catch { return null; }
}

// ─── Payout queue ─────────────────────────────────────────────────────────────

async function enqueuePayout(payoutId) {
  try {
    const r = await getRedisClient();
    if (!r) return;
    await r.lPush('queue:payouts', String(payoutId));
  } catch { /* silently ignore */ }
}

async function dequeuePayout() {
  try {
    const r   = await getRedisClient();
    if (!r) return null;
    const val = await r.rPop('queue:payouts');
    return val || null;
  } catch { return null; }
}

module.exports = {
  getRedisClient,
  set, get, del,
  // Auth
  setSession, getSession, deleteSession,
  blacklistToken, isTokenBlacklisted,
  // Caches
  cacheWeather, getWeather,
  cacheConfig, getConfig,
  cacheDashboard, getDashboard, invalidateDashboard,
  cacheRiskZones, getRiskZones,
  // Rate limit
  checkRateLimit,
  // Queues
  enqueueClaim, dequeueClaim,
  enqueuePayout, dequeuePayout,
};
