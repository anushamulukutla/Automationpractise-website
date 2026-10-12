'use strict';
// Minimal HS256 JWT (no external dependency). Fine for a practice app, not for production.
const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'qa-practice-app-secret';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function sign(payload, expiresInSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  return `${header}.${body}.${hmac(`${header}.${body}`)}`;
}

/** Returns the payload, or throws an Error whose .code is 'invalid' or 'expired'. */
function verify(token) {
  const fail = (code) => Object.assign(new Error(`Token ${code}`), { code });
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw fail('invalid');
  const expected = Buffer.from(hmac(`${parts[0]}.${parts[1]}`));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw fail('invalid');
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch (e) {
    throw fail('invalid');
  }
  if (payload.exp <= Math.floor(Date.now() / 1000)) throw fail('expired');
  return payload;
}

module.exports = { sign, verify };
