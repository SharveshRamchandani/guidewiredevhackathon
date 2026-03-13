/**
 * Worker Auth Routes
 * Prefix: /api/auth
 * No registration code — workers register directly with GigShield.
 */
const router = require('express').Router();
const workerAuthService = require('../services/workerAuthService');
const { requireRegistrationToken } = require('../middleware/authMiddleware');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function formatError(code, message, retryAfter) {
    const error = { code, message };
    if (retryAfter !== undefined) error.retryAfter = retryAfter;
    return { error };
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────

router.post('/send-otp', otpSendLimiter, asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json(formatError('INVALID_PHONE', 'Phone number is required.'));
    }

    const result = await workerAuthService.initiateWorkerLogin(phone);

    if (!result.success) {
        return res.status(429).json(formatError(
            result.reason,
            `Please wait ${result.remainingCooldown}s before requesting a new OTP.`,
            result.remainingCooldown
        ));
    }

    const response = { success: true, expiresIn: result.expiresIn };

    // Dev mode: include OTP in response for easy testing
    if (process.env.NODE_ENV !== 'production' && result.otp) {
        response.otp = result.otp;
    }

    return res.json(response);
}));

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────

router.post('/verify-otp', otpVerifyLimiter, asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json(formatError('INVALID_PHONE', 'Phone and OTP are required.'));
    }

    const result = await workerAuthService.verifyWorkerOTP(phone, otp.toString());

    return res.json(result);
}));

// ─── POST /api/auth/register/complete ─────────────────────────────────────────
// Protected by registration token middleware

router.post('/register/complete', requireRegistrationToken, asyncHandler(async (req, res) => {
    const { name, platform, city, zoneId, avgWeeklyEarning, aadhaarLast4, upiId, planId } = req.body;

    // Validate required fields — no registrationCode
    const missing = ['name', 'platform', 'city', 'aadhaarLast4', 'upiId']
        .filter(f => !req.body[f]);

    if (missing.length) {
        return res.status(400).json(
            formatError('VALIDATION_ERROR', `Missing required fields: ${missing.join(', ')}`)
        );
    }

    const result = await workerAuthService.completeWorkerRegistration(
        req.headers.authorization.split(' ')[1],
        { name, platform, city, zoneId, avgWeeklyEarning, aadhaarLast4, upiId, planId }
    );

    return res.status(201).json(result);
}));

module.exports = router;
