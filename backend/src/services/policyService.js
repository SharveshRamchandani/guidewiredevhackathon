// ============================================================
// GigShield — Policy Service
// Handles: quote, create, get, renew, cancel
// ============================================================

const { query } = require('../config/db');
const axios = require('axios');

const ML_BASE_URL = process.env.ML_BASE_URL || 'http://localhost:8000';

// ─────────────────────────────────────────
// PRICING ENGINE
// ─────────────────────────────────────────

/**
 * Calculate final premium for a worker + plan combination
 * Formula: (basePremium + zoneAdjustment - loyaltyDiscount) × riskMultiplier
 * Hard cap: never exceed 5% of worker's weekly income
 */
function calculatePremium({ basePremium, zoneNumber, claimFreeWeeks, weeklyIncome, riskMultiplier = 1.0 }) {

  // Zone adjustment (based on Excel model)
  const zoneAdjustments = { 1: 0, 2: 0.20, 3: 0.50, 4: 0.85 };
  const zoneAdj = basePremium * (zoneAdjustments[zoneNumber] || 0);

  // Loyalty discount
  let loyaltyDiscount = 0;
  if (claimFreeWeeks >= 24) loyaltyDiscount = 20;
  else if (claimFreeWeeks >= 12) loyaltyDiscount = 15;
  else if (claimFreeWeeks >= 4) loyaltyDiscount = 10;

  // Risk-adjusted premium
  let finalPremium = (basePremium + zoneAdj - loyaltyDiscount) * riskMultiplier;

  // Floor: never below 60% of base
  finalPremium = Math.max(finalPremium, basePremium * 0.6);

  // Affordability cap: max 5% of weekly income
  if (weeklyIncome > 0) {
    const affordabilityCap = weeklyIncome * 0.05;
    finalPremium = Math.min(finalPremium, affordabilityCap);
  }

  return {
    basePremium,
    zoneAdjustment: Math.round(zoneAdj * 100) / 100,
    loyaltyDiscount,
    riskMultiplier,
    finalPremium: Math.round(finalPremium * 100) / 100,
    affordabilityPct: weeklyIncome > 0
      ? Math.round((finalPremium / weeklyIncome) * 10000) / 100
      : null
  };
}

/**
 * Get co-payment % for a plan
 */
function getCoPay(planName) {
  const coPays = { nano: 0.25, basic: 0.20, standard: 0.10, premium: 0 };
  return coPays[planName] ?? 0.20;
}

// ─────────────────────────────────────────
// ML RISK SCORE
// ─────────────────────────────────────────

/**
 * Call ML service for risk score
 * Falls back to neutral multiplier (1.0) if ML is down
 */
async function getRiskMultiplier(worker) {
  try {
    const { data } = await axios.post(`${ML_BASE_URL}/ml/risk-score`, {
      worker_id: worker.id,
      platform: worker.platform,
      zone_id: worker.zone_id,
      avg_weekly_earning: worker.avg_weekly_earning,
      risk_score: worker.risk_score
    }, { timeout: 3000 });

    // ML returns risk_score 0-1 → convert to multiplier 0.80–1.60
    const multiplier = 0.80 + (data.risk_score * 0.80);
    return Math.round(multiplier * 100) / 100;

  } catch (err) {
    console.warn('[PolicyService] ML service unavailable, using default multiplier');
    return 1.0;
  }
}

// ─────────────────────────────────────────
// SERVICE METHODS
// ─────────────────────────────────────────

/**
 * LIST PLANS
 * Returns all active plans with coverage details
 */
async function listPlans() {
  const { rows } = await query(`
    SELECT id, name,
           base_premium,
           max_payout,
           COALESCE(coverage_days, 7) AS coverage_days,
           coverage_config,
           COALESCE(is_active, true) AS is_active
    FROM plans
    WHERE COALESCE(is_active, true) = true
    ORDER BY base_premium ASC
  `);
  return rows;
}

/**
 * GENERATE QUOTE
 * Calculates personalised premium for a worker + plan
 */
async function generateQuote(workerId, planId) {

  // 1. Fetch worker - use COALESCE for optional columns
  const workerRes = await query(`
    SELECT w.*, 
           COALESCE(z.zone_number, 1) AS zone_number, 
           z.risk_factor
    FROM workers w
    LEFT JOIN zones z ON z.id = w.zone_id
    WHERE w.id = $1
  `, [workerId]);

  if (!workerRes.rows.length) {
    throw { status: 404, message: 'Worker not found' };
  }
  const worker = workerRes.rows[0];

  // Validate plan exists
  const planRes = await query(
    'SELECT id, name, base_premium, max_payout, coverage_days, coverage_config FROM plans WHERE id = $1 AND is_active = true',
    [planId]
  );
  if (!planRes.rows.length) {
    const err = new Error('Plan not found.'); err.statusCode = 404; throw err;
  }
  const plan = planRes.rows[0];

  // Zone risk → numeric values for ML
  const riskMap = { low: 0.2, medium: 0.5, high: 0.8 };
  const zoneRisk = riskMap[worker.zone_risk_level] || 0.3;

  let riskScore = 0.5;
  let riskLabel = 'medium';

  try {
    const mlPayload = {
      worker_id:         `W_${workerId}`,
      zone_id:           worker.zone_id || 1,
      platform:          worker.platform || 'Swiggy',
      months_active:     6,
      avg_daily_hours:   8,
      past_claims_count: parseInt(worker.past_claims_count, 10) || 0,
      zone_flood_risk:   zoneRisk,
      zone_heat_risk:    zoneRisk * 0.7,
    };
    const { data: ml } = await axios.post(`${ML_BASE_URL}/ml/risk-score`, mlPayload);
    riskScore = ml.risk_score ?? 0.5;
    riskLabel = ml.risk_label || 'medium';
  } catch (mlErr) {
    console.warn('[Policy] ML unavailable, using fallback risk score:', mlErr.message);
    // Fallback: risk based on past claims + zone risk
    const claimsBoost = Math.min(parseInt(worker.past_claims_count, 10) * 0.05, 0.3);
    riskScore = Math.min(0.3 + zoneRisk * 0.4 + claimsBoost, 0.9);
    riskLabel = riskScore < 0.35 ? 'low' : riskScore < 0.65 ? 'medium' : 'high';
  }

  // Premium = plan.base_premium * (1 + riskScore * 0.5) — max 1.5x at risk=1.0
  const scaledPremium = Math.round(
    parseFloat(plan.base_premium) * (1 + riskScore * 0.5)
  );

  return {
    worker_id:      workerId,
    plan_id:        plan.id,
    plan_name:      plan.name,
    risk_score:     riskScore,
    risk_label:     riskLabel,
    weekly_premium: scaledPremium,
    max_coverage:   parseFloat(plan.max_payout),
    valid_for_hours: 24,
  };
}

/**
 * CREATE POLICY
 * Purchases a policy for a worker
 */
async function createPolicy(workerId, planId) {

  // 1. Check worker exists + is verified - use COALESCE for optional columns
  const workerRes = await query(`
    SELECT w.*, COALESCE(z.zone_number, 1) AS zone_number
    FROM workers w
    LEFT JOIN zones z ON z.id = w.zone_id
    WHERE w.id = $1
  `, [workerId]);

  if (!workerRes.rows.length) {
    throw { status: 404, message: 'Worker not found' };
  }
  const worker = workerRes.rows[0];

  if (!worker.is_phone_verified) {
    throw { status: 400, message: 'Phone must be verified before purchasing a policy' };
  }

  if (!worker.is_profile_complete) {
    throw { status: 400, message: 'Please complete your profile before purchasing a policy' };
  }

  // 2. Check no active policy already exists
  const activePolicy = await query(`
    SELECT id FROM policies
    WHERE worker_id = $1 AND status = 'active'
    LIMIT 1
  `, [workerId]);

  if (activePolicy.rows.length) {
    throw { status: 400, message: 'Worker already has an active policy' };
  }

  // 3. Fetch plan - use COALESCE for optional columns
  const planRes = await query(`
    SELECT *
    FROM plans
    WHERE id = $1 AND COALESCE(is_active, true) = true
  `, [planId]);

  if (!planRes.rows.length) {
    throw { status: 404, message: 'Plan not found or inactive' };
  }
  const plan = planRes.rows[0];

  // 4. Nano plan restriction
  if (plan.name === 'nano' && parseFloat(worker.avg_weekly_earning) > 3000) {
    throw {
      status: 400,
      message: 'Nano plan is only available for workers earning under ₹3,000/week'
    };
  }

  // 5. Calculate premium
  const riskMultiplier = await getRiskMultiplier(worker);
  const pricing = calculatePremium({
    basePremium: parseFloat(plan.base_premium),
    zoneNumber: worker.zone_number || 1,
    claimFreeWeeks: worker.claim_free_weeks || 0,
    weeklyIncome: parseFloat(worker.avg_weekly_earning) || 0,
    riskMultiplier
  });

  const coPay = getCoPay(plan.name);

  // 6. Set policy dates (weekly cycle)
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (plan.coverage_days || 7));

  // 7. Create policy
  // Build INSERT dynamically so it works whether or not migration 007 has run.
  // Core columns guaranteed by migration 000:
  const insertCols = ['worker_id', 'plan_id', 'status', 'premium', 'premium_amount', 'start_date', 'end_date'];
  const insertVals = [workerId, planId, 'active', pricing.finalPremium, pricing.finalPremium,
    startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];

  // Optional columns added by migration 007 — only include if they exist on the table.
  const colCheckRes = await query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policies'
    AND column_name IN ('co_payment_percent', 'auto_renew', 'zone_adjustment', 'coverage_config')
  `);
  const existingCols = new Set(colCheckRes.rows.map(r => r.column_name));

  if (existingCols.has('co_payment_percent')) { insertCols.push('co_payment_percent'); insertVals.push(coPay); }
  if (existingCols.has('auto_renew'))         { insertCols.push('auto_renew');         insertVals.push(false); }
  if (existingCols.has('zone_adjustment'))    { insertCols.push('zone_adjustment');    insertVals.push(pricing.zoneAdjustment); }
  if (existingCols.has('coverage_config'))    { insertCols.push('coverage_config');    insertVals.push(plan.coverage_config || null); }

  const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO policies (${insertCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    insertVals
  );

  const policy = rows[0];

  // 8. Return full response
  return {
    policy: {
      ...policy,
      plan_name: plan.name,
      max_payout: plan.max_payout,
      days_remaining: plan.coverage_days || 7
    },
    pricing,
    message: `${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} plan activated successfully`
  };
}

/**
 * GET WORKER POLICIES
 * Returns all policies for a worker
 */
async function getWorkerPolicies(workerId) {
  const { rows } = await query(`
    SELECT
      pol.*,
      pl.name       AS plan_name,
      pl.max_payout AS max_payout,
      pl.coverage_config,
      GREATEST(0, (pol.end_date::date - CURRENT_DATE)) AS days_remaining
    FROM policies pol
    JOIN plans pl ON pl.id = pol.plan_id
    WHERE pol.worker_id = $1
    ORDER BY pol.created_at DESC
  `, [workerId]);

  return rows;
}

/**
 * GET POLICY BY ID
 * Returns single policy (only if belongs to worker)
 */
async function getPolicyById(policyId, workerId) {
  const { rows } = await query(`
    SELECT
      pol.*,
      pl.name        AS plan_name,
      COALESCE(pl.max_payout, pl.max_coverage) AS max_payout,
      pl.coverage_config,
      GREATEST(0, (pol.end_date::date - CURRENT_DATE)) AS days_remaining,
      w.name         AS worker_name,
      w.phone,
      COALESCE(w.upi_id, w.upi) AS upi_id
    FROM policies pol
    JOIN plans pl ON pl.id = pol.plan_id
    JOIN workers w ON w.id = pol.worker_id
    WHERE pol.id = $1 AND pol.worker_id = $2
  `, [policyId, workerId]);

  if (!rows.length) {
    throw { status: 404, message: 'Policy not found' };
  }
  return rows[0];
}

// Helper function to add days to a date
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function renewPolicy(policyId, workerId) {

  // 1. Find the existing policy - use COALESCE for optional columns
  const policyRes = await query(`
    SELECT pol.*, 
           pl.name AS plan_name, 
           COALESCE(pl.coverage_days, 7) AS coverage_days, 
           COALESCE(pl.base_premium, pl.weekly_premium) AS base_premium,
           COALESCE(pl.is_active, true) AS is_active
    FROM policies pol
    JOIN plans pl ON pl.id = pol.plan_id
    WHERE pol.id = $1 AND pol.worker_id = $2
  `, [policyId, workerId]);

  if (!policyRes.rows.length) {
    throw { status: 404, message: 'Policy not found' };
  }
  const old = policyRes.rows[0];

  if (old.status === 'active') {
    throw { status: 400, message: 'Policy is already active' };
  }

  // 2. Check no other active policy
  const activeCheck = await query(`
    SELECT id FROM policies
    WHERE worker_id = $1 AND status = 'active' AND id != $2
    LIMIT 1
  `, [workerId, policyId]);

  if (activeCheck.rows.length) {
    throw { status: 400, message: 'Worker already has another active policy' };
  }

  const newStart = addDays(old.end_date, 1);
  const newEnd   = addDays(newStart, 30);
  const quote    = await generateQuote(workerId, old.plan_id);

  const { rows } = await query(
    `UPDATE policies
     SET start_date = $1, end_date = $2, premium = $3,
         status = 'active', updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [newStart, newEnd, quote.weekly_premium, policyId]
  );

  return rows[0];
}

/**
 * CANCEL POLICY
 * Cancels an active policy for a worker
 */
async function cancelPolicy(policyId, workerId) {

  // 1. Find the existing policy
  const policyRes = await query(`
    SELECT pol.*, pl.name AS plan_name
    FROM policies pol
    JOIN plans pl ON pl.id = pol.plan_id
    WHERE pol.id = $1 AND pol.worker_id = $2
  `, [policyId, workerId]);

  if (!policyRes.rows.length) {
    throw { status: 404, message: 'Policy not found' };
  }
  const policy = policyRes.rows[0];

  if (policy.status !== 'active') {
    throw { status: 400, message: 'Only active policies can be cancelled' };
  }

  // 2. Cancel the policy
  const { rows } = await query(
    `UPDATE policies
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [policyId]
  );

  return {
    policy: rows[0],
    message: 'Policy cancelled successfully'
  };
}

// ─────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────
module.exports = {
  listPlans,
  generateQuote,
  createPolicy,
  getWorkerPolicies,
  getPolicyById,
  renewPolicy,
  cancelPolicy,
  calculatePremium  // exported for use in claims service later
};
