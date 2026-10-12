'use strict';
/**
 * Data for the Dynamic Elements and Tables pages.
 *   GET /api/dynamic/items?page=1&size=10     infinite scroll (50 items total, 500 ms latency)
 *   GET /api/dynamic/people?delay=2000        small table that arrives after a delay
 *   GET /api/table-data                       120 deterministic rows for the Tables page
 */
const express = require('express');
const { faker } = require('@faker-js/faker');

const router = express.Router();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

router.get('/dynamic/items', async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const size = Math.min(Math.max(Number(req.query.size) || 10, 1), 25);
  const TOTAL = 50;
  await wait(500);
  const start = (page - 1) * size;
  const items = Array.from({ length: Math.max(Math.min(size, TOTAL - start), 0) }, (_, i) => ({ id: start + i + 1, title: `Item ${start + i + 1}` }));
  res.json({ items, page, hasMore: start + items.length < TOTAL, total: TOTAL });
});

router.get('/dynamic/people', async (req, res) => {
  await wait(Math.min(Math.max(Number(req.query.delay) || 2000, 0), 10000));
  res.json([
    { id: 1, name: 'Ada Lovelace', role: 'Mathematician' },
    { id: 2, name: 'Alan Turing', role: 'Computer scientist' },
    { id: 3, name: 'Grace Hopper', role: 'Rear admiral' },
    { id: 4, name: 'Margaret Hamilton', role: 'Software engineer' },
  ]);
});

let tableRows;
router.get('/table-data', (req, res) => {
  if (!tableRows) {
    faker.seed(777);
    const depts = ['Engineering', 'Sales', 'Support', 'Marketing', 'Finance'];
    const statuses = ['Active', 'Inactive', 'Pending'];
    tableRows = Array.from({ length: 120 }, (_, i) => ({
      id: i + 1,
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      department: depts[i % depts.length],
      status: statuses[(i * 7) % statuses.length],
      salary: faker.number.int({ min: 40, max: 160 }) * 1000,
      joined: faker.date.between({ from: '2018-01-01', to: '2025-12-31' }).toISOString().slice(0, 10),
      notes: faker.lorem.sentence(),
    }));
    faker.seed();
  }
  res.json(tableRows);
});

module.exports = router;
