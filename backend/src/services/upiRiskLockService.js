const { query } = require('../config/db');

const UPI_REGEX = /^[\w.\-]+@[\w]+$/;
const DEFAULT_LOCK_HOURS = Number(process.env.UPI_RISK_LOCK_HOURS || 24);

function validateUpiId(upiId) {
  if (!UPI_REGEX.test(String(upiId || '').trim())) {
    const err = new Error('UPI ID format is invalid. Expected format: name@bankname');
    err.statusCode = 400;
    throw err;
  }
}

function buildLockState(row = {}) {
  const lastChangedAt = row.last_upi_change_at ? new Date(row.last_upi_change_at) : null;
  const lastLockEventAt = row.last_lock_event_at ? new Date(row.last_lock_event_at) : null;
  const lockUntil = lastLockEventAt
    ? new Date(lastLockEventAt.getTime() + DEFAULT_LOCK_HOURS * 60 * 60 * 1000)
    : null;
  const isLocked = Boolean(lockUntil && lockUntil.getTime() > Date.now());

  return {
    isLocked,
    lockedUntil: lockUntil ? lockUntil.toISOString() : null,
    riskScore: Number(row.upi_risk_score || 0),
    reason: row.upi_risk_reason || null,
    previousUpiId: row.previous_upi_id || null,
    lastChangedAt: lastChangedAt ? lastChangedAt.toISOString() : null,
  };
}

async function evaluateUpiChangeRisk(workerId, nextUpiId) {
  validateUpiId(nextUpiId);

  const { rows } = await query(
    `SELECT
       w.upi_id,
       (
         SELECT old_value
         FROM audit_logs
         WHERE user_id = w.id
           AND user_type = 'worker'
           AND action = 'profile_upi_change'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS previous_upi_id,
       (
         SELECT created_at
         FROM audit_logs
         WHERE user_id = w.id
           AND user_type = 'worker'
           AND action = 'profile_upi_change'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS last_upi_change_at,
       COUNT(DISTINCT c.id) FILTER (
         WHERE c.status = 'approved'
           AND c.updated_at >= NOW() - INTERVAL '48 hours'
       ) AS recent_approved_claims,
       COUNT(DISTINCT p.id) FILTER (
         WHERE p.status IN ('pending', 'processing')
           AND p.initiated_at >= NOW() - INTERVAL '48 hours'
       ) AS recent_open_payouts
     FROM workers w
     LEFT JOIN claims c ON c.worker_id = w.id
     LEFT JOIN payouts p ON p.worker_id = w.id
     WHERE w.id = $1
     GROUP BY w.id, w.upi_id`,
    [workerId]
  );

  if (!rows.length) {
    const err = new Error('Worker not found.');
    err.statusCode = 404;
    throw err;
  }

  const row = rows[0];
  const normalizedNextUpi = String(nextUpiId).trim();
  const currentUpiId = String(row.upi_id || '').trim();
  const isChanged = Boolean(currentUpiId) && currentUpiId !== normalizedNextUpi;

  if (!isChanged) {
    return {
      shouldLock: false,
      lockUntil: null,
      riskScore: 0,
      reason: 'UPI unchanged or first-time setup',
      previousUpiId: row.previous_upi_id || currentUpiId || null,
      currentUpiId,
      nextUpiId: normalizedNextUpi,
    };
  }

  const recentClaims = Number(row.recent_approved_claims || 0);
  const recentPayouts = Number(row.recent_open_payouts || 0);
  const hoursSinceLastChange = row.last_upi_change_at
    ? (Date.now() - new Date(row.last_upi_change_at).getTime()) / 36e5
    : 999;

  let riskScore = 0.35;
  const reasons = ['UPI destination changed'];

  if (recentClaims > 0) {
    riskScore += 0.30;
    reasons.push(`${recentClaims} approved claim(s) in the last 48h`);
  }

  if (recentPayouts > 0) {
    riskScore += 0.25;
    reasons.push(`${recentPayouts} payout(s) already in flight`);
  }

  if (hoursSinceLastChange < 72) {
    riskScore += 0.20;
    reasons.push('another UPI change happened within 72h');
  }

  riskScore = Math.min(Number(riskScore.toFixed(2)), 0.99);
  const shouldLock = riskScore >= 0.55;
  const lockUntil = shouldLock
    ? new Date(Date.now() + DEFAULT_LOCK_HOURS * 60 * 60 * 1000)
    : null;

  return {
    shouldLock,
    lockUntil,
    riskScore,
    reason: reasons.join('; '),
    previousUpiId: currentUpiId || row.previous_upi_id || null,
    currentUpiId,
    nextUpiId: normalizedNextUpi,
  };
}

async function getUpiLockState(workerId) {
  const { rows } = await query(
    `SELECT
       (
         SELECT old_value
         FROM audit_logs
         WHERE user_id = $1
           AND user_type = 'worker'
           AND action = 'profile_upi_change'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS previous_upi_id,
       (
         SELECT created_at
         FROM audit_logs
         WHERE user_id = $1
           AND user_type = 'worker'
           AND action = 'profile_upi_change'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS last_upi_change_at,
       (
         SELECT new_value
         FROM audit_logs
         WHERE user_id = $1
           AND user_type = 'worker'
           AND action = 'profile_upi_risk_lock'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS upi_risk_reason,
       (
         SELECT COALESCE(NULLIF(old_value, '')::NUMERIC, 0)
         FROM audit_logs
         WHERE user_id = $1
           AND user_type = 'worker'
           AND action = 'profile_upi_risk_lock'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS upi_risk_score,
       (
         SELECT created_at
         FROM audit_logs
         WHERE user_id = $1
           AND user_type = 'worker'
           AND action = 'profile_upi_risk_lock'
         ORDER BY created_at DESC
         LIMIT 1
       ) AS last_lock_event_at`,
    [workerId]
  );

  if (!rows.length) {
    const err = new Error('Worker not found.');
    err.statusCode = 404;
    throw err;
  }

  return buildLockState(rows[0]);
}

async function assertUpiNotLocked(workerId) {
  const lockState = await getUpiLockState(workerId);

  if (lockState.isLocked) {
    const err = new Error(
      `Payouts are temporarily locked until ${lockState.lockedUntil} because your payout UPI was changed recently.`
    );
    err.statusCode = 423;
    err.code = 'UPI_RISK_LOCKED';
    err.lockState = lockState;
    throw err;
  }

  return lockState;
}

module.exports = {
  validateUpiId,
  evaluateUpiChangeRisk,
  getUpiLockState,
  assertUpiNotLocked,
};
