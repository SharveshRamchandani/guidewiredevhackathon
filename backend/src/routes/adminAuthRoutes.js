/**
 * Admin Auth Routes
 * Prefix: /api/admin/auth
 */
const router = require('express').Router();
const passport = require('passport');
const adminAuthService = require('../services/adminAuthService');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function formatError(code, message, retryAfter) {
    const error = { code, message };
    if (retryAfter) error.retryAfter = retryAfter;
    return { error };
}

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(formatError('VALIDATION_ERROR', 'Email and password are required.'));
    }

    const result = await adminAuthService.loginAdmin(email, password);
    return res.json(result);
}));

// ─── POST /api/admin/auth/setup ───────────────────────────────────────────────

router.post('/setup', asyncHandler(async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) {
        return res.status(400).json(formatError('VALIDATION_ERROR', 'Token and password are required.'));
    }

    if (password !== confirmPassword) {
        return res.status(400).json(formatError('VALIDATION_ERROR', 'Passwords do not match.'));
    }

    await adminAuthService.completeAdminSetup(token, password);
    return res.json({ success: true });
}));

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

/**
 * GET /api/admin/auth/google
 * Initiates Google OAuth2 login flow.
 */
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
    })
);

/**
 * GET /api/admin/auth/google/callback
 * Google redirects here after user consents.
 * On success → redirect to /admin/oauth/callback?token=JWT
 * On failure → redirect to /admin/login?error=...
 */
router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${FRONTEND_URL}/admin/login?error=google_auth_failed`,
    }),
    (req, res) => {
        // req.user is set by the passport strategy to { token, admin }
        const { token, admin } = req.user;

        // Pass token + user info to frontend via query params (short-lived, over HTTPS in prod)
        const params = new URLSearchParams({
            token,
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            ...(admin.company_name ? { companyName: admin.company_name } : {}),
        });

        return res.redirect(`${FRONTEND_URL}/admin/oauth/callback?${params.toString()}`);
    }
);

module.exports = router;
