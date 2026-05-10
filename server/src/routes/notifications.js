const express = require('express');
const verifyToken = require('../middleware/auth');
const {
  listNotifications,
  getUnreadCount,
  markRead,
} = require('../controllers/notificationsController');

const router = express.Router();

router.use(verifyToken);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/mark-read', markRead);

module.exports = router;

