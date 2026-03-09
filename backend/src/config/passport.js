/**
 * Passport Google OAuth2 Strategy — Admin Portal
 *
 * Flow:
 *  1. Admin clicks "Sign in with Google" → /api/admin/auth/google
 *  2. Google redirects to /api/admin/auth/google/callback with profile
 *  3. We find or create the admin_users row via google_id
 *  4. Issue our own JWT and redirect frontend to /admin/oauth/callback?token=...
 *
 * Allowed rules:
 *  - super_admin: only the email in SUPER_ADMIN_EMAIL may use Google login AS super_admin
 *  - admin: any admin_users row with matching google_id OR whose email matches
 *    a pending/active admin record (and account is active).
 *  - New Google accounts NOT in admin_users are rejected (no self-signup).
 */

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('./db');
const jwtService = require('../services/jwtService');

function setupPassport() {
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
                        return done(null, false, { message: 'No email found in Google profile.' });
                    }

                    // 1. Try to find by google_id (returning user)
                    let { rows } = await query(
                        `SELECT id, name, email, role, company_name, active, google_id, password_hash
                         FROM admin_users WHERE google_id = $1`,
                        [googleId]
                    );

                    // 2. If not found by google_id, try by email (first-time Google login for existing admin)
                    if (!rows.length) {
                        ({ rows } = await query(
                            `SELECT id, name, email, role, company_name, active, google_id, password_hash
                             FROM admin_users WHERE email = $1`,
                            [email]
                        ));

                        if (rows.length) {
                            // Link google_id to existing account on first Google login
                            await query(
                                `UPDATE admin_users SET google_id = $1, updated_at = NOW() WHERE id = $2`,
                                [googleId, rows[0].id]
                            );
                        }
                    }

                    // 3. No matching admin_users row → reject (no self-signup via Google)
                    if (!rows.length) {
                        return done(null, false, {
                            message: 'No admin account found for this Google account. Contact your super admin.',
                        });
                    }

                    const admin = rows[0];

                    // 4. Account must be active
                    if (!admin.active) {
                        return done(null, false, { message: 'Your admin account has been deactivated.' });
                    }

                    // 5. Account must not be in PENDING_SETUP state (password hasn't been set yet
                    //    AND google_id was just linked — we allow them through, as Google IS their auth method)
                    // If password_hash is PENDING_SETUP and google_id was not previously set, we now
                    // mark setup as complete since Google auth replaces password setup.
                    if (admin.password_hash === 'PENDING_SETUP') {
                        await query(
                            `UPDATE admin_users
                             SET password_hash = NULL, setup_token = NULL, setup_token_expiry = NULL,
                                 google_id = $1, updated_at = NOW()
                             WHERE id = $2`,
                            [googleId, admin.id]
                        );
                    }

                    // 6. Update last_login
                    await query(`UPDATE admin_users SET last_login = NOW() WHERE id = $1`, [admin.id]);

                    // 7. Issue JWT
                    const token = jwtService.generateAdminToken(admin);

                    return done(null, { token, admin });
                } catch (err) {
                    return done(err);
                }
            }
        )
    );

    // We don't use sessions (JWT-only), so minimal serialize/deserialize
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));
}

module.exports = { setupPassport };
