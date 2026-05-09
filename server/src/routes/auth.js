const express = require('express');
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/auth');
const { register, login, logout, me } = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many attempts. Please wait 15 minutes.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

module.exports = router;
