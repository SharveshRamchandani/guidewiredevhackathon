/**
 * JWT Service
 * Typed token generation and verification.
 * Handles worker, admin, super_admin, and pending_registration tokens.
 */
const jwt = require('jsonwebtoken');

// ─── AppError ─────────────────────────────────────────────────────────────────
// Inline here to avoid circular import; also exported from errorHandler
class AppError extends Error {
    constructor(code, message, statusCode, retryAfter) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.retryAfter = retryAfter;
    }
}

// ─── Token generation ─────────────────────────────────────────────────────────

/**
 * Generate JWT for any role payload.
 * @param {object} payload - Role-typed payload
 * @param {string} expiresIn - Optional override e.g. '30m'
 */
function generateToken(payload, expiresIn) {
    const defaultExpiry = process.env.JWT_EXPIRES_IN || '24h';
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: expiresIn || defaultExpiry }
    );
}

/**
 * Generate worker access token.
 * Payload: { id, phone, role: 'worker' }
 * No adminId — workers belong to GigShield directly.
 */
function generateWorkerToken(worker) {
    return generateToken({
        id: worker.id,
        phone: worker.phone,
        role: 'worker',
    }, process.env.JWT_EXPIRES_IN || '24h');
}

/**
 * Generate admin/super_admin access token.
 * Payload: { id, email, role, jobTitle }
 */
function generateAdminToken(admin) {
    return generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role, // 'admin' | 'super_admin'
        jobTitle: admin.job_title || admin.jobTitle || undefined,
    }, process.env.JWT_ADMIN_EXPIRES_IN || '8h');
}

/**
 * Generate registration token (phone verified but not yet registered).
 * Payload: { phone, role: 'pending_registration' }
 */
function generateRegistrationToken(phone) {
    return generateToken(
        {
            phone,
            role: 'pending_registration',
        },
        process.env.JWT_REGISTRATION_EXPIRES_IN || '30m'
    );
}

// ─── Token verification ───────────────────────────────────────────────────────

/**
 * Verify and decode a JWT.
 * Throws AppError on expiry or invalidity.
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new AppError('TOKEN_EXPIRED', 'Your session has expired. Please login again.', 401);
        }
        throw new AppError('TOKEN_INVALID', 'Invalid authentication token.', 401);
    }
}

module.exports = {
    generateToken,
    generateWorkerToken,
    generateAdminToken,
    generateRegistrationToken,
    verifyToken,
    AppError,
};
