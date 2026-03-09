const { query } = require('../config/db');
const {
  cacheDashboard, getDashboard, invalidateDashboard,
  cacheConfig,
} = require('../config/redis');

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

async function getDashboardKpis() {
  const cached = await getDashboard();
  if (cached) return cached;

  const [workers, policies, claims, payouts, events] = await Promise.all([
    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) AS verified
           FROM workers WHERE is_active = TRUE`),

    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
                  COALESCE(SUM(premium), 0) AS premium_collected
           FROM policies`),

    query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
                  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                  SUM(CASE WHEN fraud_score > 60    THEN 1 ELSE 0 END) AS fraud_flagged
           FROM claims`),

    query(`SELECT COALESCE(SUM(amount), 0) AS total_paid
           FROM payouts WHERE status = 'completed'`),

    query(`SELECT COUNT(*) AS total
           FROM disruption_events
           WHERE triggered_at > NOW() - INTERVAL '24 hours'`),
  ]);

  const kpis = {
    workers:         { total: +workers.rows[0].total,   verified: +workers.rows[0].verified },
    policies:        { total: +policies.rows[0].total,  active: +policies.rows[0].active,
                       premium_collected: +policies.rows[0].premium_collected },
    claims:          { total: +claims.rows[0].total,    pending: +claims.rows[0].pending,
                       approved: +claims.rows[0].approved, fraud_flagged: +claims.rows[0].fraud_flagged },
    payouts:         { total_paid: +payouts.rows[0].total_paid },
    events_last_24h: +events.rows[0].total,
    generated_at:    new Date().toISOString(),
  };

  await cacheDashboard(kpis);
  return kpis;
}

// ─── Workers ──────────────────────────────────────────────────────────────────

async function listWorkers({ page = 1, limit = 20, kyc_status, platform, zone_id } = {}) {
  const offset  = (Math.max(+page, 1) - 1) * +limit;
  const params  = [];
  const filters = [];

  if (kyc_status) { params.push(kyc_status); filters.push(`w.kyc_status = $${params.length}`); }
  if (platform)   { params.push(platform);   filters.push(`w.platform = $${params.length}`); }
  if (zone_id)    { params.push(zone_id);     filters.push(`w.zone_id = $${params.length}`); }

  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  params.push(+limit, +offset);

  const { rows } = await query(
    `SELECT w.id, w.name, w.phone, w.platform, w.kyc_status, w.risk_level,
            w.upi, w.weekly_earnings, w.is_active,
            z.name AS zone_name, c.name AS city_name, w.created_at
     FROM workers w
     LEFT JOIN zones  z ON z.id = w.zone_id
     LEFT JOIN cities c ON c.id = w.city_id
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
     SET kyc_status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, phone, kyc_status`,
    [status, workerId]
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

// ─── Policies ─────────────────────────────────────────────────────────────────

async function listAllPolicies({ page = 1, limit = 20, status } = {}) {
  const offset = (Math.max(+page, 1) - 1) * +limit;
  const params = [];
  const where  = status
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
  const where  = status
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
               SUM(CASE WHEN fraud_score < 30  THEN 1 ELSE 0 END) AS low,
               SUM(CASE WHEN fraud_score BETWEEN 30 AND 60 THEN 1 ELSE 0 END) AS medium,
               SUM(CASE WHEN fraud_score > 60  THEN 1 ELSE 0 END) AS high
             FROM claims`),

      query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
             FROM payouts GROUP BY status`),
    ]);

  return {
    claims_by_type:    claimsByType.rows,
    claims_by_status:  claimsByStatus.rows,
    revenue_by_month:  revenueByMonth.rows,
    fraud_distribution: fraudDist.rows[0],
    payouts_by_status: payoutsByStatus.rows,
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
  const fields  = Object.keys(updates).filter(k => allowed.includes(k));
  if (!fields.length) {
    const e = new Error('No valid config fields provided.'); e.statusCode = 400; throw e;
  }

  const values  = fields.map(f => updates[f]);
  const setSQL  = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
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
  getAnalytics,
  getSystemConfig, updateSystemConfig,
};
