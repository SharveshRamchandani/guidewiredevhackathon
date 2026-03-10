/**
 * Super Admin Routes
 * Prefix: /api/super-admin
 * All routes protected by requireSuperAdmin middleware.
 * Staff management + platform stats + audit log.
 */
const router = require('express').Router();
const adminAuthService = require('../services/adminAuthService');
const { requireSuperAdmin } = require('../middleware/authMiddleware');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Apply super admin auth to ALL routes in this file
router.use(requireSuperAdmin);

// ─── POST /api/super-admin/staff/create ───────────────────────────────────────

router.post('/staff/create', asyncHandler(async (req, res) => {
    const { name, email, jobTitle } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'name and email are required.' }
        });
    }

    const result = await adminAuthService.createAdmin(
        { name, email, jobTitle },
        req.admin.id
    );

    return res.status(201).json(result);
}));

// ─── GET /api/super-admin/staff ───────────────────────────────────────────────

router.get('/staff', asyncHandler(async (req, res) => {
    const staff = await adminAuthService.listStaff();
    return res.json({ staff });
}));

// ─── PATCH /api/super-admin/staff/:id/deactivate ──────────────────────────────

router.patch('/staff/:id/deactivate', asyncHandler(async (req, res) => {
    const result = await adminAuthService.deactivateStaff(
        req.params.id,
        req.admin.id,
        req.admin.role,
        req.ip
    );
    return res.json(result);
}));

// ─── PATCH /api/super-admin/staff/:id/reactivate ──────────────────────────────

router.patch('/staff/:id/reactivate', asyncHandler(async (req, res) => {
    const result = await adminAuthService.reactivateStaff(
        req.params.id,
        req.admin.id,
        req.ip
    );
    return res.json(result);
}));

// ─── GET /api/super-admin/dashboard/stats ─────────────────────────────────────

router.get('/dashboard/stats', asyncHandler(async (req, res) => {
    const stats = await adminAuthService.getPlatformStats();
    return res.json({ stats });
}));

// ─── GET /api/super-admin/audit-log ───────────────────────────────────────────

router.get('/audit-log', asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, adminId, action, from, to } = req.query;
    const result = await adminAuthService.getAuditLog({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 200),
        adminId: adminId || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
    });
    return res.json(result);
}));

// ─── Legacy endpoints — backward compat aliases ───────────────────────────────

// Old: /api/super-admin/admins/create → new: /staff/create
router.post('/admins/create', asyncHandler(async (req, res) => {
    const { name, email, jobTitle } = req.body;
    if (!name || !email) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'name and email are required.' }
        });
    }
    const result = await adminAuthService.createAdmin({ name, email, jobTitle }, req.admin.id);
    return res.status(201).json(result);
}));

// Old: /api/super-admin/admins → new: /staff
router.get('/admins', asyncHandler(async (req, res) => {
    const staff = await adminAuthService.listStaff();
    return res.json({ admins: staff }); // keep old key for backward compat
}));

// Old: /api/super-admin/admins/:id/deactivate → new: /staff/:id/deactivate
router.patch('/admins/:id/deactivate', asyncHandler(async (req, res) => {
    const result = await adminAuthService.deactivateStaff(req.params.id, req.admin.id, req.admin.role, req.ip);
    return res.json(result);
}));

module.exports = router;
