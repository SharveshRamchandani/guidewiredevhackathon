const { query } = require('../config/db');
const {
  cacheDashboard, getDashboard, invalidateDashboard,
  cacheConfig,
} = require('../config/redis');
const eventBus = require('../events/eventBus'); // RBA event bus

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

async function getDashboardKpis() {
  const cached = await getDashboard();
  if (cached) return cached;

  const [workers, policies, claims, payouts, events] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN is_kyc_verified = TRUE THEN 1 ELSE 0 END) AS verified
           FROM workers WHERE active = TRUE`),

    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
                  COALESCE(SUM(premium), 0) AS premium_collected
           FROM policies`),

    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
                  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                  SUM(CASE WHEN fraud_score > 0.60  THEN 1 ELSE 0 END) AS fraud_flagged
           FROM claims`),

    query(`SELECT COALESCE(SUM(amount), 0) AS total_paid
           FROM payouts WHERE status = 'completed'`),

    query(`SELECT COUNT(*) AS total
           FROM disruption_events
           WHERE triggered_at > NOW() - INTERVAL '24 hours'`),
  ]);

  const kpis = {
    workers: { total: +workers.rows[0].total, verified: +workers.rows[0].verified },
    policies: {
      total: +policies.rows[0].total, active: +policies.rows[0].active,
      premium_collected: +policies.rows[0].premium_collected
    },
    claims: {
      total: +claims.rows[0].total, pending: +claims.rows[0].pending,
      approved: +claims.rows[0].approved, fraud_flagged: +claims.rows[0].fraud_flagged
    },
    payouts: { total_paid: +payouts.rows[0].total_paid },
    events_last_24h: +events.rows[0].total,
    generated_at: new Date().toISOString(),
  };

  await cacheDashboard(kpis);
  return kpis;
}

// ─── Workers ──────────────────────────────────────────────────────────────────

async function listWorkers({ page = 1, limit = 20, platform, zone_id } = {}) {
  const offset = (Math.max(+page, 1) - 1) * +limit;
  const params = [];
  const filters = [];

  if (platform) { params.push(platform); filters.push(`w.platform = $${params.length}`); }
  if (zone_id) { params.push(zone_id); filters.push(`w.zone_id  = $${params.length}`); }

  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  params.push(+limit, +offset);

  const { rows } = await query(
    `SELECT w.id, w.name, w.phone, w.platform, w.city,
            w.is_kyc_verified, w.risk_level,
            w.upi_id, w.avg_weekly_earning, w.active,
            z.name AS zone_name, w.created_at
     FROM workers w
     LEFT JOIN zones z ON z.id = w.zone_id
     ${where}
     ORDER BY w.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) AS total FROM workers w ${where}`,
    params.slice(0, -2)
  );

  return { workers: rows, total: +countResult.rows[0].total, page: +page, limit: +limit };
}

async function updateWorkerKyc(workerId, status, adminId) {
  const allowed = ['pending', 'verified'];
  if (!allowed.includes(status)) {
    const e = new Error(`KYC status must be one of: ${allowed.join(', ')}`); e.statusCode = 400; throw e;
  }

  const { rows } = await query(
    `UPDATE workers
     SET is_kyc_verified = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, phone, is_kyc_verified`,
    [status === 'verified', workerId]
  );
  if (!rows.length) { const e = new Error('Worker not found.'); e.statusCode = 404; throw e; }

  await query(
    `INSERT INTO audit_logs (user_id, user_type, action, field, new_value, created_at)
     VALUES ($1, 'admin', 'update_kyc', 'kyc_status', $2, NOW())`,
    [adminId, status]
  );
  await invalidateDashboard();
  return rows[0];
}

/**
 * Flag a worker account (Scenario 4 — ADMIN ACTION).
 * Emits account:flagged which notifies both the worker and all admins.
 */
async function flagWorkerAccount(workerId, adminId, reason) {
  const { rows } = await query(
    `UPDATE workers SET active = FALSE, updated_at = NOW()
     WHERE id = $1 RETURNING id, name`,
    [workerId]
  );
  if (!rows.length) { const e = new Error('Worker not found.'); e.statusCode = 404; throw e; }

  await query(
    `INSERT INTO audit_logs (user_id, user_type, action, field, new_value, created_at)
     VALUES ($1, 'admin', 'flag_account', 'active', 'false', NOW())`,
    [adminId]
  );

  // ── RBA: account flagged ────────────────────────────────────────────────
  eventBus.emit('account:flagged', { workerId: String(workerId), adminId: adminId ? String(adminId) : undefined });

  await invalidateDashboard();
  return rows[0];
}

/**
 * Initiate fraud review (Scenario 4 — ADMIN ACTION).
 */
async function initiateFraudReview(claimId, workerId, adminId) {
  eventBus.emit('fraud:review_started', {
    workerId: String(workerId),
    claimId:  String(claimId),
    adminId:  adminId ? String(adminId) : undefined,
  });
}

/**
 * Complete fraud review — accepted (Scenario 4 — ADMIN ACTION).
 */
async function completeFraudReviewAccepted(claimId, workerId, adminId) {
  eventBus.emit('fraud:review_accepted', {
    workerId: String(workerId),
    claimId:  String(claimId),
    adminId:  adminId ? String(adminId) : undefined,
  });
}

/**
 * Complete fraud review — rejected (Scenario 4 — ADMIN ACTION).
 */
async function completeFraudReviewRejected(claimId, workerId, adminId, penaltyCredits = 0) {
  eventBus.emit('fraud:review_rejected', {
    workerId:       String(workerId),
    claimId:        String(claimId),
    penaltyCredits: penaltyCredits,
    adminId:        adminId ? String(adminId) : undefined,
  });
}

/**
 * Notify all admins that a new staff member was added (Scenario 5).
 */
async function notifyStaffAdded(staffName) {
  eventBus.emit('staff:added', { staffName });
}

/**
 * Notify all admins that a staff role changed (Scenario 5).
 */
async function notifyStaffRoleChanged(staffId, newRole) {
  eventBus.emit('staff:role_changed', { staffId: String(staffId), newRole });
}

// ─── Policies ─────────────────────────────────────────────────────────────────

async function listAllPolicies({ page = 1, limit = 20, status } = {}) {
  const offset = (Math.max(+page, 1) - 1) * +limit;
  const params = [];
  const where = status
    ? (params.push(status), `WHERE p.status = $${params.length}`)
    : '';
  params.push(+limit, +offset);

  const { rows } = await query(
    `SELECT p.*, w.name AS worker_name, w.phone AS worker_phone, pl.name AS plan_name
     FROM policies p
     JOIN workers w  ON w.id  = p.worker_id
     JOIN plans   pl ON pl.id = p.plan_id
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

// ─── Claims ───────────────────────────────────────────────────────────────────

async function listAllClaims({ page = 1, limit = 20, status } = {}) {
  const offset = (Math.max(+page, 1) - 1) * +limit;
  const params = [];
  const where = status
    ? (params.push(status), `WHERE c.status = $${params.length}`)
    : '';
  params.push(+limit, +offset);

  const { rows } = await query(
    `SELECT c.*, w.name AS worker_name, w.phone AS worker_phone,
            de.type AS event_type, de.zone_id
     FROM claims c
     JOIN workers w ON w.id = c.worker_id
     LEFT JOIN disruption_events de ON de.id = c.event_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

// ─── Disruption Events ────────────────────────────────────────────────────────

async function listDisruptionEvents({ page = 1, limit = 20 } = {}) {
  const offset = (Math.max(+page, 1) - 1) * +limit;
  const { rows } = await query(
    `SELECT de.*, z.name AS zone_name, c.name AS city_name
     FROM disruption_events de
     LEFT JOIN zones  z ON z.id = de.zone_id
     LEFT JOIN cities c ON c.id = de.city_id
     ORDER BY de.triggered_at DESC
     LIMIT $1 OFFSET $2`,
    [+limit, +offset]
  );
  return rows;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

async function getAnalytics() {
  const [claimsByType, claimsByStatus, revenueByMonth, fraudDist, payoutsByStatus] =
    await Promise.all([
      query(`SELECT type, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount
             FROM claims GROUP BY type ORDER BY count DESC`),

      query(`SELECT status, COUNT(*) AS count FROM claims GROUP BY status`),

      query(`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                    COALESCE(SUM(premium), 0) AS premium
             FROM policies
             GROUP BY month
             ORDER BY month DESC
             LIMIT 6`),

      query(`SELECT
               SUM(CASE WHEN fraud_score < 0.30 THEN 1 ELSE 0 END) AS low,
               SUM(CASE WHEN fraud_score >= 0.30 AND fraud_score <= 0.60 THEN 1 ELSE 0 END) AS medium,
               SUM(CASE WHEN fraud_score > 0.60 THEN 1 ELSE 0 END) AS high
             FROM claims`),

      query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
             FROM payouts GROUP BY status`),
    ]);

  return {
    claims_by_type: claimsByType.rows,
    claims_by_status: claimsByStatus.rows,
    revenue_by_month: revenueByMonth.rows,
    fraud_distribution: fraudDist.rows[0],
    payouts_by_status: payoutsByStatus.rows,
  };
}

async function getExposureRadar() {
  const { rows } = await query(
    `SELECT
        z.id,
        z.name AS zone_name,
        c.name AS city_name,
        COUNT(DISTINCT w.id) FILTER (WHERE w.active = TRUE) AS active_workers,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policies,
        COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'pending') AS pending_claims,
        COUNT(DISTINCT cl.id) FILTER (WHERE cl.status = 'approved') AS approved_claims,
        COUNT(DISTINCT de.id) FILTER (WHERE de.triggered_at > NOW() - INTERVAL '7 days') AS events_last_7d,
        COALESCE(SUM(DISTINCT p.max_coverage) FILTER (WHERE p.status = 'active'), 0) AS insured_capital,
        COALESCE(SUM(cl.amount) FILTER (WHERE cl.status IN ('pending', 'approved')), 0) AS live_claim_pressure
     FROM zones z
     LEFT JOIN cities c ON c.id = z.city_id
     LEFT JOIN workers w ON w.zone_id = z.id
     LEFT JOIN policies p ON p.worker_id = w.id
     LEFT JOIN claims cl
       ON cl.worker_id = w.id
      AND cl.created_at > NOW() - INTERVAL '30 days'
     LEFT JOIN disruption_events de ON de.zone_id = z.id
     GROUP BY z.id, z.name, c.name
     ORDER BY z.name ASC`
  );

  const rankedZones = rows
    .map((zone) => {
      const activeWorkers = Number(zone.active_workers || 0);
      const activePolicies = Number(zone.active_policies || 0);
      const pendingClaims = Number(zone.pending_claims || 0);
      const approvedClaims = Number(zone.approved_claims || 0);
      const eventsLast7d = Number(zone.events_last_7d || 0);
      const insuredCapital = Number(zone.insured_capital || 0);
      const liveClaimPressure = Number(zone.live_claim_pressure || 0);

      const exposureScore = Math.round(
        activePolicies * 8 +
        pendingClaims * 14 +
        approvedClaims * 6 +
        eventsLast7d * 18 +
        Math.min(insuredCapital / 500, 80)
      );

      const severityBand = exposureScore >= 140
        ? 'surge'
        : exposureScore >= 80
          ? 'elevated'
          : 'stable';

      return {
        zone_id: zone.id,
        zone_name: zone.zone_name,
        city_name: zone.city_name,
        active_workers: activeWorkers,
        active_policies: activePolicies,
        pending_claims: pendingClaims,
        approved_claims: approvedClaims,
        events_last_7d: eventsLast7d,
        insured_capital: insuredCapital,
        live_claim_pressure: liveClaimPressure,
        exposure_score: exposureScore,
        severity_band: severityBand,
        projected_auto_payout_load: Math.round((liveClaimPressure + insuredCapital * 0.12) * 100) / 100,
      };
    })
    .sort((a, b) => b.exposure_score - a.exposure_score);

  return {
    generated_at: new Date().toISOString(),
    top_zones: rankedZones.slice(0, 5),
    platform_totals: {
      monitored_zones: rankedZones.length,
      zones_in_surge: rankedZones.filter((zone) => zone.severity_band === 'surge').length,
      zones_elevated: rankedZones.filter((zone) => zone.severity_band === 'elevated').length,
    },
  };
}

// ─── System Config ────────────────────────────────────────────────────────────

async function getSystemConfig() {
  const { rows } = await query('SELECT * FROM system_config LIMIT 1');
  return rows[0] || null;
}

async function updateSystemConfig(updates, adminId) {
  // Only allow safe fields
  const allowed = ['engine_active', 'check_interval_minutes', 'payout_delay_seconds',
    'zone_overrides', 'thresholds'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (!fields.length) {
    const e = new Error('No valid config fields provided.'); e.statusCode = 400; throw e;
  }

  const values = fields.map(f => updates[f]);
  const setSQL = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  values.push(new Date()); // updated_at

  const { rows } = await query(
    `UPDATE system_config SET ${setSQL}, updated_at = $${values.length} RETURNING *`,
    values
  );

  if (rows.length) {
    await cacheConfig(rows[0]);
  }

  await query(
    `INSERT INTO audit_logs (user_id, user_type, action, field, new_value, created_at)
     VALUES ($1, 'admin', 'update_config', 'system_config', $2, NOW())`,
    [adminId, JSON.stringify(updates)]
  );

  return rows[0];
}

module.exports = {
  getDashboardKpis,
  listWorkers, updateWorkerKyc,
  listAllPolicies, listAllClaims,
  listDisruptionEvents,
  getAnalytics, getExposureRadar,
  getSystemConfig, updateSystemConfig,
  // RBA helpers (Scenario 4 + 5)
  flagWorkerAccount,
  initiateFraudReview, completeFraudReviewAccepted, completeFraudReviewRejected,
  notifyStaffAdded, notifyStaffRoleChanged,
};
