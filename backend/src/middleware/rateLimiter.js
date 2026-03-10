/**
 * Rate Limiter Middleware
 * Uses express-rate-limit with in-memory store (Redis store can be added).
 * All responses follow the standard GigShield error format.
 */
const rateLimit = require('express-rate-limit');

// ─── Standard error response handler ─────────────────────────────────────────

function rateLimitHandler(req, res) {
    const retryAfter = Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 60;
    return res.status(429).json({
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
            retryAfter,
        },
    });
}

// ─── Limiter factory ─────────────────────────────────────────────────────────

function createLimiter(windowMs, max, message) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: rateLimitHandler,
        skip: () => process.env.NODE_ENV === 'test', // Skip in test env
    });
}

// ─── Named limiters ───────────────────────────────────────────────────────────

/** Global limiter: 200 req / 1 min / IP */
const globalLimiter = createLimiter(
    1 * 60 * 1000,   // 1 minute
    200,
    'Too many requests from this IP'
);

/** OTP send: 5 req / 10 min / IP */
const otpSendLimiter = createLimiter(
    10 * 60 * 1000,  // 10 minutes
    5,
    'Too many OTP requests. Please wait before requesting another.'
);

/** OTP verify: 10 req / 10 min / IP */
const otpVerifyLimiter = createLimiter(
    10 * 60 * 1000,  // 10 minutes
    10,
    'Too many verification attempts.'
);

/** Admin login: 5 req / 10 min / IP */
const adminLoginLimiter = createLimiter(
    10 * 60 * 1000,
    5,
    'Too many login attempts. Please try again later.'
);

/** Admin create: 10 req / 1 hour */
const adminCreateLimiter = createLimiter(
    60 * 60 * 1000,  // 1 hour
    10,
    'Too many admin creation requests.'
);

/** Cron config: 5 req / 1 hour */
const cronConfigLimiter = createLimiter(
    60 * 60 * 1000,
    5,
    'Too many cron configuration requests.'
);

module.exports = {
    globalLimiter,
    otpSendLimiter,
    otpVerifyLimiter,
    adminLoginLimiter,
    adminCreateLimiter,
    cronConfigLimiter,
};
