const { Pool } = require('pg');

// Use DATABASE_URL connection string directly
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Enable SSL only for remote hosts (not localhost)
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Test DB connectivity on startup.
 * Does NOT kill process — logs and returns so server can still start.
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`✅ PostgreSQL connected at ${result.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.error('   → Make sure PostgreSQL is running and DATABASE_URL is correct.');
    return false;
  }
}

/**
 * Convenience wrapper – returns full QueryResult.
 */
async function query(text, params) {
  const start  = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] ${Date.now() - start}ms | rows: ${result.rowCount} | ${text.slice(0, 60).replace(/\s+/g, ' ')}`);
  }
  return result;
}

module.exports = { pool, query, testConnection };
