/**
 * Auth Middleware (New — GigShield Role-Based)
 * Handles: worker, registration, admin, super_admin, tenant scoping
 */
const jwtService = require('../services/jwtService');
const { AppError } = require('../services/jwtService');
const { query } = require('../config/db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractToken(req) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.split(' ')[1];
}

function sendUnauthorized(res, code, message) {
    return res.status(401).json({
        error: { code: code || 'UNAUTHORIZED', message: message || 'Authentication required.' }
    });
}

function sendForbidden(res, code, message) {
    return res.status(403).json({
        error: { code: code || 'FORBIDDEN', message: message || 'Access denied.' }
    });
}

// ─── requireWorkerAuth ─────────────────────────────────────────────────────────
// Validates worker JWT and checks active status in DB on every request.

async function requireWorkerAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) return sendUnauthorized(res);

        let decoded;
        try {
            decoded = jwtService.verifyToken(token);
        } catch (err) {
            return res.status(401).json({
                error: { code: err.code || 'TOKEN_INVALID', message: err.message }
            });
        }

        if (decoded.role !== 'worker') {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Worker token required.');
        }

        // Check active status in DB on every request (not just token validity)
        const { rows } = await query(
            'SELECT id, phone, admin_id, is_active, name FROM workers WHERE id = $1',
            [decoded.id]
        );

        if (!rows.length) {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Worker account not found.');
        }

        if (!rows[0].is_active) {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Your account has been deactivated.');
        }

        req.worker = {
            id: rows[0].id,
            phone: rows[0].phone,
            adminId: rows[0].admin_id,
            name: rows[0].name,
            role: 'worker',
        };

        next();
    } catch (err) {
        next(err);
    }
}

// ─── requireRegistrationToken ─────────────────────────────────────────────────
// Validates pending_registration token (Step 2 of worker onboarding).

async function requireRegistrationToken(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) return sendUnauthorized(res);

        let decoded;
        try {
            decoded = jwtService.verifyToken(token);
        } catch (err) {
            return res.status(401).json({
                error: { code: err.code || 'TOKEN_INVALID', message: err.message }
            });
        }

        if (decoded.role !== 'pending_registration') {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Registration token required.');
        }

        req.registration = {
            phone: decoded.phone,
            adminId: decoded.adminId || null,
        };

        next();
    } catch (err) {
        next(err);
    }
}

// ─── requireAdminAuth ─────────────────────────────────────────────────────────
// Validates admin/super_admin JWT and checks active status in DB.

async function requireAdminAuth(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) return sendUnauthorized(res);

        let decoded;
        try {
            decoded = jwtService.verifyToken(token);
        } catch (err) {
            return res.status(401).json({
                error: { code: err.code || 'TOKEN_INVALID', message: err.message }
            });
        }

        if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Admin token required.');
        }

        // Check active status in DB
        const { rows } = await query(
            'SELECT id, name, email, role, company_name, active FROM admin_users WHERE id = $1',
            [decoded.id]
        );

        if (!rows.length) {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Admin account not found.');
        }

        if (!rows[0].active) {
            return sendUnauthorized(res, 'UNAUTHORIZED', 'Admin account has been deactivated.');
        }

        req.admin = {
            id: rows[0].id,
            email: rows[0].email,
            name: rows[0].name,
            role: rows[0].role,
            companyName: rows[0].company_name,
        };

        next();
    } catch (err) {
        next(err);
    }
}

// ─── requireSuperAdmin ─────────────────────────────────────────────────────────
// Extends requireAdminAuth — additionally asserts super_admin role.

async function requireSuperAdmin(req, res, next) {
    await requireAdminAuth(req, res, () => {
        if (req.admin?.role !== 'super_admin') {
            return sendForbidden(res, 'FORBIDDEN', 'Super admin access required.');
        }
        next();
    });
}

// ─── requireTenantScope ────────────────────────────────────────────────────────
// Injects req.tenantId for multi-tenant query filtering.
// super_admin → tenantId = null (can see all)
// admin       → tenantId = req.admin.id (can only see their data)

function requireTenantScope(req, res, next) {
    if (!req.admin) {
        return sendUnauthorized(res, 'UNAUTHORIZED', 'Admin authentication required for tenant-scoped access.');
    }

    req.tenantId = req.admin.role === 'super_admin' ? null : req.admin.id;
    next();
}

module.exports = {
    requireWorkerAuth,
    requireRegistrationToken,
    requireAdminAuth,
    requireSuperAdmin,
    requireTenantScope,
};
