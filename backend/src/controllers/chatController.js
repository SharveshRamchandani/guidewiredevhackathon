const chatService = require('../services/chatService');

async function sendMessage(req, res, next) {
  try {
    const result = await chatService.sendChatMessage({
      message: req.body?.message,
      context: req.body?.context || {},
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendMessage,
};
