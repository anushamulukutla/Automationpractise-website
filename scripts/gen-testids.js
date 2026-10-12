#!/usr/bin/env node
'use strict';
/**
 * Builds the data-testid reference table from the source, so the README never drifts.
 * Scans every HTML page under public/ plus the scripts it loads, and rewrites the section
 * of README.md between the TESTIDS markers.
 *   npm run docs:testids
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const README = path.join(ROOT, 'README.md');
const START = '<!-- TESTIDS:START -->';
const END = '<!-- TESTIDS:END -->';

const TAG_RE = /<(\w+)([^<>]*?)data-testid\s*=\s*["']([^"']+)["']([^<>]*)>/g;

function extract(source) {
  const found = new Map();
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(source))) {
    const [, tag, before, id, after] = m;
    const attrs = before + after;
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/) || [])[1];
    const role = (attrs.match(/\brole\s*=\s*["']([^"']+)["']/) || [])[1];
    let el = tag.toLowerCase();
    if (type && el === 'input') el += `[${type}]`;
    if (role) el += ` (role=${role})`;
    if (!found.has(id)) found.set(id, el);
  }
  return found;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function titleOf(html, file) {
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || path.basename(file);
  return t.replace(/\s*-\s*QA Practice App\s*$/, '');
}

function table(map) {
  const rows = [...map.entries()].map(([id, el]) => {
    const dynamic = id.includes('${') || /-\$\{|-' ?\+/.test(id);
    return `| \`${id}\` | ${el}${dynamic ? ' (pattern)' : ''} |`;
  });
  return ['| data-testid | Element |', '| --- | --- |', ...rows].join('\n');
}

function build() {
  const layoutIds = extract(fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8'));
  // Nav links are built from a list in layout.js, so document them explicitly.
  for (const m of fs.readFileSync(path.join(PUBLIC, 'js', 'layout.js'), 'utf8').matchAll(/testid:\s*'([^']+)'/g)) {
    layoutIds.set(m[1], 'a (sidebar link)');
  }
  const skip = extract('<a data-testid="skip-to-content-link">');
  skip.forEach((v, k) => layoutIds.set(k, 'a'));

  const out = [`### Every page (layout)\n\n${table(layoutIds)}`];

  const htmlFiles = walk(PUBLIC).filter((f) => f.endsWith('.html')).sort((a, b) => {
    // top-level pages first, then frames/windows
    const da = path.relative(PUBLIC, a).includes(path.sep) ? 1 : 0;
    const db = path.relative(PUBLIC, b).includes(path.sep) ? 1 : 0;
    return da - db || a.localeCompare(b);
  });

  for (const file of htmlFiles) {
    const rel = '/' + path.relative(PUBLIC, file).split(path.sep).join('/');
    const html = fs.readFileSync(file, 'utf8');
    const ids = extract(html);
    for (const s of html.matchAll(/<script[^>]+src=["']\/js\/([^"']+)["']/g)) {
      if (s[1] === 'layout.js') continue;
      const js = fs.readFileSync(path.join(PUBLIC, 'js', s[1]), 'utf8');
      extract(js).forEach((v, k) => { if (!ids.has(k)) ids.set(k, `${v} (created by script)`); });
    }
    // The skip link and layout ids are documented once above.
    ids.delete('skip-to-content-link');
    if (!ids.size) continue;
    out.push(`### ${titleOf(html, file)} (\`${rel}\`)\n\n${table(ids)}`);
  }
  return out.join('\n\n');
}

const generated = `${START}\n\n${build()}\n\n${END}`;
if (!fs.existsSync(README)) {
  console.log(generated);
} else {
  const readme = fs.readFileSync(README, 'utf8');
  const s = readme.indexOf(START);
  const e = readme.indexOf(END);
  if (s < 0 || e < 0) {
    console.error(`README.md has no ${START} ... ${END} markers`);
    process.exit(1);
  }
  fs.writeFileSync(README, readme.slice(0, s) + generated + readme.slice(e + END.length));
  console.log('README.md testid tables updated');
}
