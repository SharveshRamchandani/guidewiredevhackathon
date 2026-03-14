const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const workerId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID, just to test syntax/columns
    console.log('Testing getWorkerPolicies query...');
    const result = await pool.query(
      `SELECT p.*, pl.name AS plan_name, pl.max_coverage, pl.weekly_premium AS base_premium
       FROM policies p
       JOIN plans pl ON pl.id = p.plan_id
       WHERE p.worker_id = $1
       ORDER BY p.created_at DESC`,
      [workerId]
    );
    console.log('Query successful, rows:', result.rowCount);

    console.log('Testing listPlans query...');
    const result2 = await pool.query(
      'SELECT id, name, weekly_premium AS base_premium, max_coverage AS max_payout, coverage_config FROM plans ORDER BY weekly_premium ASC'
    );
    console.log('Query successful, rows:', result2.rowCount);

  } catch (err) {
    console.error('❌ Query failed:', err.message);
  } finally {
    await pool.end();
  }
}

test();
