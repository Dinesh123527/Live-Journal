const { verifyAccessToken } = require('../utils/token');
const db = require('../db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = verifyAccessToken(token);
    const jti = payload.jti;

    if (jti) {
      try {
        const [rows] = await db.query(
          'SELECT id FROM revoked_tokens WHERE jti = ? AND (expires_at IS NULL OR expires_at > NOW())',
          [jti]
        );
        if (rows.length) {
          return res.status(401).json({ error: 'Token revoked' });
        }
      } catch (dbErr) {
        console.error('revoked token check failed', dbErr);
      }
    }

    req.user = { id: payload.userId };
    return next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

module.exports = authenticateToken;