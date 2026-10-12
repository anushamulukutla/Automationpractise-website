'use strict';
const express = require('express');
const { GEO, AUTOCOMPLETE_NAMES } = require('../data/geo');

const router = express.Router();

router.get('/countries', (req, res) => {
  res.json(Object.entries(GEO).map(([code, c]) => ({ code, name: c.name })));
});

router.get('/countries/:country/states', (req, res) => {
  const country = GEO[req.params.country.toUpperCase()];
  if (!country) return res.status(404).json({ error: 'Country not found' });
  res.json(Object.entries(country.states).map(([code, s]) => ({ code, name: s.name })));
});

router.get('/countries/:country/states/:state/cities', (req, res) => {
  const country = GEO[req.params.country.toUpperCase()];
  const state = country && country.states[req.params.state.toUpperCase()];
  if (!state) return res.status(404).json({ error: 'State not found' });
  res.json(state.cities.map((name) => ({ name })));
});

// Typeahead: names starting with q rank first, then names containing q.
router.get('/autocomplete', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const limit = Math.min(Number(req.query.limit) || 8, 20);
  if (!q) return res.json([]);
  const starts = AUTOCOMPLETE_NAMES.filter((n) => n.toLowerCase().startsWith(q));
  const contains = AUTOCOMPLETE_NAMES.filter((n) => !n.toLowerCase().startsWith(q) && n.toLowerCase().includes(q));
  res.json([...starts, ...contains].slice(0, limit));
});

// Options that only arrive after a delay (default 3s, max 10s).
router.get('/delayed-options', (req, res) => {
  const ms = Math.min(Math.max(Number(req.query.ms) || 3000, 0), 10000);
  const options = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map((label) => ({
    value: label.toLowerCase(),
    label,
  }));
  setTimeout(() => res.json(options), ms);
});

module.exports = router;
