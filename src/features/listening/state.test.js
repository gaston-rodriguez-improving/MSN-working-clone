import test from 'node:test';
import assert from 'node:assert/strict';
import { createListeningState, reduceListeningState } from './state.js';

const live = (userId, revision, expiresAt = '2026-10-06T13:00:00.000Z') => ({
  userId, revision, activity: { userId, trackId: 42, title: 'Track', expiresAt },
});

test('a reconnect snapshot retains equal-revision activity and removes omitted users', () => {
  let state = reduceListeningState(createListeningState(), { type: 'delta', envelope: live(1, 4), now: Date.parse('2026-10-06T12:00:00Z') });
  state = reduceListeningState(state, { type: 'delta', envelope: live(2, 9), now: Date.parse('2026-10-06T12:00:00Z') });
  state = reduceListeningState(state, { type: 'snapshot', envelopes: [live(1, 4)], now: Date.parse('2026-10-06T12:00:00Z') });

  assert.deepEqual(Object.keys(state.activities), ['1']);
  assert.equal(state.activities[1].trackId, 42);
  const stale = reduceListeningState(state, { type: 'delta', envelope: live(2, 9), now: Date.parse('2026-10-06T12:00:00Z') });
  assert.deepEqual(Object.keys(stale.activities), ['1']);
});

test('a revisioned clear blocks an older REST result from restoring activity', () => {
  let state = reduceListeningState(createListeningState(), { type: 'delta', envelope: live(7, 11), now: Date.parse('2026-10-06T12:00:00Z') });
  state = reduceListeningState(state, { type: 'delta', envelope: { userId: 7, revision: 12, activity: null }, now: Date.parse('2026-10-06T12:00:00Z') });
  state = reduceListeningState(state, { type: 'rest', activities: [live(7, 11).activity], now: Date.parse('2026-10-06T12:00:00Z') });
  assert.deepEqual(state.activities, {});
  assert.equal(state.revisions.get(7), 12);
});

test('a higher-revision delta survives an older snapshot for the same friend', () => {
  let state = reduceListeningState(createListeningState(), { type: 'delta', envelope: { ...live(8, 15), activity: { ...live(8, 15).activity, title: 'Current' } }, now: Date.parse('2026-10-06T12:00:00Z') });
  state = reduceListeningState(state, { type: 'snapshot', envelopes: [{ ...live(8, 14), activity: { ...live(8, 14).activity, title: 'Stale' } }], now: Date.parse('2026-10-06T12:00:00Z') });
  assert.equal(state.activities[8].title, 'Current');
  assert.equal(state.revisions.get(8), 15);
});

test('an expired activity is hidden locally while disconnected', () => {
  const state = reduceListeningState(createListeningState(), { type: 'delta', envelope: live(3, 2), now: Date.parse('2026-10-06T12:00:00Z') });
  const expired = reduceListeningState(state, { type: 'expire', now: Date.parse('2026-10-06T14:00:00Z') });
  assert.deepEqual(expired.activities, {});
  assert.equal(expired.revisions.get(3), 2);
});
