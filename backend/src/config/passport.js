/**
 * Passport Google OAuth2 Strategy — Admin Portal
 *
 * Flow for Super Admin (first-time setup):
 *  1. Run: npm run seed:super-admin  (creates a GOOGLE_ONLY placeholder row)
 *  2. Click "Sign in with Google" on /admin/login
 *  3. Log in with SUPER_ADMIN_EMAIL
 *  4. This strategy links the google_id and issues a JWT → Super Admin is active
 *
 * Flow for existing staff (admin role):
 *  - Super Admin creates staff via /admin/staff/new
 *  - Staff member uses the setup link to set a password, OR
 *  - If the staff email is in admin_users, they can also sign in via Google
 *    (google_id gets linked on first Google login)
 *
 * Security rules:
 *  - Only emails already in admin_users are allowed — no self-signup
 *  - Accounts with active=false are rejected
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('./db');
const jwtService = require('../services/jwtService');

function setupPassport() {
    if (
        !process.env.GOOGLE_CLIENT_ID ||
        !process.env.GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here'
    ) {
        console.warn('[Passport] ⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled.');
        passport.serializeUser((user, done) => done(null, user));
        passport.deserializeUser((user, done) => done(null, user));
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/auth/google/callback`,
                scope: ['profile', 'email'],
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const googleId = profile.id;
                    const email = profile.emails?.[0]?.value?.toLowerCase();
                    const name = profile.displayName;

                    if (!email) {
                        return done(null, false, { message: 'No email returned from Google.' });
                    }

                    // ── 1. Try to find by google_id first (returning user fast path) ──
                    let { rows } = await query(
                        `SELECT id, name, email, role, job_title, active, google_id, password_hash
                         FROM admin_users WHERE google_id = $1`,
                        [googleId]
                    );

                    // ── 2. Not found by google_id → try by email ──────────────────────
                    if (!rows.length) {
                        ({ rows } = await query(
                            `SELECT id, name, email, role, job_title, active, google_id, password_hash
                             FROM admin_users WHERE email = $1`,
                            [email]
                        ));

                        if (rows.length) {
                            const existing = rows[0];

                            // Link google_id on first Google login for this account
                            await query(
                                `UPDATE admin_users
                                 SET google_id  = $1,
                                     name       = CASE WHEN name IS NULL OR name = '' THEN $2 ELSE name END,
                                     updated_at = NOW()
                                 WHERE id = $3`,
                                [googleId, name, existing.id]
                            );

                            // If this was a GOOGLE_ONLY placeholder (super admin seed),
                            // mark it as fully set up now
                            if (existing.password_hash === 'GOOGLE_ONLY') {
                                await query(
                                    `UPDATE admin_users
                                     SET password_hash = 'GOOGLE_AUTH', updated_at = NOW()
                                     WHERE id = $1`,
                                    [existing.id]
                                );
                                console.log(`\n[OAuth] ✅ Super Admin activated via Google: ${email}\n`);
                            }

                            // Refresh row after update
                            ({ rows } = await query(
                                `SELECT id, name, email, role, job_title, active FROM admin_users WHERE id = $1`,
                                [existing.id]
                            ));
                        }
                    }

                    // ── 3. No matching row at all → reject ────────────────────────────
                    if (!rows.length) {
                        return done(null, false, {
                            message: 'No admin account found for this Google account. Contact your super admin.',
                        });
                    }

                    const admin = rows[0];

                    // ── 4. Account must be active ─────────────────────────────────────
                    if (!admin.active) {
                        return done(null, false, { message: 'inactive' });
                    }

                    // ── 5. Update last_login ──────────────────────────────────────────
                    await query(
                        'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
                        [admin.id]
                    );

                    // ── 6. Issue JWT ──────────────────────────────────────────────────
                    const token = jwtService.generateAdminToken(admin);

                    return done(null, {
                        token,
                        admin: {
                            id: admin.id,
                            name: admin.name,
                            email: admin.email,
                            role: admin.role,
                            jobTitle: admin.job_title,
                        },
                    });
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
}

module.exports = { setupPassport };
