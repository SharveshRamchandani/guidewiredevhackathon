/**
 * profileController.js
 *
 * Handles worker profile update actions and emits RBA notification events
 * for Scenario 3: Profile & Account Events.
 *
 * All routes here require requireWorkerAuth middleware which sets req.user = { id, role }.
 */

const { query }  = require('../config/db');
const eventBus   = require('../events/eventBus');

// ─── Update General Profile ───────────────────────────────────────────────────

/**
 * PATCH /api/profile
 * Update worker name, platform, city, etc.
 * Emits: profile:updated
 */
async function updateProfile(req, res, next) {
  try {
    const workerId = req.user.id;
    const { name, platform, city, avg_weekly_earning } = req.body;

    // Build dynamic SET clause (only update provided fields)
    const fields  = [];
    const values  = [];

    if (name !== undefined)               { values.push(name);              fields.push(`name = $${values.length}`); }
    if (platform !== undefined)           { values.push(platform);          fields.push(`platform = $${values.length}`); }
    if (city !== undefined)               { values.push(city);              fields.push(`city = $${values.length}`); }
    if (avg_weekly_earning !== undefined) { values.push(avg_weekly_earning); fields.push(`avg_weekly_earning = $${values.length}`); }

    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided.' });
    }

    values.push(workerId);
    const { rows } = await query(
      `UPDATE workers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, platform, city, avg_weekly_earning`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    // ── RBA: general profile updated ─────────────────────────────────────────
    eventBus.emit('profile:updated', { workerId: String(workerId) });

    return res.json({ success: true, message: 'Your profile details have been updated.', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─── Update Bank / UPI ────────────────────────────────────────────────────────

/**
 * PATCH /api/profile/bank
 * Update worker UPI id (payout account).
 * Emits: profile:bank_updated
 */
async function updateBankDetails(req, res, next) {
  try {
    const workerId = req.user.id;
    const { upi }  = req.body;

    if (!upi) {
      return res.status(400).json({ success: false, error: 'UPI id is required.' });
    }

    const { rows } = await query(
      `UPDATE workers SET upi = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, upi`,
      [upi, workerId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    // ── RBA: payout account changed ─────────────────────────────────────────
    eventBus.emit('profile:bank_updated', { workerId: String(workerId) });

    return res.json({ success: true, message: 'Your payout bank account has been updated.', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─── Update Contact (email / phone) ──────────────────────────────────────────

/**
 * PATCH /api/profile/contact
 * Update worker phone or email.
 * Emits: profile:contact_updated
 */
async function updateContactDetails(req, res, next) {
  try {
    const workerId = req.user.id;
    const { phone, email } = req.body;

    const fields = [];
    const values = [];

    if (phone !== undefined) { values.push(phone); fields.push(`phone = $${values.length}`); }
    if (email !== undefined) { values.push(email); fields.push(`email = $${values.length}`); }

    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'phone or email is required.' });
    }

    values.push(workerId);
    const { rows } = await query(
      `UPDATE workers SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, phone, email`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    // ── RBA: contact details changed ────────────────────────────────────────
    eventBus.emit('profile:contact_updated', { workerId: String(workerId) });

    return res.json({ success: true, message: 'Your email or phone number has been updated.', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─── Get My Profile ───────────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Return the authenticated worker's profile.
 */
async function getProfile(req, res, next) {
  try {
    const workerId = req.worker.id;
    const { rows } = await query(
      `SELECT w.id, w.name, w.phone, w.email, w.platform, w.city,
              w.upi, w.avg_weekly_earning, w.is_kyc_verified,
              w.risk_level, w.risk_score, w.active, w.created_at,
              z.name AS zone_name
       FROM workers w
       LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.id = $1`,
      [workerId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, updateBankDetails, updateContactDetails };
