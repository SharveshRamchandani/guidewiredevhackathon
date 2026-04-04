const { query }               = require('../config/db');
const { dequeuePayout, invalidateDashboard } = require('../config/redis');
const { v4: uuidv4 }          = require('uuid');
const eventBus                = require('../events/eventBus'); // RBA event bus
const { assertUpiNotLocked }  = require('./upiRiskLockService');

// ─── Simulated Razorpay ───────────────────────────────────────────────────────

function simulateRazorpay(amount, upi) {
  return {
    id:         `pay_${uuidv4().replace(/-/g, '').slice(0, 14)}`,
    entity:     'payout',
    amount:     Math.round(amount * 100), // paise
    currency:   'INR',
    status:     'processing',
    mode:       'UPI',
    purpose:    'insurance_claim',
    fund_account: { vpa: upi || 'worker@upi' },
    created_at: Math.floor(Date.now() / 1000),
  };
}

// ─── Initiate ─────────────────────────────────────────────────────────────────

async function initiatePayout({ claimId, workerId }) {
  await assertUpiNotLocked(workerId);

  // Verify approved claim
  const { rows: claims } = await query(
    `SELECT c.*, w.upi_id
     FROM claims c
     JOIN workers w ON w.id = c.worker_id
     WHERE c.id = $1 AND c.worker_id = $2 AND c.status = 'approved'`,
    [claimId, workerId]
  );
  if (!claims.length) {
    const err = new Error('No approved claim found for this worker.'); err.statusCode = 404; throw err;
  }
  const claim = claims[0];

  if (!claim.upi_id) {
    const err = new Error('Worker has no UPI registered. Please update your profile.'); err.statusCode = 400; throw err;
  }

  // Prevent duplicate payouts
  const { rows: existing } = await query(
    `SELECT id FROM payouts WHERE claim_id = $1 AND status NOT IN ('failed')`,
    [claimId]
  );
  if (existing.length) {
    const err = new Error('Payout already initiated for this claim.'); err.statusCode = 409; throw err;
  }

  const rz = simulateRazorpay(claim.amount, claim.upi_id);
  const payoutNumber = `PAY-${String(Date.now()).slice(-6)}`;

  const { rows } = await query(
    `INSERT INTO payouts
       (payout_number, claim_id, worker_id, amount, status, upi_id, initiated_at)
     VALUES ($1, $2, $3, $4, 'processing', $5, NOW())
     RETURNING *`,
    [payoutNumber, claimId, workerId, claim.amount, claim.upi_id]
  );

  const payout = rows[0];

  // Simulate gateway completing after 5 seconds
  setTimeout(() => markPaid(payout.id, rz.id), 5000);

  await invalidateDashboard();
  return { ...payout, gateway_ref: rz.id };
}

async function markPaid(payoutId, gatewayRef) {
  try {
    const { rows } = await query(
      `UPDATE payouts
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1
       RETURNING claim_id, worker_id, amount`,
      [payoutId]
    );
    if (rows.length) {
      const { claim_id, worker_id, amount } = rows[0];
      // Mark the claim as approved (schema only has pending/approved/rejected)
      await query(
        `UPDATE claims SET updated_at = NOW() WHERE id = $1`,
        [claim_id]
      );

      // ── RBA: notify worker that payout was credited ─────────────────────
      eventBus.emit('payout:completed', {
        workerId: worker_id,
        amount:   parseFloat(amount).toFixed(2),
        claimId:  claim_id,
      });
    }
    console.log(`[Payout] ✅ ${gatewayRef || payoutId} completed`);
    await invalidateDashboard();
  } catch (e) {
    console.error('[Payout] markPaid error:', e.message);
  }
}

// ─── Process queue ────────────────────────────────────────────────────────────

/**
 * Called by the payout processor cron every 30s.
 * Pops from queue:payouts, simulates Razorpay, completes after 5s.
 */
async function processPayoutQueue() {
  const payoutId = await dequeuePayout();
  if (!payoutId) return null;

  const { rows } = await query('SELECT * FROM payouts WHERE id = $1', [payoutId]);
  if (!rows.length) return null;

  const payout = rows[0];

  // Skip if already completed
  if (payout.status === 'completed') return payout;

  const rz = simulateRazorpay(parseFloat(payout.amount), payout.upi_id);

  // Mark processing (it's already in processing state, but log the gateway ref)
  console.log(`[Payout] Processing payout ${payoutId} via simulated gateway ${rz.id}`);

  setTimeout(() => markPaid(payoutId, rz.id), 5000);
  return payout;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

async function getPayoutsByWorker(workerId) {
  const { rows } = await query(
    `SELECT p.*, c.type AS claim_type, c.amount AS claim_amount
     FROM payouts p
     JOIN claims c ON c.id = p.claim_id
     WHERE p.worker_id = $1
     ORDER BY p.initiated_at DESC`,
    [workerId]
  );
  return rows;
}

async function getPayoutStatus(payoutId, workerId = null) {
  let sql    = 'SELECT * FROM payouts WHERE id = $1';
  const params = [payoutId];
  if (workerId) { sql += ' AND worker_id = $2'; params.push(workerId); }
  const { rows } = await query(sql, params);
  if (!rows.length) {
    const err = new Error('Payout not found.'); err.statusCode = 404; throw err;
  }
  return rows[0];
}

module.exports = { initiatePayout, processPayoutQueue, getPayoutsByWorker, getPayoutStatus };
