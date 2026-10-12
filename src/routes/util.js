'use strict';
/**
 * Resilience helpers, mounted both at /api/... and at the root (so /slow and /flaky work as written in the brief).
 *   GET /slow?ms=3000     responds after a delay (max 30 s)
 *   GET /flaky?rate=0.5   fails with 500 at the given rate (default 0.5), otherwise 200
 *   GET /status/:code     responds with that HTTP status (100..599)
 */
const express = require('express');
const router = express.Router();

router.get('/slow', (req, res) => {
  const ms = Number(req.query.ms ?? 3000);
  if (!Number.isFinite(ms) || ms < 0 || ms > 30000) return res.status(400).json({ error: 'ms must be a number between 0 and 30000' });
  setTimeout(() => res.json({ delayedMs: ms, message: 'Slow response complete' }), ms);
});

router.get('/flaky', (req, res) => {
  const rate = Number(req.query.rate ?? 0.5);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return res.status(400).json({ error: 'rate must be between 0 and 1' });
  if (Math.random() < rate) return res.status(500).json({ error: 'Random failure from /flaky', retryable: true });
  res.json({ ok: true, message: 'Succeeded this time' });
});

router.get('/status/:code', (req, res) => {
  const code = Number(req.params.code);
  if (!Number.isInteger(code) || code < 200 || code > 599) return res.status(400).json({ error: 'code must be an integer between 200 and 599' });
  if (code === 204 || code === 304) return res.status(code).end();
  res.status(code).json({ status: code });
});

module.exports = router;
