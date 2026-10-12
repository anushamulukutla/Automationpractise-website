'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const { state } = require('./src/state');
const swaggerUiDist = require('swagger-ui-dist');
const spec = require('./src/openapi');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

// Global QA toggles: "Slow network" adds latency, "Flaky mode" randomly fails API calls.
// Settings and reset stay reliable so a test can always get back to a clean state.
const EXEMPT = new Set(['/settings', '/reset']);
app.use('/api', async (req, res, next) => {
  if (EXEMPT.has(req.path)) return next();
  const { slowNetwork, slowNetworkMs, flakyMode, flakyRate } = state.settings;
  if (slowNetwork) await new Promise((r) => setTimeout(r, slowNetworkMs));
  if (flakyMode && Math.random() < flakyRate) {
    res.set('X-Flaky', 'true');
    return res.status(503).json({ error: 'Flaky mode: simulated failure', retryable: true });
  }
  next();
});

app.use('/api', require('./src/routes/core'));
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/rest'));
app.use('/api', require('./src/routes/files'));
app.use('/api', require('./src/routes/dynamic'));
app.use('/api', require('./src/routes/util'));
app.use('/api', require('./src/routes/geo'));
app.use('/api/testdata', require('./src/routes/testdata'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// /slow and /flaky also work without the /api prefix. Settings latency does not apply here.
app.use('/', require('./src/routes/util'));

// API docs: OpenAPI JSON + Swagger UI
app.get('/openapi.json', (req, res) => res.json(spec));
app.get(['/docs', '/docs/'], (req, res) => res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>API Docs - QA Practice App</title>
<link rel="stylesheet" href="/docs/assets/swagger-ui.css"></head>
<body><a href="/" data-testid="docs-home-link" style="display:block;padding:8px 16px;font-family:system-ui">&larr; QA Practice App</a>
<div id="swagger-ui" data-testid="swagger-ui"></div>
<script src="/docs/assets/swagger-ui-bundle.js"></script>
<script>window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', persistAuthorization: true });</script>
</body></html>`));
app.use('/docs/assets', express.static(swaggerUiDist.getAbsoluteFSPath()));

// HTTP Basic Auth practice page: admin / admin
app.get('/basic-auth', (req, res) => {
  const m = (req.get('Authorization') || '').match(/^Basic\s+(.+)$/i);
  const [user, pass] = m ? Buffer.from(m[1], 'base64').toString().split(':') : [];
  if (user === 'admin' && pass === 'admin') {
    return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Basic Auth</title></head><body style="font-family:system-ui;padding:20px"><h1 data-testid="basic-auth-title">Basic Auth</h1><p data-testid="basic-auth-success">Congratulations! You are authenticated with HTTP Basic Auth.</p><a href="/advanced.html" data-testid="basic-auth-back-link">Back to Advanced</a></body></html>');
  }
  res.set('WWW-Authenticate', 'Basic realm="QA Practice App", charset="UTF-8"').status(401).type('text').send('Authentication required (admin / admin)');
});

// Redirect chain: /redirect/1 -> /redirect/2 -> /redirect/3 -> landing page.
app.get('/redirect/:n', (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1 || n > 3) return res.status(404).send('Not found');
  res.redirect(302, n < 3 ? `/redirect/${n + 1}` : '/windows/redirect-landing.html?hops=3');
});

// HTML pages get the current global settings injected so "Randomize IDs" is applied before page scripts run.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const rel = req.path === '/' ? '/index.html' : req.path;
  if (!rel.endsWith('.html')) return next();
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return next();
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) return next();
    const inject = `<script>window.__QA_SETTINGS__=${JSON.stringify(state.settings)};</script>`;
    res.type('html').set('Cache-Control', 'no-store').send(html.replace('</head>', `${inject}</head>`));
  });
});

app.use(express.static(PUBLIC_DIR));

if (require.main === module) {
  app.listen(PORT, () => console.log(`QA Practice App running at http://localhost:${PORT}`));
}

module.exports = app;
