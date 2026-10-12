'use strict';
const express = require('express');
const { state, reset } = require('../state');

const router = express.Router();

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

router.get('/settings', (req, res) => res.json(state.settings));

// Partial update: only the supplied keys change.
function updateSettings(req, res) {
  const body = req.body || {};
  const next = { ...state.settings };
  for (const key of ['slowNetwork', 'flakyMode', 'randomizeIds']) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') return res.status(400).json({ error: `${key} must be a boolean` });
      next[key] = body[key];
    }
  }
  if (body.slowNetworkMs !== undefined) {
    const n = Number(body.slowNetworkMs);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'slowNetworkMs must be a number' });
    next.slowNetworkMs = clamp(Math.round(n), 0, 10000);
  }
  if (body.flakyRate !== undefined) {
    const n = Number(body.flakyRate);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'flakyRate must be a number between 0 and 1' });
    next.flakyRate = clamp(n, 0, 1);
  }
  state.settings = next;
  res.json(state.settings);
}
router.put('/settings', updateSettings);
router.patch('/settings', updateSettings);

// Restore the clean seeded state. Pass ?keepSettings=true to leave the global toggles alone.
router.post('/reset', (req, res) => {
  reset({ keepSettings: req.query.keepSettings === 'true' });
  res.json({
    status: 'reset',
    counts: {
      users: state.users.length,
      products: state.products.length,
      orders: state.orders.length,
      addresses: state.addresses.length,
    },
    settings: state.settings,
  });
});

module.exports = router;
