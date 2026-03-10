/**
 * Seed Script — Super Admin Placeholder
 * Run once after a fresh DB reset: npm run seed:super-admin
 * Safe to re-run (idempotent).
 *
 * This creates a PENDING super admin row. The actual account is activated
 * the first time the designated email logs in via Google OAuth.
 *
 * Required .env variable:
 *   SUPER_ADMIN_EMAIL  — the Google account email that should become Super Admin
 *
 * Optional:
 *   SUPER_ADMIN_NAME   — display name (default: 'GigShield Super Admin')
 *
 * Flow:
 *   1. Run: npm run seed:super-admin
 *   2. Visit /admin/login and click "Sign in with Google"
 *   3. Log in with the SUPER_ADMIN_EMAIL Google account
 *   4. You are now authenticated as Super Admin
 *   5. Use the Staff Management page to add other admins
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { query, testConnection } = require('../src/config/db');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'GigShield Super Admin';

async function main() {
    if (!SUPER_ADMIN_EMAIL) {
        console.error('❌  SUPER_ADMIN_EMAIL is not set in .env');
        console.error('    Add: SUPER_ADMIN_EMAIL=your.google.account@gmail.com');
        process.exit(1);
    }

    const connected = await testConnection();
    if (!connected) {
        console.error('❌  Could not connect to database. Check DATABASE_URL in .env');
        process.exit(1);
    }

    try {
        // Check if a super_admin already exists
        const { rows: existing } = await query(
            "SELECT id, email, google_id FROM admin_users WHERE role = 'super_admin'",
            []
        );

        if (existing.length) {
            const sa = existing[0];
            if (sa.google_id) {
                console.log(`\n✅  Super Admin already set up.`);
                console.log(`    Email   : ${sa.email}`);
                console.log(`    Google  : linked ✓`);
            } else {
                console.log(`\n⚠️   Super Admin placeholder exists but Google login not yet completed.`);
                console.log(`    Email   : ${sa.email}`);
                console.log(`    Action  : Go to /admin/login → Sign in with Google using this email.`);
            }
            process.exit(0);
        }

        // Create placeholder: password is 'GOOGLE_ONLY', no google_id yet
        // The google_id gets linked on first Google OAuth login (see passport.js)
        await query(
            `INSERT INTO admin_users (name, email, password_hash, role, job_title, active)
             VALUES ($1, $2, 'GOOGLE_ONLY', 'super_admin', 'Platform Owner', true)`,
            [SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL]
        );

        console.log(`
╔══════════════════════════════════════════════════════════════╗
║            GigShield — Super Admin Placeholder Created       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Email : ${SUPER_ADMIN_EMAIL.padEnd(51)}║
║                                                              ║
║  ➡  Next Step:                                               ║
║     1. Start the backend  →  npm run dev                     ║
║     2. Open  →  http://localhost:5173/admin/login            ║
║     3. Click "Sign in with Google"                           ║
║     4. Log in with the email above                           ║
║     5. You will be authenticated as Super Admin              ║
║                                                              ║
║  The first Google login with this email activates the        ║
║  account. All other Google accounts will be rejected         ║
║  unless you add them as staff from the admin portal.         ║
╚══════════════════════════════════════════════════════════════╝
`);
        process.exit(0);
    } catch (err) {
        console.error('❌  Seed failed:', err.message);
        process.exit(1);
    }
}

main();
