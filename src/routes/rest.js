'use strict';
/**
 * REST API for API / Postman / pytest practice.
 *   /api/users, /api/products, /api/orders   CRUD + pagination, filtering, sorting
 * Auth: send "Authorization: Bearer <token>" from POST /api/auth/login.
 *   users   - every method needs a token; DELETE needs the admin role
 *   products- GET is public; POST/PUT/PATCH/DELETE need a token
 *   orders  - every method needs a token
 */
const express = require('express');
const { state, nextId } = require('../state');
const { requireAuth, requireAdmin } = require('../auth');
const { USER_STATUSES } = require('../seed');

const router = express.Router();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];

const bad = (res, message, details) => res.status(400).json({ error: message, ...(details ? { details } : {}) });
const notFound = (res, what) => res.status(404).json({ error: `${what} not found` });

/** Shared list handler: ?page=1&limit=10&sort=field&order=asc|desc&q=text&<exactFilter>=value */
function list(collection, { filters = [], searchFields = [], map = (x) => x }) {
  return (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1) return bad(res, 'page must be a positive integer');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return bad(res, 'limit must be an integer between 1 and 100');
    const order = (req.query.order || 'asc').toLowerCase();
    if (!['asc', 'desc'].includes(order)) return bad(res, 'order must be asc or desc');

    let rows = state[collection].map(map);
    for (const f of filters) {
      if (req.query[f] !== undefined && req.query[f] !== '') rows = rows.filter((r) => String(r[f]) === String(req.query[f]));
    }
    if (req.query.minPrice !== undefined) rows = rows.filter((r) => r.price >= Number(req.query.minPrice));
    if (req.query.maxPrice !== undefined) rows = rows.filter((r) => r.price <= Number(req.query.maxPrice));
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      rows = rows.filter((r) => searchFields.some((f) => String(r[f]).toLowerCase().includes(q)));
    }
    if (req.query.sort) {
      const key = String(req.query.sort);
      if (!rows.length || !(key in rows[0])) return bad(res, `Cannot sort by "${key}"`);
      rows = [...rows].sort((a, b) => {
        const x = a[key], y = b[key];
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return order === 'desc' ? -cmp : cmp;
      });
    }
    const total = rows.length;
    res.json({ data: rows.slice((page - 1) * limit, page * limit), page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  };
}

function find(collection) {
  return (req, res, next) => {
    const id = Number(req.params.id);
    const item = Number.isInteger(id) ? state[collection].find((r) => r.id === id) : null;
    if (!item) return notFound(res, collection.slice(0, -1).replace(/^./, (c) => c.toUpperCase()));
    req.item = item;
    next();
  };
}

// ---------------------------------------------------------------- users
const publicUser = ({ password, ...u }) => u;

function validateUser(body, { partial }) {
  const errors = [];
  const has = (k) => body[k] !== undefined;
  if (!partial || has('username')) if (typeof body.username !== 'string' || body.username.trim().length < 3) errors.push('username must be a string of at least 3 characters');
  if (!partial || has('email')) if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email)) errors.push('email must be a valid email address');
  if (has('role') && !['admin', 'user'].includes(body.role)) errors.push('role must be admin or user');
  if (has('status') && !USER_STATUSES.includes(body.status)) errors.push(`status must be one of: ${USER_STATUSES.join(', ')}`);
  if (has('password') && (typeof body.password !== 'string' || body.password.length < 6)) errors.push('password must be at least 6 characters');
  return errors;
}

const userFields = ['username', 'email', 'password', 'firstName', 'lastName', 'role', 'status', 'phone'];
const pickUser = (body) => Object.fromEntries(userFields.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const duplicateUser = (body, exceptId) =>
  state.users.find((u) => u.id !== exceptId && (u.username === body.username || (body.email && u.email === body.email)));

router.get('/users', requireAuth, list('users', { filters: ['role', 'status'], searchFields: ['username', 'email', 'firstName', 'lastName'], map: publicUser }));
router.get('/users/:id', requireAuth, find('users'), (req, res) => res.json(publicUser(req.item)));

router.post('/users', requireAuth, (req, res) => {
  const errors = validateUser(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  if (duplicateUser(req.body)) return res.status(409).json({ error: 'username or email already exists' });
  const user = { id: nextId('users'), password: 'Passw0rd!', firstName: '', lastName: '', role: 'user', status: 'active', phone: '', ...pickUser(req.body) };
  state.users.push(user);
  res.status(201).set('Location', `/api/users/${user.id}`).json(publicUser(user));
});

// PUT replaces the user: username and email are required, omitted optional fields reset to defaults.
router.put('/users/:id', requireAuth, find('users'), (req, res) => {
  const errors = validateUser(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  if (duplicateUser(req.body, req.item.id)) return res.status(409).json({ error: 'username or email already exists' });
  const replaced = { id: req.item.id, password: 'Passw0rd!', firstName: '', lastName: '', role: 'user', status: 'active', phone: '', ...pickUser(req.body) };
  state.users[state.users.indexOf(req.item)] = replaced;
  res.json(publicUser(replaced));
});

router.patch('/users/:id', requireAuth, find('users'), (req, res) => {
  const errors = validateUser(req.body || {}, { partial: true });
  if (errors.length) return bad(res, 'Validation failed', errors);
  if (duplicateUser({ ...req.item, ...req.body }, req.item.id)) return res.status(409).json({ error: 'username or email already exists' });
  Object.assign(req.item, pickUser(req.body));
  res.json(publicUser(req.item));
});

router.delete('/users/:id', requireAuth, requireAdmin, find('users'), (req, res) => {
  state.users.splice(state.users.indexOf(req.item), 1);
  res.status(204).end();
});

// ---------------------------------------------------------------- products
function validateProduct(body, { partial }) {
  const errors = [];
  const has = (k) => body[k] !== undefined;
  if (!partial || has('name')) if (typeof body.name !== 'string' || !body.name.trim()) errors.push('name is required');
  if (!partial || has('price')) if (typeof body.price !== 'number' || !(body.price >= 0)) errors.push('price must be a number >= 0');
  if (has('stock') && (!Number.isInteger(body.stock) || body.stock < 0)) errors.push('stock must be an integer >= 0');
  return errors;
}
const productFields = ['name', 'category', 'price', 'stock', 'sku'];
const pickProduct = (body) => Object.fromEntries(productFields.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

router.get('/products', list('products', { filters: ['category'], searchFields: ['name', 'category', 'sku'] }));
router.get('/products/:id', find('products'), (req, res) => res.json(req.item));

router.post('/products', requireAuth, (req, res) => {
  const errors = validateProduct(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  const product = { id: nextId('products'), category: 'General', stock: 0, sku: `SKU${nextId('products')}`, ...pickProduct(req.body) };
  state.products.push(product);
  res.status(201).set('Location', `/api/products/${product.id}`).json(product);
});

router.put('/products/:id', requireAuth, find('products'), (req, res) => {
  const errors = validateProduct(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  const replaced = { id: req.item.id, category: 'General', stock: 0, sku: req.item.sku, ...pickProduct(req.body) };
  state.products[state.products.indexOf(req.item)] = replaced;
  res.json(replaced);
});

router.patch('/products/:id', requireAuth, find('products'), (req, res) => {
  const errors = validateProduct(req.body || {}, { partial: true });
  if (errors.length) return bad(res, 'Validation failed', errors);
  Object.assign(req.item, pickProduct(req.body));
  res.json(req.item);
});

router.delete('/products/:id', requireAuth, find('products'), (req, res) => {
  state.products.splice(state.products.indexOf(req.item), 1);
  res.status(204).end();
});

// ---------------------------------------------------------------- orders
function buildOrder(body, { partial }) {
  const errors = [];
  const out = {};
  if (!partial || body.userId !== undefined) {
    if (!state.users.some((u) => u.id === body.userId)) errors.push('userId must be the id of an existing user');
    else out.userId = body.userId;
  }
  if (!partial || body.items !== undefined) {
    if (!Array.isArray(body.items) || !body.items.length) errors.push('items must be a non-empty array of { productId, quantity }');
    else {
      const items = [];
      body.items.forEach((it, i) => {
        const product = state.products.find((x) => x.id === (it && it.productId));
        if (!product) errors.push(`items[${i}].productId does not match a product`);
        else if (!Number.isInteger(it.quantity) || it.quantity < 1) errors.push(`items[${i}].quantity must be an integer >= 1`);
        else items.push({ productId: product.id, quantity: it.quantity, price: product.price });
      });
      if (!errors.length) {
        out.items = items;
        out.total = Number(items.reduce((s, it) => s + it.price * it.quantity, 0).toFixed(2));
      }
    }
  }
  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) errors.push(`status must be one of: ${ORDER_STATUSES.join(', ')}`);
    else out.status = body.status;
  }
  return { errors, out };
}

router.get('/orders', requireAuth, list('orders', { filters: ['status', 'userId'], searchFields: ['status'], map: (o) => ({ ...o }) }));
router.get('/orders/:id', requireAuth, find('orders'), (req, res) => res.json(req.item));

router.post('/orders', requireAuth, (req, res) => {
  const { errors, out } = buildOrder(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  const order = { id: nextId('orders'), status: 'pending', ...out };
  state.orders.push(order);
  res.status(201).set('Location', `/api/orders/${order.id}`).json(order);
});

router.put('/orders/:id', requireAuth, find('orders'), (req, res) => {
  const { errors, out } = buildOrder(req.body || {}, { partial: false });
  if (errors.length) return bad(res, 'Validation failed', errors);
  const replaced = { id: req.item.id, status: 'pending', ...out };
  state.orders[state.orders.indexOf(req.item)] = replaced;
  res.json(replaced);
});

router.patch('/orders/:id', requireAuth, find('orders'), (req, res) => {
  const { errors, out } = buildOrder(req.body || {}, { partial: true });
  if (errors.length) return bad(res, 'Validation failed', errors);
  Object.assign(req.item, out);
  res.json(req.item);
});

router.delete('/orders/:id', requireAuth, find('orders'), (req, res) => {
  state.orders.splice(state.orders.indexOf(req.item), 1);
  res.status(204).end();
});

module.exports = router;
