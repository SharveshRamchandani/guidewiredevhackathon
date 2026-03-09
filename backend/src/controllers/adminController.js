const adminService  = require('../services/adminService');
const claimsService = require('../services/claimsService');
const authService   = require('../services/authService');

const ok  = (res, data, msg = 'Success', code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
const err = (next, e) => next(e);

// Auth
async function login(req, res, next) {
  try { ok(res, await authService.loginAdmin(req.body), 'Admin login successful'); }
  catch (e) { err(next, e); }
}

async function logout(req, res, next) {
  try {
    await authService.logoutAdmin(req.token, req.user.id);
    ok(res, null, 'Logged out');
  } catch (e) { err(next, e); }
}

// Dashboard
async function dashboard(req, res, next) {
  try { ok(res, await adminService.getDashboardKpis()); }
  catch (e) { err(next, e); }
}

// Workers
async function getWorkers(req, res, next) {
  try { ok(res, await adminService.listWorkers(req.query)); }
  catch (e) { err(next, e); }
}

async function updateKyc(req, res, next) {
  try { ok(res, await adminService.updateWorkerKyc(req.params.id, req.body.kyc_status, req.user.id)); }
  catch (e) { err(next, e); }
}

// Policies
async function getPolicies(req, res, next) {
  try { ok(res, await adminService.listAllPolicies(req.query)); }
  catch (e) { err(next, e); }
}

// Claims
async function getClaims(req, res, next) {
  try { ok(res, await adminService.listAllClaims(req.query)); }
  catch (e) { err(next, e); }
}

async function approveClaim(req, res, next) {
  try { ok(res, await claimsService.approveClaim(req.params.id, req.user.id), 'Claim approved'); }
  catch (e) { err(next, e); }
}

async function rejectClaim(req, res, next) {
  try { ok(res, await claimsService.rejectClaim(req.params.id, req.body.reason, req.user.id), 'Claim rejected'); }
  catch (e) { err(next, e); }
}

// Events
async function getEvents(req, res, next) {
  try { ok(res, await adminService.listDisruptionEvents(req.query)); }
  catch (e) { err(next, e); }
}

// Analytics
async function getAnalytics(req, res, next) {
  try { ok(res, await adminService.getAnalytics()); }
  catch (e) { err(next, e); }
}

// System config
async function getConfig(req, res, next) {
  try { ok(res, await adminService.getSystemConfig()); }
  catch (e) { err(next, e); }
}

async function updateConfig(req, res, next) {
  try { ok(res, await adminService.updateSystemConfig(req.body, req.user.id), 'Config updated'); }
  catch (e) { err(next, e); }
}

module.exports = {
  login, logout, dashboard,
  getWorkers, updateKyc,
  getPolicies, getClaims, approveClaim, rejectClaim,
  getEvents, getAnalytics, getConfig, updateConfig,
};
