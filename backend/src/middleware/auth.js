const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { isTokenBlacklisted, getSession, setSession } = require('../config/redis');

/**
 * Worker JWT middleware.
 * 1. Extracts Bearer token
 * 2. Checks Redis blacklist (logout revocation)
 * 3. Verifies signature + expiry
 * 4. Tries Redis session first (fast path), falls back to DB
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token revoked. Please log in again.' });
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
      return res.status(401).json({ success: false, message: msg });
    }

    // Try Redis session (fast path)
    let worker = await getSession(decoded.id, 'worker');

    if (!worker) {
      // Fall back to DB
      const { rows } = await query(
        `SELECT id, name, phone, platform, zone_id, city_id, upi, kyc_status, risk_level
         FROM workers WHERE id = $1`,
        [decoded.id]
      );
      if (!rows.length) {
        return res.status(401).json({ success: false, message: 'Worker not found.' });
      }
      worker = rows[0];
      // Re-populate Redis session
      await setSession(worker.id, worker, 'worker');
    }

    req.user  = worker;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Admin JWT middleware — same flow but uses admin table + session:admin:{id} key.
 */
async function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied.' });
    }

    const token = authHeader.split(' ')[1];

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token revoked.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    let admin = await getSession(decoded.id, 'admin');

    if (!admin) {
      const { rows } = await query(
        'SELECT id, name, email, role FROM admins WHERE id = $1',
        [decoded.id]
      );
      if (!rows.length) {
        return res.status(401).json({ success: false, message: 'Admin not found.' });
      }
      admin = rows[0];
      await setSession(admin.id, admin, 'admin');
    }

    req.user  = admin;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, authenticateAdmin };
