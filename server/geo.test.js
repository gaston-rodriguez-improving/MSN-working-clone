const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clientIp } = require('./geo');

const request = forwardedFor => ({
  headers: { 'x-forwarded-for': forwardedFor },
  socket: { remoteAddress: '127.0.0.1' }
});

test('uses the address at the configured proxy depth, not a spoofed leftmost address', () => {
  assert.equal(clientIp(request('198.51.100.77, 203.0.113.15'), 1), '203.0.113.15');
  assert.equal(clientIp(request('198.51.100.77, 203.0.113.15, 192.0.2.8'), 2), '203.0.113.15');
});

test('strips the IPv4-mapped IPv6 prefix', () => {
  assert.equal(clientIp(request('::ffff:203.0.113.15'), 1), '203.0.113.15');
});

test('falls back to the socket address when the forwarded chain is unavailable', () => {
  assert.equal(clientIp(request(''), 1), '127.0.0.1');
  assert.equal(clientIp(request('203.0.113.15'), 2), '127.0.0.1');
});
