const signAndSetCookie = (res, userId, role) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  res.cookie('uniswap_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
};

module.exports = { signAndSetCookie };
