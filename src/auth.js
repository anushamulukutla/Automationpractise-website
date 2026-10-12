'use strict';
const { verify } = require('./jwt');

/** Express middleware: requires "Authorization: Bearer <jwt>". Sets req.user = { sub, username, role }. */
function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: 'Missing or malformed Authorization header', code: 'missing_token' });
  }
  try {
    req.user = verify(m[1]);
    next();
  } catch (e) {
    res.set('WWW-Authenticate', `Bearer error="invalid_token"`);
    res.status(401).json({ error: e.code === 'expired' ? 'Token expired' : 'Invalid token', code: e.code === 'expired' ? 'token_expired' : 'invalid_token' });
  }
}

const requireAdmin = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin role required', code: 'forbidden' });

module.exports = { requireAuth, requireAdmin };
