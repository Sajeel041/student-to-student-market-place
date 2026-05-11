const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAndSetCookie } = require('../utils/helpers');

/** Promote to admin when email matches ADMIN_EMAIL (fixes older accounts created as user). */
async function syncAdminRoleIfNeeded(user) {
  if (!user) return user;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();
  if (!adminEmail) return user;
  if (user.email === adminEmail && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  return user;
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { email, password, name, dept, batch } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const emailLower = email.trim().toLowerCase();
    const gikiPattern = /^u\d{4}\d{3,5}@giki\.edu\.pk$/i;
    if (!gikiPattern.test(emailLower)) {
      return res.status(400).json({
        message: 'Only @giki.edu.pk emails are accepted (format: u2023633@giki.edu.pk)',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role = emailLower === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user';

    const user = await User.create({
      email: emailLower,
      passwordHash,
      name: name.trim(),
      dept: dept || 'Other',
      batch: batch || '',
      role,
    });

    signAndSetCookie(res, user._id, user.role);

    return res.status(201).json(user.toPublic());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    console.error('register error', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email' });
    }

    if (user.banned) {
      return res.status(403).json({ message: 'This account has been suspended' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    await syncAdminRoleIfNeeded(user);
    signAndSetCookie(res, user._id, user.role);
    return res.json(user.toPublic());
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('uniswap_token');
  return res.status(204).end();
};

// GET /api/auth/check-email?email=...
// Lightweight existence lookup used by the registration form so we can warn
// the user *while they type* if their email is already taken. Returns
// `{ exists: boolean }`. Never returns user data.
const checkEmail = async (req, res) => {
  try {
    const email = (req.query.email || '').toString().trim().toLowerCase();
    if (!email) return res.json({ exists: false });
    const gikiPattern = /^u\d{4}\d{3,5}@giki\.edu\.pk$/i;
    if (!gikiPattern.test(email)) {
      return res.json({ exists: false, invalid: true });
    }
    const found = await User.exists({ email });
    return res.json({ exists: !!found });
  } catch (err) {
    console.error('checkEmail error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -__v')
      .populate('savedListings', '_id title price photos status');
    await syncAdminRoleIfNeeded(user);
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, logout, me, checkEmail };
