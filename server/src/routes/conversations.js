const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  listConversations,
  startConversation,
  getConversation,
  listMessages,
  sendMessage,
} = require('../controllers/conversationsController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listConversations);
router.post('/', startConversation);
router.get('/:id/messages', listMessages);
router.post('/:id/messages', sendMessage);
router.get('/:id', getConversation);

module.exports = router;
