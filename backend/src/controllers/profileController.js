/**
 * Handles worker profile updates and profile/account notifications.
 * All routes here require `requireWorkerAuth`, which sets `req.worker`.
 */

const { query } = require('../config/db');
const eventBus = require('../events/eventBus');
const {
  evaluateUpiChangeRisk,
  getUpiLockState,
} = require('../services/upiRiskLockService');

async function updateProfile(req, res, next) {
  try {
    const workerId = req.worker.id;
    const { name, platform, city, avg_weekly_earning } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) {
      values.push(name);
      fields.push(`name = $${values.length}`);
    }
    if (platform !== undefined) {
      values.push(platform);
      fields.push(`platform = $${values.length}`);
    }
    if (city !== undefined) {
      values.push(city);
      fields.push(`city = $${values.length}`);
    }
    if (avg_weekly_earning !== undefined) {
      values.push(avg_weekly_earning);
      fields.push(`avg_weekly_earning = $${values.length}`);
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided.' });
    }

    values.push(workerId);
    const { rows } = await query(
      `UPDATE workers
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, platform, city, avg_weekly_earning`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    eventBus.emit('profile:updated', { workerId: String(workerId) });

    return res.json({
      success: true,
      message: 'Your profile details have been updated.',
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function updateBankDetails(req, res, next) {
  try {
    const workerId = req.worker.id;
    const { upi } = req.body;

    if (!upi) {
      return res.status(400).json({ success: false, error: 'UPI id is required.' });
    }

    const riskDecision = await evaluateUpiChangeRisk(workerId, upi);

    const { rows } = await query(
      `UPDATE workers
       SET upi_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, upi_id`,
      [upi, workerId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    if (riskDecision.currentUpiId && riskDecision.currentUpiId !== riskDecision.nextUpiId) {
      await query(
        `INSERT INTO audit_logs
           (user_id, user_type, action, field, old_value, new_value, created_at)
         VALUES ($1, 'worker', 'profile_upi_change', 'upi_id', $2, $3, NOW())`,
        [workerId, riskDecision.currentUpiId, riskDecision.nextUpiId]
      );
    }

    if (riskDecision.shouldLock) {
      await query(
        `INSERT INTO audit_logs
           (user_id, user_type, action, field, old_value, new_value, created_at)
         VALUES ($1, 'worker', 'profile_upi_risk_lock', 'upi_lock', $2, $3, NOW())`,
        [
          workerId,
          String(riskDecision.riskScore),
          `${riskDecision.reason}. Payout lock active until ${riskDecision.lockUntil.toISOString()}`,
        ]
      );
    }

    eventBus.emit('profile:bank_updated', {
      workerId: String(workerId),
      riskLocked: riskDecision.shouldLock,
      lockedUntil: riskDecision.lockUntil ? riskDecision.lockUntil.toISOString() : null,
    });

    return res.json({
      success: true,
      message: riskDecision.shouldLock
        ? 'UPI updated, but payouts are temporarily locked for security review.'
        : 'Your payout bank account has been updated.',
      data: {
        ...rows[0],
        upi_lock: {
          isLocked: riskDecision.shouldLock,
          lockedUntil: riskDecision.lockUntil ? riskDecision.lockUntil.toISOString() : null,
          riskScore: riskDecision.riskScore,
          reason: riskDecision.reason,
          previousUpiId: riskDecision.previousUpiId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateContactDetails(req, res, next) {
  try {
    const workerId = req.worker.id;
    const { phone } = req.body;

    const fields = [];
    const values = [];

    if (phone !== undefined) {
      values.push(phone);
      fields.push(`phone = $${values.length}`);
    }

    if (!fields.length) {
      return res.status(400).json({ success: false, error: 'phone is required.' });
    }

    values.push(workerId);
    const { rows } = await query(
      `UPDATE workers
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, phone`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    eventBus.emit('profile:contact_updated', { workerId: String(workerId) });

    return res.json({
      success: true,
      message: 'Your phone number has been updated.',
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const workerId = req.worker.id;
    const { rows } = await query(
      `SELECT w.id, w.name, w.phone, w.platform, w.city,
              w.upi_id, w.avg_weekly_earning, w.is_kyc_verified,
              w.risk_level, w.active, w.created_at, w.plan_id,
              z.name AS zone_name
       FROM workers w
       LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.id = $1`,
      [workerId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Worker not found.' });
    }

    const upiLock = await getUpiLockState(workerId);

    return res.json({
      success: true,
      data: {
        ...rows[0],
        upi_lock: upiLock,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateBankDetails,
  updateContactDetails,
};
