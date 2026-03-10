/**
 * Super Admin Routes
 * Prefix: /api/super-admin
 * All routes protected by requireSuperAdmin middleware
 */
const router = require('express').Router();
const adminAuthService = require('../services/adminAuthService');
const { requireSuperAdmin } = require('../middleware/authMiddleware');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Apply super admin auth to ALL routes in this file
router.use(requireSuperAdmin);

// ─── POST /api/super-admin/admins/create ──────────────────────────────────────

router.post('/admins/create', asyncHandler(async (req, res) => {
    const { name, email, companyName, companyRegNumber } = req.body;

    if (!name || !email || !companyName) {
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'name, email, and companyName are required.' }
        });
    }

    const result = await adminAuthService.createAdmin(
        { name, email, companyName, companyRegNumber },
        req.admin.id
    );

    return res.status(201).json(result);
}));

// ─── GET /api/super-admin/admins ──────────────────────────────────────────────

router.get('/admins', asyncHandler(async (req, res) => {
    const admins = await adminAuthService.listAdmins();
    return res.json({ admins });
}));

// ─── PATCH /api/super-admin/admins/:id/deactivate ─────────────────────────────

router.patch('/admins/:id/deactivate', asyncHandler(async (req, res) => {
    const admin = await adminAuthService.deactivateAdmin(
        req.params.id,
        req.admin.id,
        req.ip
    );
    return res.json({ success: true, admin });
}));

// ─── GET /api/super-admin/dashboard/stats ─────────────────────────────────────

router.get('/dashboard/stats', asyncHandler(async (req, res) => {
    const stats = await adminAuthService.getPlatformStats();
    return res.json({ stats });
}));

module.exports = router;
