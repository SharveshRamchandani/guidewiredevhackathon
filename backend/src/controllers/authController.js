const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const result = await authService.registerWorker(req.body);
    res.status(201).json({ success: true, message: 'Registered successfully.', data: result });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginWorker(req.body);
    res.json({ success: true, message: 'Login successful.', data: result });
  } catch (e) { next(e); }
}

async function me(req, res, next) {
  try {
    const worker = await authService.getWorkerProfile(req.user.id);
    res.json({ success: true, data: worker });
  } catch (e) { next(e); }
}

async function logout(req, res, next) {
  try {
    await authService.logoutWorker(req.token, req.user.id);
    res.json({ success: true, message: 'Logged out.' });
  } catch (e) { next(e); }
}

module.exports = { register, login, me, logout };
