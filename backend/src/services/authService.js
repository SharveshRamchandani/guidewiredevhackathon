const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');
const {
  setSession, deleteSession,
  blacklistToken, invalidateDashboard,
} = require('../config/redis');

const SALT_ROUNDS = 10;

// ─── Worker Auth ──────────────────────────────────────────────────────────────

<<<<<<< HEAD
async function registerWorker({ name, phone, password, platform, zone_id, city, upi }) {
=======
async function registerWorker({ name, phone, password, platform, zone_id, city, upi_id }) {
>>>>>>> 25b0092092438c7af22032d74b04b42d2eb133dd
  // phone is the unique identifier for workers
  const existing = await query('SELECT id FROM workers WHERE phone = $1', [phone]);
  if (existing.rows.length) {
    const err = new Error('Phone number already registered.'); err.statusCode = 409; throw err;
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await query(
    `INSERT INTO workers
<<<<<<< HEAD
       (name, phone, password_hash, platform, zone_id, city, upi,
        kyc_status, risk_level, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'low', NOW(), NOW())
     RETURNING id, name, phone, platform, zone_id, city, upi, kyc_status, risk_level, created_at`,
    [name, phone, password_hash, platform, zone_id || null, city || null, upi || null]
=======
       (name, phone, platform, zone_id, city, upi_id,
        is_kyc_verified, risk_level, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, 'low', NOW(), NOW())
     RETURNING id, name, phone, platform, zone_id, city, upi_id, is_kyc_verified, risk_level, created_at`,
    [name, phone, platform, zone_id || null, city || null, upi_id || null]
>>>>>>> 25b0092092438c7af22032d74b04b42d2eb133dd
  );

  const worker = rows[0];
  const token  = generateToken(worker, 'worker');
  await setSession(worker.id, worker, 'worker');
  await invalidateDashboard();

  return { worker, token };
}

async function loginWorker({ phone, password }) {
  const { rows } = await query(
<<<<<<< HEAD
    `SELECT id, name, phone, password_hash, platform, zone_id, city, upi, kyc_status, risk_level
=======
    `SELECT id, name, phone, platform, zone_id, city, upi_id, is_kyc_verified, risk_level
>>>>>>> 25b0092092438c7af22032d74b04b42d2eb133dd
     FROM workers WHERE phone = $1`,
    [phone]
  );

  if (!rows.length) {
    const err = new Error('Invalid phone or password.'); err.statusCode = 401; throw err;
  }

  const worker = rows[0];
  const valid  = await bcrypt.compare(password, worker.password_hash);
  if (!valid) {
    const err = new Error('Invalid phone or password.'); err.statusCode = 401; throw err;
  }

  const { password_hash, ...safe } = worker;
  const token = generateToken(safe, 'worker');
  await setSession(safe.id, safe, 'worker');

  return { worker: safe, token };
}

async function getWorkerProfile(workerId) {
  const { rows } = await query(
    `SELECT w.id, w.name, w.phone, w.platform, w.zone_id, w.city,
<<<<<<< HEAD
            w.upi, w.kyc_status, w.risk_level, w.active,
            w.avg_weekly_earning, w.created_at,
            z.name AS zone_name
=======
            w.upi_id, w.is_kyc_verified, w.risk_level, w.active,
            w.avg_weekly_earning, w.notification_prefs, w.created_at,
            z.name AS zone_name, w.city AS city_name
>>>>>>> 25b0092092438c7af22032d74b04b42d2eb133dd
     FROM workers w
     LEFT JOIN zones  z ON z.id = w.zone_id
     WHERE w.id = $1`,
    [workerId]
  );
  if (!rows.length) {
    const err = new Error('Worker not found.'); err.statusCode = 404; throw err;
  }
  return rows[0];
}

async function logoutWorker(token, workerId) {
  const decoded = jwt.decode(token);
  const ttl     = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
  await Promise.all([
    blacklistToken(token, Math.max(ttl, 1)),
    deleteSession(workerId, 'worker'),
  ]);
}

// ─── Admin Auth ───────────────────────────────────────────────────────────────

async function loginAdmin({ email, password }) {
  const { rows } = await query(
    'SELECT id, name, email, password_hash, role FROM admins WHERE email = $1',
    [email]
  );

  if (!rows.length) {
    const err = new Error('Invalid credentials.'); err.statusCode = 401; throw err;
  }

  const admin = rows[0];
  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    const err = new Error('Invalid credentials.'); err.statusCode = 401; throw err;
  }

  const { password_hash, ...safe } = admin;
  const token = generateToken({ ...safe, role: 'admin' }, 'admin');
  await setSession(safe.id, safe, 'admin');

  return { admin: safe, token };
}

async function logoutAdmin(token, adminId) {
  const decoded = jwt.decode(token);
  const ttl     = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
  await Promise.all([
    blacklistToken(token, Math.max(ttl, 1)),
    deleteSession(adminId, 'admin'),
  ]);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateToken(payload, role) {
  return jwt.sign(
    { id: payload.id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = {
  registerWorker, loginWorker, getWorkerProfile, logoutWorker,
  loginAdmin, logoutAdmin,
};
