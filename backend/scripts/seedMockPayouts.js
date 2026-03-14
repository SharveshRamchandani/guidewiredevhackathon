require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (process.env.ANTIGRAVITY_DB_URL) {
  process.env.DATABASE_URL = process.env.ANTIGRAVITY_DB_URL;
}

const { query, pool } = require('../src/config/db');

const SEED_NOTES = {
  abhiniggaCompleted: 'mock-payout-seed:abhinigga-completed',
  harshaCompleted: 'mock-payout-seed:harsha-completed',
  harshaProcessing: 'mock-payout-seed:harsha-processing',
  kokiCompleted: 'mock-payout-seed:koki-completed',
};

async function getPlan(planId) {
  const { rows } = await query(
    `SELECT id, name, base_premium, weekly_premium, max_payout
     FROM plans
     WHERE id = $1`,
    [planId]
  );
  return rows[0] || null;
}

async function ensurePolicyForWorker(worker, planId) {
  const existing = await query(
    `SELECT id, worker_id, plan_id, status
     FROM policies
     WHERE worker_id = $1 AND plan_id = $2 AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`,
    [worker.id, planId]
  );
  if (existing.rows.length) return existing.rows[0];

  const plan = await getPlan(planId);
  if (!plan) {
    throw new Error(`Plan ${planId} not found for worker ${worker.name}`);
  }

  const premium = plan.base_premium || plan.weekly_premium || 0;
  const { rows } = await query(
    `INSERT INTO policies
       (worker_id, plan_id, premium, premium_amount, start_date, end_date, status, auto_renew, coverage_config, co_payment_percent, zone_adjustment, created_at, updated_at)
     VALUES
       ($1, $2, $3, $3, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '2 days', 'active', true, '{}'::jsonb, 0, 1, NOW(), NOW())
     RETURNING id, worker_id, plan_id, status`,
    [worker.id, planId, premium]
  );
  return rows[0];
}

async function ensureClaim({ workerId, policyId, type, amount, status, createdAt, notes }) {
  const existing = await query(
    `SELECT id, worker_id, policy_id, type, amount, status
     FROM claims
     WHERE worker_id = $1 AND notes = $2
     LIMIT 1`,
    [workerId, notes]
  );
  if (existing.rows.length) return existing.rows[0];

  const { rows } = await query(
    `INSERT INTO claims
       (worker_id, policy_id, type, amount, status, notes, created_at, updated_at, fraud_score)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7, $7, 0.05)
     RETURNING id, worker_id, policy_id, type, amount, status`,
    [workerId, policyId, type, amount, status, notes, createdAt]
  );
  return rows[0];
}

async function ensurePayout({ workerId, claimId, amount, upiId, status, initiatedAt, completedAt }) {
  const existing = await query(
    `SELECT id, worker_id, claim_id, status
     FROM payouts
     WHERE claim_id = $1
     LIMIT 1`,
    [claimId]
  );
  if (existing.rows.length) return existing.rows[0];

  const { rows } = await query(
    `INSERT INTO payouts
       (worker_id, claim_id, amount, status, upi_id, initiated_at, completed_at)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, worker_id, claim_id, status`,
    [workerId, claimId, amount, status, upiId, initiatedAt, completedAt]
  );
  return rows[0];
}

async function seed() {
  const { rows: workers } = await query(
    `SELECT id, name, upi_id, plan_id
     FROM workers
     WHERE name IN ('abhinigga', 'harsha', 'koki kumar')
     ORDER BY name`
  );

  const workerByName = Object.fromEntries(workers.map((worker) => [worker.name, worker]));
  if (!workerByName['abhinigga'] || !workerByName['harsha'] || !workerByName['koki kumar']) {
    throw new Error('Expected workers abhinigga, harsha, and koki kumar to exist before seeding payouts.');
  }

  const harshaPolicy = await ensurePolicyForWorker(workerByName['harsha'], '937e2721-ae2d-4869-a13b-abb1febeb66a');
  const kokiPolicy = await ensurePolicyForWorker(workerByName['koki kumar'], '58e413bd-0ce1-46a6-8fb8-493510082447');
  const abhiniggaPolicy = await ensurePolicyForWorker(workerByName['abhinigga'], workerByName['abhinigga'].plan_id);

  const scenarios = [
    {
      worker: workerByName['abhinigga'],
      policyId: abhiniggaPolicy.id,
      type: 'Road Accident',
      amount: 650,
      claimStatus: 'approved',
      claimCreatedAt: '2026-03-12T07:45:00.000Z',
      claimNotes: SEED_NOTES.abhiniggaCompleted,
      payoutStatus: 'completed',
      payoutInitiatedAt: '2026-03-12T10:15:00.000Z',
      payoutCompletedAt: '2026-03-12T14:40:00.000Z',
    },
    {
      worker: workerByName['harsha'],
      policyId: harshaPolicy.id,
      type: 'Heavy Rain',
      amount: 400,
      claimStatus: 'approved',
      claimCreatedAt: '2026-03-11T04:07:00.702Z',
      claimNotes: SEED_NOTES.harshaCompleted,
      payoutStatus: 'completed',
      payoutInitiatedAt: '2026-03-11T05:20:00.000Z',
      payoutCompletedAt: '2026-03-11T08:05:00.000Z',
    },
    {
      worker: workerByName['harsha'],
      policyId: harshaPolicy.id,
      type: 'Heatwave',
      amount: 250,
      claimStatus: 'approved',
      claimCreatedAt: '2026-03-13T04:07:00.702Z',
      claimNotes: SEED_NOTES.harshaProcessing,
      payoutStatus: 'processing',
      payoutInitiatedAt: '2026-03-13T09:10:00.000Z',
      payoutCompletedAt: null,
    },
    {
      worker: workerByName['koki kumar'],
      policyId: kokiPolicy.id,
      type: 'Heavy Rain',
      amount: 125,
      claimStatus: 'approved',
      claimCreatedAt: '2026-03-13T03:42:37.642Z',
      claimNotes: SEED_NOTES.kokiCompleted,
      payoutStatus: 'completed',
      payoutInitiatedAt: '2026-03-13T06:45:00.000Z',
      payoutCompletedAt: '2026-03-13T11:20:00.000Z',
    },
  ];

  for (const scenario of scenarios) {
    const claim = await ensureClaim({
      workerId: scenario.worker.id,
      policyId: scenario.policyId,
      type: scenario.type,
      amount: scenario.amount,
      status: scenario.claimStatus,
      createdAt: scenario.claimCreatedAt,
      notes: scenario.claimNotes,
    });

    await ensurePayout({
      workerId: scenario.worker.id,
      claimId: claim.id,
      amount: scenario.amount,
      upiId: scenario.worker.upi_id,
      status: scenario.payoutStatus,
      initiatedAt: scenario.payoutInitiatedAt,
      completedAt: scenario.payoutCompletedAt,
    });
  }

  const { rows } = await query(
    `SELECT p.id, w.name AS worker_name, pl.name AS plan_name, c.type AS claim_type, p.amount, p.status, p.initiated_at
     FROM payouts p
     JOIN workers w ON w.id = p.worker_id
     JOIN claims c ON c.id = p.claim_id
     LEFT JOIN policies po ON po.id = c.policy_id
     LEFT JOIN plans pl ON pl.id = po.plan_id
     ORDER BY p.initiated_at DESC`
  );

  console.log(JSON.stringify(rows, null, 2));
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
