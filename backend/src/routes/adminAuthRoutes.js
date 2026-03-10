/**
 * Admin Auth Routes
 * Prefix: /api/admin/auth
 * Shared by 'admin' and 'super_admin' roles.
 */
const router = require('express').Router();
const passport = require('passport');
const adminAuthService = require('../services/adminAuthService');
const { adminLoginLimiter } = require('../middleware/rateLimiter');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function formatError(code, message, retryAfter) {
    const error = { code, message };
    if (retryAfter !== undefined) error.retryAfter = retryAfter;
    return { error };
}

// ─── POST /api/admin/auth/login ───────────────────────────────────────────────

router.post('/login', adminLoginLimiter, asyncHandler(async (req, res) => {
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

// ─── GET /api/admin/auth/google ───────────────────────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/admin/login?error=google_failed' }),
    (req, res) => {
        if (!req.user || !req.user.token) {
            return res.redirect('/admin/login?error=google_failed');
        }

        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Only pass the JWT token — frontend decodes admin info from the payload directly.
        // This avoids URL truncation issues from embedding large JSON admin objects in the URL.
        const redirectUrl = `${FRONTEND_URL}/admin/oauth/callback?token=${encodeURIComponent(req.user.token)}`;
        res.redirect(redirectUrl);
    }
);

module.exports = router;
