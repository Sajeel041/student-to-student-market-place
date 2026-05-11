const express = require('express');
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const { register, login, logout, me, checkEmail } = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many attempts. Please wait 15 minutes.' },
});

// Email-existence lookup gets its own (more generous) limiter — it runs while
// the user is typing on the register screen so we want hundreds per window.
const checkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);
router.get('/check-email', checkLimiter, checkEmail);

module.exports = router;
