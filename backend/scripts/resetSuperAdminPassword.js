/**
 * Reset Super Admin Password
 * Forcefully updates the super admin password hash to match whatever
 * SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD is currently in .env.
 *
 * Run: node scripts/resetSuperAdminPassword.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const { query, testConnection } = require('../src/config/db');

const BCRYPT_ROUNDS = 12;

async function main() {
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Cannot connect to DB. Check DATABASE_URL in .env');
        process.exit(1);
    }

    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env');
        process.exit(1);
    }

    console.log(`\n🔍  Looking for super admin: ${email}`);

    const { rows } = await query(
        "SELECT id, email, role FROM admin_users WHERE email = $1",
        [email.toLowerCase()]
    );

    if (!rows.length) {
        console.error(`❌ No admin_users row found for email: ${email}`);
        console.error('   Run  npm run seed:super-admin  first to create the super admin.');
        process.exit(1);
    }

    const admin = rows[0];
    console.log(`✅  Found: id=${admin.id}  role=${admin.role}`);

    console.log('🔐  Hashing new password (this takes a few seconds)…');
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await query(
        `UPDATE admin_users
         SET password_hash = $1, setup_token = NULL, setup_token_expiry = NULL,
             active = true, updated_at = NOW()
         WHERE id = $2`,
        [password_hash, admin.id]
    );

    console.log(`\n✅  Password updated for ${email}`);
    console.log(`    You can now log in at /admin/login with the credentials in your .env\n`);
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
});
