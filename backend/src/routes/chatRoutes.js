const router = require('express').Router();
const chatController = require('../controllers/chatController');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/message', asyncHandler(chatController.sendMessage));

module.exports = router;
