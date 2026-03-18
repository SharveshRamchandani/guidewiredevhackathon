const mlClient = require('../config/mlClient');
const { query } = require('../config/db');
const eventBus = require('../events/eventBus'); // RBA event bus

// ─── Claim type → payout ratio (matching actual schema types) ─────────────────
const PAYOUT_RATIOS = {
  'Heavy Rain': 0.50,
  'Poor AQI': 0.30,
  'Heatwave': 0.40,
  'Platform Outage': 0.60,
  // Legacy keys for backwards compat
  weather: 0.50,
  aqi: 0.30,
  strike: 0.40,
  disruption: 0.35,
};

/**
 * Generate a quote by calling ML /ml/risk-score with the correct payload.
 * Falls back to a calculated estimate if ML service is unavailable.
 */
async function generateQuote({ workerId, planId }) {
  // Fetch worker + zone details
  const { rows: workers } = await query(
    `SELECT w.id, w.phone, w.platform, w.zone_id,
            z.risk_factor AS zone_risk_factor,
            (SELECT COUNT(*) FROM claims c
               JOIN policies p ON p.id = c.policy_id
               WHERE p.worker_id = w.id) AS past_claims_count
     FROM workers w
     LEFT JOIN zones z ON z.id = w.zone_id
     WHERE w.id = $1`,
    [workerId]
  );
  if (!workers.length) {
    const err = new Error('Worker not found.'); err.statusCode = 404; throw err;
  }
  const w = workers[0];

  // Validate plan exists
  const { rows: plans } = await query(
    'SELECT id, name, base_premium, max_payout, coverage_config FROM plans WHERE id = $1',
    [planId]
  );
  if (!plans.length) {
    const err = new Error('Plan not found.'); err.statusCode = 404; throw err;
  }
  const plan = plans[0];
  const coverageEntries = Object.values(plan.coverage_config || {});
  const coveredEventCount = coverageEntries.length;
  const avgCopay = coveredEventCount
    ? coverageEntries.reduce((sum, entry) => sum + (parseFloat(entry.coPay) || 0), 0) / coveredEventCount
    : 0.2;

  // Zone risk → numeric values for ML
  const zoneRisk = parseFloat(w.zone_risk_factor) || 0.3;

  let riskScore = 0.5;
  let riskLabel = 'medium';
  let weeklyPremium = parseFloat(plan.base_premium) || 49;
  let maxCoverage = parseFloat(plan.max_payout) || 1000;

  try {
    const mlPayload = {
      worker_id: `W_${workerId}`,
      zone_id: w.zone_id || 1,
      platform: w.platform || 'Swiggy',
      months_active: 6,
      avg_daily_hours: 8,
      past_claims_count: parseInt(w.past_claims_count, 10) || 0,
      zone_flood_risk: zoneRisk,
      zone_heat_risk: zoneRisk * 0.7,
      plan_base_premium: parseFloat(plan.base_premium) || 49,
      plan_max_payout: parseFloat(plan.max_payout) || 1000,
      covered_event_count: coveredEventCount,
      avg_copay: Number(avgCopay.toFixed(4)),
    };
    const { data: ml } = await mlClient.post('/ml/risk-score', mlPayload);
    riskScore = ml.risk_score ?? 0.5;
    riskLabel = ml.risk_label || 'medium';
  } catch (mlErr) {
    console.warn('[Policy] ML unavailable, using fallback risk score:', mlErr.message);
    // Fallback: risk based on past claims + zone risk
    const claimsBoost = Math.min(parseInt(w.past_claims_count, 10) * 0.05, 0.3);
    riskScore = Math.min(0.3 + zoneRisk * 0.4 + claimsBoost, 0.9);
    riskLabel = riskScore < 0.35 ? 'low' : riskScore < 0.65 ? 'medium' : 'high';
  }

  // Premium is now derived from the plan-aware ML pricing endpoint with bounded guardrails.
  // Plan-aware premium is calculated by the ML pricing endpoint with product guardrails.
  try {
    const { data: pricing } = await mlClient.post('/ml/premium', {
      worker_id: `W_${workerId}`,
      plan_name: plan.name,
      plan_base_premium: parseFloat(plan.base_premium) || 49,
      plan_max_payout: parseFloat(plan.max_payout) || 1000,
      covered_event_count: coveredEventCount,
      avg_copay: Number(avgCopay.toFixed(4)),
      risk_label: riskLabel,
      risk_score: riskScore,
      city_climate_risk: zoneRisk,
      disruption_probability: zoneRisk,
      vulnerability_score: Math.min((parseInt(w.past_claims_count, 10) || 0) * 0.08, 0.25),
    });
    weeklyPremium = pricing.weekly_premium_inr ?? weeklyPremium;
    maxCoverage = pricing.coverage_amount_inr ?? maxCoverage;
  } catch (pricingErr) {
    console.warn('[Policy] ML premium unavailable, using bounded fallback:', pricingErr.message);
    const fallbackMultiplier = 1 + Math.min(Math.max(riskScore - 0.5, 0), 0.4) * 0.4 + zoneRisk * 0.08;
    weeklyPremium = Math.round((parseFloat(plan.base_premium) || 49) * fallbackMultiplier);
    maxCoverage = parseFloat(plan.max_payout) || 1000;
  }

  return {
    worker_id: workerId,
    plan_id: plan.id,
    plan_name: plan.name,
    risk_score: riskScore,
    risk_label: riskLabel,
    weekly_premium: weeklyPremium,
    max_coverage: maxCoverage,
    valid_for_hours: 24,
  };
}

/**
 * Create (purchase) a new policy.
 */
async function createPolicy({ workerId, planId, startDate, autoRenew = true }) {
  const quote = await generateQuote({ workerId, planId });

  const start = startDate || new Date().toISOString().split('T')[0];
  const end = addDays(start, 30);

  // Generate policy_number
  const policyNumber = `POL-${new Date().getFullYear()}-${String(Date.now()).slice(-4).padStart(4, '0')}`;

  // Fetch plan coverage_config for snapshot
  const { rows: plans } = await query(
    'SELECT coverage_config FROM plans WHERE id = $1',
    [planId]
  );
  const coverageSnapshot = plans[0]?.coverage_config || null;

  const { rows } = await query(
    `INSERT INTO policies
       (policy_number, worker_id, plan_id, premium, max_coverage,
        status, auto_renew, start_date, end_date, coverage_snapshot, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [policyNumber, workerId, planId, quote.weekly_premium, quote.max_coverage,
      autoRenew, start, end, coverageSnapshot ? JSON.stringify(coverageSnapshot) : null]
  );

  // ── RBA: policy created / upgraded ────────────────────────────────────────
  eventBus.emit('policy:upgraded', {
    workerId,
    planName: plans[0]?.coverage_config?.plan_name || policyNumber,
  });

  return rows[0];
}

async function getPolicyById(policyId, workerId = null) {
  const params = [policyId];
  let sql = `
    SELECT p.*, pl.name AS plan_name, pl.coverage_config,
           w.name AS worker_name, w.phone AS worker_phone
    FROM policies p
    JOIN plans   pl ON pl.id = p.plan_id
    JOIN workers w  ON w.id  = p.worker_id
    WHERE p.id = $1`;

  if (workerId) { sql += ' AND p.worker_id = $2'; params.push(workerId); }

  const { rows } = await query(sql, params);
  if (!rows.length) {
    const err = new Error('Policy not found.'); err.statusCode = 404; throw err;
  }
  return rows[0];
}

async function getWorkerPolicies(workerId) {
  try {
    const { rows } = await query(
      `SELECT p.*, pl.name AS plan_name, pl.max_payout, pl.base_premium, pl.coverage_config AS current_config
       FROM policies p
       JOIN plans pl ON pl.id = p.plan_id
       WHERE p.worker_id = $1
       ORDER BY p.created_at DESC`,
      [workerId]
    );
    
    // If no explicit policies exist, pull the plan_id from workers table and build an active policy representation
    if (rows.length === 0) {
      const { rows: workerRows } = await query(
        `SELECT w.plan_id, w.created_at, pl.name AS plan_name, pl.max_payout, pl.base_premium, pl.coverage_config
         FROM workers w
         JOIN plans pl ON pl.id = w.plan_id
         WHERE w.id = $1`,
        [workerId]
      );
      
      if (workerRows.length > 0 && workerRows[0].plan_id) {
        // Build a virtual active policy
        const start = workerRows[0].created_at ? new Date(workerRows[0].created_at).toISOString() : new Date().toISOString();
        const endD = new Date(start);
        endD.setDate(endD.getDate() + 30); // 30 day policy
        const end = endD.toISOString();
        
        return [{
           id: 'implicit-' + workerId,
           policy_number: 'AUTO-' + String(workerId).slice(0, 6).toUpperCase(),
           worker_id: workerId,
           plan_id: workerRows[0].plan_id,
           plan_name: workerRows[0].plan_name,
           premium: workerRows[0].base_premium,
           max_coverage: workerRows[0].max_payout,
           status: 'active',
           auto_renew: true,
           start_date: start,
           end_date: end,
           coverage_snapshot: workerRows[0].coverage_config
        }];
      }
    }
    
    // Supplement missing snapshots with current plan config
    return rows.map(r => ({
      ...r,
      coverage_snapshot: r.coverage_snapshot || r.current_config
    }));
  } catch (err) {
    console.error('[PolicyService] Error in getWorkerPolicies:', err.message);
    throw err;
  }
}

async function renewPolicy(policyId, workerId) {
  const policy = await getPolicyById(policyId, workerId);
  if (policy.status === 'cancelled') {
    const err = new Error('Cannot renew a cancelled policy.'); err.statusCode = 400; throw err;
  }

  const newStart = addDays(policy.end_date, 1);
  const newEnd = addDays(newStart, 30);
  const quote = await generateQuote({ workerId, planId: policy.plan_id });

  const { rows } = await query(
    `UPDATE policies
     SET start_date = $1, end_date = $2, premium = $3,
         status = 'active', updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [newStart, newEnd, quote.weekly_premium, policyId]
  );

  // ── RBA: policy auto-renewed ─────────────────────────────────────────────
  eventBus.emit('policy:renewed', { workerId });

  return rows[0];
}

// ─── Plans (reference data) ───────────────────────────────────────────────────

async function listPlans() {
  const { rows } = await query(
'SELECT id, name, base_premium, max_payout, coverage_config FROM plans ORDER BY base_premium ASC'
  );
  return rows;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

module.exports = {
  generateQuote, createPolicy, getPolicyById,
  getWorkerPolicies, renewPolicy, listPlans,
  PAYOUT_RATIOS,
};
