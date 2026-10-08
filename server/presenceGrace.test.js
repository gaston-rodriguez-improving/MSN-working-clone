const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPresenceGrace } = require('./presenceGrace');

function harness() {
  const timers = new Map();
  let sequence = 0;
  const grace = createPresenceGrace({
    schedule(callback, delay) { assert.equal(delay, 10000); timers.set(++sequence, callback); return sequence; },
    cancel(id) { timers.delete(id); },
  });
  return { grace, expire() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } } };
}

test('reload reconnect cancels offline notification', () => {
  const { grace, expire } = harness();
  let offline = 0;
  grace.disconnect(1, () => offline++);
  assert.equal(grace.reconnect(1), true);
  expire();
  assert.equal(offline, 0);
});

test('real disconnect becomes offline and subsequent connection is new', () => {
  const { grace, expire } = harness();
  let offline = 0;
  grace.disconnect(1, () => offline++);
  expire();
  assert.equal(offline, 1);
  assert.equal(grace.reconnect(1), false);
});

test('reconnecting one user does not cancel another user going offline', () => {
  const { grace, expire } = harness();
  const offline = [];
  grace.disconnect(1, () => offline.push(1));
  grace.disconnect(2, () => offline.push(2));
  grace.reconnect(1);
  expire();
  assert.deepEqual(offline, [2]);
});
