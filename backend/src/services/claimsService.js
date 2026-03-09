const mlClient = require('../config/mlClient');
const { query } = require('../config/db');
const { enqueueClaim, enqueuePayout, invalidateDashboard } = require('../config/redis');
const { PAYOUT_RATIOS } = require('./policyService');

// ML decision thresholds
const AUTO_APPROVE_THRESHOLD = 0.30;
const AUTO_REJECT_THRESHOLD  = 0.60;

// Valid claim types per actual schema CHECK constraint
const VALID_CLAIM_TYPES = ['Heavy Rain', 'Poor AQI', 'Heatwave', 'Platform Outage'];

/**
 * Auto-initiate a claim for a worker + policy.
 * Called by trigger engine or manually from the API.
 */
async function initiateClaimAuto({ workerId, policyId, eventId, type, description, gpsMatch }) {
  // Validate active policy
  const { rows: policies } = await query(
    `SELECT p.*, pl.max_coverage, pl.coverage_config
     FROM policies p
     JOIN plans pl ON pl.id = p.plan_id
     WHERE p.id = $1 AND p.worker_id = $2 AND p.status = 'active'`,
    [policyId, workerId]
  );
  if (!policies.length) {
    const err = new Error('No active policy found for this worker.'); err.statusCode = 404; throw err;
  }
  const policy = policies[0];

  // Normalise type to match schema CHECK constraint
  const claimType = normaliseClaimType(type);

  // Fraud check payload
  const velocityResult = await query(
    `SELECT COUNT(*) AS cnt FROM claims
     WHERE worker_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
    [workerId]
  );
  const velocity7d = parseInt(velocityResult.rows[0].cnt, 10);

  let fraudScore = 0.25;
  let decision   = 'auto_approve';
  let mlReason   = 'Fallback: ML service unavailable';

  try {
    const mlPayload = {
      claim_id:                       `CLM-${Date.now()}`,
      worker_id:                      `W_${workerId}`,
      gps_zone_match:                 gpsMatch !== false,
      claim_velocity_7d:              velocity7d,
      historical_zone_presence:       0.8,
      time_since_event_seconds:       300,
      platform_activity_during_event: 0.7,
    };

    const { data: ml } = await mlClient.post('/ml/fraud-score', mlPayload);
    fraudScore = ml.fraud_score ?? 0.25;
    decision   = ml.decision    || resolveDecision(fraudScore);
    mlReason   = ml.reason      || '';
  } catch (mlErr) {
    console.warn('[Claims] ML fraud-score unavailable, using fallback:', mlErr.message);
    fraudScore = velocity7d > 3 ? 0.65 : 0.20;
    decision   = resolveDecision(fraudScore);
    mlReason   = 'ML unavailable — velocity-based fallback';
  }

  const status = mapDecisionToStatus(decision);
  const amount = calculatePayout(parseFloat(policy.max_coverage), claimType);

  // Generate claim number
  const claimNumber = `CLM-${String(Date.now()).slice(-6)}`;

  const { rows } = await query(
    `INSERT INTO claims
       (claim_number, worker_id, policy_id, event_id, type,
        amount, status, fraud_score, gps_match, rejection_reason,
        processed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      claimNumber,
      workerId,
      policyId,
      eventId || null,
      claimType,
      amount,
      status,
      fraudScore,
      gpsMatch !== false,
      status === 'rejected' ? (mlReason || 'Auto-rejected by fraud engine') : null,
      status !== 'pending' ? new Date() : null,
    ]
  );

  const claim = rows[0];

  // Queue actions based on decision
  if (status === 'pending') {
    await enqueueClaim(claim.id);        // → fraud review queue
  } else if (status === 'approved') {
    await triggerPayoutQueue(claim);     // → payout queue immediately
  }

  await invalidateDashboard();
  return { ...claim, ml_decision: decision, ml_reason: mlReason };
}

/**
 * Get all claims for a worker with event and plan details.
 */
async function getClaimsByWorker(workerId) {
  const { rows } = await query(
    `SELECT c.*,
            pl.name AS plan_name,
            de.type AS event_type, de.severity AS event_severity,
            de.zone_id AS event_zone_id
     FROM claims c
     JOIN policies p  ON p.id  = c.policy_id
     JOIN plans   pl  ON pl.id = p.plan_id
     LEFT JOIN disruption_events de ON de.id = c.event_id
     WHERE c.worker_id = $1
     ORDER BY c.created_at DESC`,
    [workerId]
  );
  return rows;
}

async function getClaimStatus(claimId, workerId = null) {
  let sql    = `SELECT c.*, de.type AS event_type, de.severity AS event_severity
                FROM claims c
                LEFT JOIN disruption_events de ON de.id = c.event_id
                WHERE c.id = $1`;
  const params = [claimId];
  if (workerId) { sql += ' AND c.worker_id = $2'; params.push(workerId); }
  const { rows } = await query(sql, params);
  if (!rows.length) {
    const err = new Error('Claim not found.'); err.statusCode = 404; throw err;
  }
  return rows[0];
}

async function approveClaim(claimId, adminId) {
  const { rows } = await query(
    `UPDATE claims
     SET status = 'approved', processed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [claimId]
  );
  if (!rows.length) {
    const err = new Error('Claim not found or already processed.'); err.statusCode = 400; throw err;
  }
  const claim = rows[0];
  await triggerPayoutQueue(claim);
  await invalidateDashboard();

  if (adminId) {
    await query(
      `INSERT INTO audit_logs (user_id, user_type, action, field, new_value, created_at)
       VALUES ($1, 'admin', 'approve_claim', 'status', 'approved', NOW())`,
      [adminId]
    );
  }
  return claim;
}

async function rejectClaim(claimId, reason, adminId) {
  const { rows } = await query(
    `UPDATE claims
     SET status = 'rejected', rejection_reason = $2,
         processed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [claimId, reason || 'Rejected after review']
  );
  if (!rows.length) {
    const err = new Error('Claim not found or already processed.'); err.statusCode = 400; throw err;
  }
  await invalidateDashboard();

  if (adminId) {
    await query(
      `INSERT INTO audit_logs (user_id, user_type, action, field, new_value, created_at)
       VALUES ($1, 'admin', 'reject_claim', 'status', 'rejected', NOW())`,
      [adminId]
    );
  }
  return rows[0];
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function resolveDecision(score) {
  if (score < AUTO_APPROVE_THRESHOLD) return 'auto_approve';
  if (score > AUTO_REJECT_THRESHOLD)  return 'auto_reject';
  return 'manual_review';
}

function mapDecisionToStatus(decision) {
  return {
    auto_approve:  'approved',
    auto_reject:   'rejected',
    manual_review: 'pending',
  }[decision] ?? 'pending';
}

function normaliseClaimType(type) {
  // Map incoming trigger types to schema-valid values
  const map = {
    weather:          'Heavy Rain',
    heavy_rain:       'Heavy Rain',
    flood:            'Heavy Rain',
    aqi:              'Poor AQI',
    high_aqi:         'Poor AQI',
    'Poor AQI':       'Poor AQI',
    heatwave:         'Heatwave',
    extreme_heat:     'Heatwave',
    Heatwave:         'Heatwave',
    strike:           'Platform Outage',
    curfew:           'Platform Outage',
    traffic:          'Platform Outage',
    disruption:       'Platform Outage',
    'Platform Outage':'Platform Outage',
    'Heavy Rain':     'Heavy Rain',
  };
  return map[type] || 'Platform Outage';
}

function calculatePayout(maxCoverage, claimType) {
  const ratio = PAYOUT_RATIOS[claimType] || 0.35;
  return Math.round(maxCoverage * ratio * 100) / 100;
}

/**
 * Insert a payout record and push to payout queue.
 */
async function triggerPayoutQueue(claim) {
  try {
    const workerResult = await query('SELECT upi FROM workers WHERE id = $1', [claim.worker_id]);
    const upi = workerResult.rows[0]?.upi;

    if (!upi) {
      console.warn(`[Claims] Worker ${claim.worker_id} has no UPI — skipping payout`);
      return;
    }

    // Check for existing non-failed payout
    const { rows: existing } = await query(
      `SELECT id FROM payouts WHERE claim_id = $1 AND status NOT IN ('failed')`,
      [claim.id]
    );
    if (existing.length) {
      await enqueuePayout(existing[0].id);
      return;
    }

    const payoutNumber = `PAY-${String(Date.now()).slice(-6)}`;

    const { rows } = await query(
      `INSERT INTO payouts
         (payout_number, claim_id, worker_id, amount, status, upi, initiated_at)
       VALUES ($1, $2, $3, $4, 'processing', $5, NOW())
       RETURNING id`,
      [payoutNumber, claim.id, claim.worker_id, claim.amount, upi]
    );
    if (rows.length) {
      await enqueuePayout(rows[0].id);
    }
  } catch (e) {
    console.warn('[Claims] triggerPayoutQueue error:', e.message);
  }
}

module.exports = {
  initiateClaimAuto, getClaimsByWorker, getClaimStatus,
  approveClaim, rejectClaim,
  normaliseClaimType, calculatePayout,
};
