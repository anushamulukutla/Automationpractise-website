'use strict';
const { buildSeedData } = require('./seed');

const DEFAULT_SETTINGS = {
  slowNetwork: false,
  slowNetworkMs: 1500,
  flakyMode: false,
  flakyRate: 0.3,
  randomizeIds: false,
};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  users: [],
  products: [],
  orders: [],
  addresses: [],
  uploads: [],
};

/** Restore the clean seeded state. Settings go back to defaults unless keepSettings is true. */
function reset({ keepSettings = false } = {}) {
  const seed = buildSeedData();
  const settings = keepSettings ? state.settings : { ...DEFAULT_SETTINGS };
  Object.assign(state, seed, { settings, uploads: [] });
}

function nextId(collection) {
  return state[collection].reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

reset();

module.exports = { state, reset, nextId, DEFAULT_SETTINGS };
