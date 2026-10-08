const test = require('node:test');
const assert = require('node:assert/strict');
const { accountNameFromClaims } = require('./accountName');
test('mail identity uses given/family names and normalizes provider display names', () => {
  assert.equal(accountNameFromClaims({ given_name: ' Ana ', family_name: 'Pérez', name: 'Pérez, Ana' }), 'Ana Pérez');
  assert.equal(accountNameFromClaims({ name: 'Rodríguez, Gastón' }), 'Gastón Rodríguez');
  assert.equal(accountNameFromClaims({ name: ' Ana  María Pérez ' }), 'Ana María Pérez');
  assert.equal(accountNameFromClaims({ preferred_username: 'a.perez@example.com' }), '');
});
