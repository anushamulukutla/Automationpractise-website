'use strict';
const express = require('express');
const { ZipArchive } = require('archiver');
const { faker } = require('@faker-js/faker');
const { state, nextId } = require('../state');
const { SEED_CREDENTIALS, USER_STATUSES } = require('../seed');
const { toCsv, parseCsvObjects } = require('../csv');

const router = express.Router();

const TYPES = {
  users: { collection: 'users', columns: ['id', 'username', 'email', 'password', 'firstName', 'lastName', 'role', 'status', 'phone'] },
  products: { collection: 'products', columns: ['id', 'name', 'category', 'price', 'stock', 'sku'] },
  addresses: { collection: 'addresses', columns: ['id', 'street', 'city', 'state', 'zip', 'country'] },
};

function makeUser() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    username: `${firstName}.${lastName}${faker.number.int({ min: 1, max: 999 })}`.toLowerCase(),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    firstName,
    lastName,
    role: faker.helpers.weightedArrayElement([{ weight: 9, value: 'user' }, { weight: 1, value: 'admin' }]),
    status: faker.helpers.weightedArrayElement([
      { weight: 8, value: 'active' },
      { weight: 1, value: 'locked' },
      { weight: 1, value: 'inactive' },
    ]),
    phone: faker.phone.number(),
  };
}

function makeProduct() {
  return {
    name: faker.commerce.productName(),
    category: faker.commerce.department(),
    price: Number(faker.commerce.price({ min: 5, max: 500 })),
    stock: faker.number.int({ min: 0, max: 200 }),
    sku: faker.string.alphanumeric(8).toUpperCase(),
  };
}

function makeAddress() {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  };
}

const MAKERS = { users: makeUser, products: makeProduct, addresses: makeAddress };

router.get('/summary', (req, res) => {
  res.json({
    counts: {
      users: state.users.length,
      products: state.products.length,
      orders: state.orders.length,
      addresses: state.addresses.length,
    },
    seedUsers: SEED_CREDENTIALS,
  });
});

// Body: { type: users|products|addresses, count: 1..500, persist?: boolean (default true) }
router.post('/generate', (req, res) => {
  const { type, count = 10, persist = true } = req.body || {};
  if (!TYPES[type]) return res.status(400).json({ error: `type must be one of: ${Object.keys(TYPES).join(', ')}` });
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 500) return res.status(400).json({ error: 'count must be an integer between 1 and 500' });

  const { collection } = TYPES[type];
  let id = nextId(collection);
  const items = Array.from({ length: n }, () => ({ id: id++, ...MAKERS[type]() }));
  if (persist) state[collection].push(...items);
  res.status(201).json({ type, count: items.length, persisted: Boolean(persist), items });
});

router.get('/export', (req, res) => {
  const type = req.query.type;
  const format = (req.query.format || 'json').toLowerCase();
  if (!TYPES[type]) return res.status(400).json({ error: `type must be one of: ${Object.keys(TYPES).join(', ')}` });
  if (!['json', 'csv'].includes(format)) return res.status(400).json({ error: 'format must be json or csv' });

  const rows = state[TYPES[type].collection];
  res.set('Content-Disposition', `attachment; filename="${type}.${format}"`);
  if (format === 'csv') return res.type('text/csv').send(toCsv(rows, TYPES[type].columns));
  res.type('application/json').send(JSON.stringify(rows, null, 2));
});

// Body: raw CSV text (Content-Type: text/csv). Query: ?type=users|products|addresses
const REQUIRED = { users: ['username', 'email'], products: ['name', 'price'], addresses: ['street', 'city', 'country'] };

router.post('/import', (req, res) => {
  const type = req.query.type;
  if (!TYPES[type]) return res.status(400).json({ error: `type must be one of: ${Object.keys(TYPES).join(', ')}` });
  if (typeof req.body !== 'string' || !req.body.trim()) {
    return res.status(400).json({ error: 'Send CSV text in the request body with Content-Type: text/csv' });
  }

  const { headers, records } = parseCsvObjects(req.body);
  const missing = REQUIRED[type].filter((h) => !headers.includes(h));
  if (missing.length) return res.status(400).json({ error: `Missing required column(s): ${missing.join(', ')}` });
  if (!records.length) return res.status(400).json({ error: 'CSV has a header row but no data rows' });

  const collection = TYPES[type].collection;
  const errors = [];
  let imported = 0;
  let id = nextId(collection);

  records.forEach((r, i) => {
    const row = i + 2; // header is row 1
    let item;
    if (type === 'users') {
      if (!r.username || !r.email) return errors.push({ row, message: 'username and email are required' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) return errors.push({ row, message: `invalid email "${r.email}"` });
      if (state.users.some((u) => u.username === r.username)) return errors.push({ row, message: `username "${r.username}" already exists` });
      const status = r.status || 'active';
      if (!USER_STATUSES.includes(status)) return errors.push({ row, message: `invalid status "${status}"` });
      item = {
        username: r.username, email: r.email, password: r.password || 'Passw0rd!',
        firstName: r.firstName || '', lastName: r.lastName || '', role: r.role || 'user', status, phone: r.phone || '',
      };
    } else if (type === 'products') {
      const price = Number(r.price);
      const stock = r.stock === '' || r.stock === undefined ? 0 : Number(r.stock);
      if (!r.name) return errors.push({ row, message: 'name is required' });
      if (!Number.isFinite(price) || price < 0) return errors.push({ row, message: `invalid price "${r.price}"` });
      if (!Number.isInteger(stock) || stock < 0) return errors.push({ row, message: `invalid stock "${r.stock}"` });
      item = { name: r.name, category: r.category || 'General', price, stock, sku: r.sku || faker.string.alphanumeric(8).toUpperCase() };
    } else {
      if (!r.street || !r.city || !r.country) return errors.push({ row, message: 'street, city and country are required' });
      item = { street: r.street, city: r.city, state: r.state || '', zip: r.zip || '', country: r.country };
    }
    state[collection].push({ id: id++, ...item });
    imported++;
  });

  res.status(errors.length && !imported ? 422 : 200).json({ type, imported, skipped: errors.length, errors });
});

// ---- Sample files pack (valid and invalid files for upload tests) ----
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const MINIMAL_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
  '',
].join('\n');

const PACK_README = `QA Practice App - sample upload files
=====================================
Upload rules on the File Upload page: max 2 MB, allowed types pdf / png / csv.

valid/
  sample.pdf          tiny PDF           -> accepted
  sample.png          1x1 PNG            -> accepted
  sample.csv          small CSV          -> accepted
invalid/
  too-large.pdf       3 MB PDF           -> rejected (over 2 MB)
  script.exe          disallowed type    -> rejected (type not allowed)
  notes.txt           disallowed type    -> rejected (type not allowed)
  empty.csv           0 bytes            -> rejected (empty file)
  not-really.png      text named .png    -> content does not match extension
`;

router.get('/sample-files.zip', (req, res) => {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on('error', (err) => res.status(500).end(err.message));
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="sample-files.zip"' });
  archive.pipe(res);
  archive.append(PACK_README, { name: 'README.txt' });
  archive.append(MINIMAL_PDF, { name: 'valid/sample.pdf' });
  archive.append(PNG_1X1, { name: 'valid/sample.png' });
  archive.append('id,name,email\n1,Ada,ada@example.com\n2,Sam,sam@example.com\n', { name: 'valid/sample.csv' });
  archive.append(Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3 * 1024 * 1024, 0x20)]), { name: 'invalid/too-large.pdf' });
  archive.append('MZ-this-is-not-a-real-executable', { name: 'invalid/script.exe' });
  archive.append('Plain text file. Not an allowed upload type.\n', { name: 'invalid/notes.txt' });
  archive.append('', { name: 'invalid/empty.csv' });
  archive.append('This is text, not PNG data.', { name: 'invalid/not-really.png' });
  archive.finalize();
});

module.exports = router;
