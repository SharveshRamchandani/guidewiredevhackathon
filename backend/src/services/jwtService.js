/**
 * JWT Service
 * Typed token generation and verification.
 * Handles worker, admin, super_admin, and pending_registration tokens.
 */
const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';
const REGISTRATION_TOKEN_EXPIRY = '30m';

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
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: expiresIn || DEFAULT_EXPIRY }
    );
}

/**
 * Generate worker access token.
 */
function generateWorkerToken(worker) {
    return generateToken({
        id: worker.id,
        phone: worker.phone,
        adminId: worker.admin_id || worker.adminId,
        role: 'worker',
    });
}

/**
 * Generate admin/super_admin access token.
 */
function generateAdminToken(admin) {
    return generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role, // 'admin' | 'super_admin'
        companyName: admin.company_name || admin.companyName,
    });
}

/**
 * Generate registration token (phone verified but not yet registered).
 */
function generateRegistrationToken(phone, adminId) {
    return generateToken(
        {
            phone,
            adminId: adminId || null,
            role: 'pending_registration',
        },
        REGISTRATION_TOKEN_EXPIRY
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
