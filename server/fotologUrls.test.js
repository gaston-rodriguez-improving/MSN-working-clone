const test = require('node:test');
const assert = require('node:assert/strict');
const { slugBase } = require('./fotologUrls');
test('Fotolog URLs normalize names and avoid API routes and legacy numeric IDs', () => {
  assert.equal(slugBase('Ana Pérez'), 'ana-perez');
  assert.equal(slugBase('  Mi__Fotolog ♥  '), 'mi-fotolog');
  assert.equal(slugBase('Posts'), 'fotolog-posts');
  assert.equal(slugBase('123'), 'fotolog-123');
  assert.equal(slugBase('♥'), 'fotolog');
});
