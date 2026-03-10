/**
 * Seed Script — Super Admin
 * Run once: npm run seed:super-admin
 * Safe to run multiple times (idempotent).
 *
 * Reads credentials from .env:
 *   SUPER_ADMIN_EMAIL    (default: superadmin@gigshield.in)
 *   SUPER_ADMIN_PASSWORD (default: GigShield@SuperAdmin#2026)
 *   SUPER_ADMIN_NAME     (default: GigShield Platform Owner)
 */

const path = require('path');
// __dirname = backend/scripts/, so ../  = backend/  where .env lives
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { testConnection } = require('../src/config/db');
const adminAuthService = require('../src/services/adminAuthService');

async function main() {
    // Connect to DB
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Could not connect to database. Check DATABASE_URL in .env');
        process.exit(1);
    }

    try {
        await adminAuthService.createSuperAdmin();
        console.log('✅ Seed complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        process.exit(1);
    }
}

main();
