'use strict';
/**
 * Default dataset. Deterministic (seeded faker) so every reset yields the same data.
 * Used by state.reset() and by scripts/seed.js.
 */
const { faker } = require('@faker-js/faker');

const USER_STATUSES = ['active', 'locked', 'inactive', 'expired-password'];

const SEED_CREDENTIALS = [
  { username: 'admin', password: 'Admin@123', role: 'admin', status: 'active' },
  { username: 'standard', password: 'User@123', role: 'user', status: 'active' },
  { username: 'locked', password: 'Locked@123', role: 'user', status: 'locked' },
  { username: 'inactive', password: 'Inactive@123', role: 'user', status: 'inactive' },
  { username: 'expired', password: 'Expired@123', role: 'user', status: 'expired-password' },
];

function buildSeedData() {
  faker.seed(1234);

  const users = SEED_CREDENTIALS.map((c, i) => ({
    id: i + 1,
    username: c.username,
    email: `${c.username}@example.com`,
    password: c.password,
    firstName: c.username[0].toUpperCase() + c.username.slice(1),
    lastName: 'Tester',
    role: c.role,
    status: c.status,
    phone: `555-010${i + 1}`,
  }));

  const products = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    name: faker.commerce.productName(),
    category: faker.commerce.department(),
    price: Number(faker.commerce.price({ min: 5, max: 500 })),
    stock: faker.number.int({ min: 0, max: 200 }),
    sku: faker.string.alphanumeric(8).toUpperCase(),
  }));

  const orderStatuses = ['pending', 'paid', 'shipped', 'cancelled'];
  const orders = Array.from({ length: 10 }, (_, i) => {
    const items = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => {
      const p = faker.helpers.arrayElement(products);
      return { productId: p.id, quantity: faker.number.int({ min: 1, max: 4 }), price: p.price };
    });
    return {
      id: i + 1,
      userId: faker.helpers.arrayElement(users).id,
      items,
      total: Number(items.reduce((s, it) => s + it.price * it.quantity, 0).toFixed(2)),
      status: faker.helpers.arrayElement(orderStatuses),
    };
  });

  const addresses = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country(),
  }));

  faker.seed(); // go back to random seeding for generated data
  return { users, products, orders, addresses };
}

module.exports = { buildSeedData, SEED_CREDENTIALS, USER_STATUSES };
