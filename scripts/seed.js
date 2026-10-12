#!/usr/bin/env node
'use strict';
/**
 * Seed script.
 *   node scripts/seed.js                  print the default dataset summary and credentials
 *   node scripts/seed.js --out seed.json  write the full default dataset to a JSON file
 *   node scripts/seed.js --url http://localhost:3000   reset a running server to this dataset
 */
const fs = require('fs');
const { buildSeedData, SEED_CREDENTIALS } = require('../src/seed');

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const data = buildSeedData();
  console.log('Default dataset:');
  for (const [k, v] of Object.entries(data)) console.log(`  ${k.padEnd(10)} ${v.length}`);
  console.log('\nSeed users (username / password / status):');
  for (const u of SEED_CREDENTIALS) console.log(`  ${u.username.padEnd(10)} ${u.password.padEnd(12)} ${u.status}`);

  const out = arg('--out');
  if (out) {
    fs.writeFileSync(out, JSON.stringify(data, null, 2));
    console.log(`\nWrote ${out}`);
  }

  const url = arg('--url');
  if (url) {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/reset`, { method: 'POST' });
    console.log(`\nPOST ${url}/api/reset -> ${res.status}`);
    if (!res.ok) process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
