const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { query } = require('./db');
const jwtService = require('../services/jwtService');

function setupPassport() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
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
                        return done(null, false, { message: 'No email found in Google profile.' });
                    }

                    // 1. Try to find by google_id (returning user)
                    let { rows } = await query(
                        `SELECT id, name, email, role, job_title, active, google_id, password_hash
                         FROM admin_users WHERE google_id = $1`,
                        [googleId]
                    );

                    // 2. If not found by google_id, try by email (first-time Google login for existing admin)
                    if (!rows.length) {
                        ({ rows } = await query(
                            `SELECT id, name, email, role, job_title, active, google_id, password_hash
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

                    // 5. Update last_login
                    await query(`UPDATE admin_users SET last_login = NOW() WHERE id = $1`, [admin.id]);

                    // 6. Issue JWT
                    const token = jwtService.generateAdminToken(admin);

                    return done(null, {
                        token, admin: {
                            id: admin.id,
                            name: admin.name,
                            email: admin.email,
                            jobTitle: admin.job_title,
                            role: admin.role,
                        }
                    });
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
