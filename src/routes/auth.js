'use strict';
const express = require('express');
const { state } = require('../state');
const { sign } = require('../jwt');
const { requireAuth } = require('../auth');

const router = express.Router();

const publicUser = ({ password, ...u }) => u;

/**
 * POST /api/auth/login   { username, password, expiresIn? (seconds, 1..86400, default 3600) }
 *   200 { token, tokenType, expiresIn, user }
 *   400 missing fields | 401 wrong credentials | 403 inactive / expired password | 423 locked
 */
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password are required', code: 'missing_fields' });
  const user = state.users.find((u) => u.username === username || u.email === username);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid username or password', code: 'invalid_credentials' });
  if (user.status === 'locked') return res.status(423).json({ error: 'Account is locked', code: 'account_locked' });
  if (user.status === 'inactive') return res.status(403).json({ error: 'Account is inactive', code: 'account_inactive' });
  if (user.status === 'expired-password') return res.status(403).json({ error: 'Password has expired', code: 'password_expired' });

  const expiresIn = Math.min(Math.max(Math.round(Number(req.body.expiresIn)) || 3600, 1), 86400);
  const token = sign({ sub: user.id, username: user.username, role: user.role }, expiresIn);
  res.json({ token, tokenType: 'Bearer', expiresIn, user: publicUser(user) });
});

/**
 * POST /api/register  { fullName, email, password, phone?, ... }  (used by the Forms page)
 *   201 created | 400 validation errors | 409 email already registered (try admin@example.com)
 */
router.post('/register', (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!b.fullName || String(b.fullName).trim().length < 2) errors.fullName = 'Full name must be at least 2 characters';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email || '')) errors.email = 'Enter a valid email address';
  if (!b.password || b.password.length < 8 || !/[A-Z]/.test(b.password) || !/[0-9]/.test(b.password)) errors.password = 'Password needs 8+ characters, an uppercase letter and a number';
  if (b.phone && !/^\+?[0-9\-\s()]{7,15}$/.test(b.phone)) errors.phone = 'Enter a valid phone number';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', errors });
  if (state.users.some((u) => u.email.toLowerCase() === b.email.toLowerCase())) return res.status(409).json({ error: 'Email is already registered', errors: { email: 'Email is already registered' } });
  const { nextId } = require('../state');
  const [firstName, ...rest] = String(b.fullName).trim().split(/\s+/);
  const user = { id: nextId('users'), username: b.email.split('@')[0], email: b.email, password: b.password, firstName, lastName: rest.join(' '), role: 'user', status: 'active', phone: b.phone || '' };
  state.users.push(user);
  res.status(201).json({ message: 'Registration successful', user: publicUser(user) });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const user = state.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: 'User no longer exists', code: 'invalid_token' });
  res.json({ user: publicUser(user), tokenExpiresAt: new Date(req.user.exp * 1000).toISOString() });
});

module.exports = router;
