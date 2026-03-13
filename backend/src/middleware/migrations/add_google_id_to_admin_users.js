/**
 * Migration: Add google_id column to admin_users table
 *
 * Run once with: node src/migrations/add_google_id_to_admin_users.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { pool } = require('../config/db');

async function run() {
    const client = await pool.connect();
    try {
        console.log('[Migration] Adding google_id column to admin_users...');
        await client.query(`
            ALTER TABLE admin_users
            ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
        `);
        console.log('[Migration] ✅ google_id column added (or already existed).');
    } catch (err) {
        console.error('[Migration] ❌ Failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
