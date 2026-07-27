const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Purge expired entries from the blacklist every 5 minutes.
 */
setInterval(async () => {
  try {
    await pool.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
  } catch (err) {
    console.error('Failed to purge revoked tokens:', err.message);
  }
}, 5 * 60 * 1000);

/**
 * Add a token to the blacklist so it is rejected on future requests.
 * @param {string} jti  - JWT ID claim
 * @param {number} exp  - Token expiry as unix timestamp (seconds)
 */
const blacklistToken = async (jti, exp) => {
  if (jti && exp) {
    // exp is in seconds, postgres needs it in milliseconds or timestamp
    const expiresAt = new Date(exp * 1000);
    await pool.query(
      'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [jti, expiresAt]
    );
  }
};

/**
 * Authentication middleware.
 * Validates the Bearer JWT, checks the blacklist, and attaches `req.user`.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.jti) {
      const result = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1', [decoded.jti]);
      if (result.rowCount > 0) {
        return res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token has expired. Please log in again.'
        : 'Invalid or malformed token.';
    return res.status(401).json({ message });
  }
};

module.exports = { authenticate, blacklistToken };
