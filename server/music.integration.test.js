const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { WebSocket } = require('ws');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const enabled = process.env.MUSIC_INTEGRATION === '1' && Boolean(process.env.JWT_SECRET);
const base = process.env.MUSIC_API_BASE || 'http://127.0.0.1:3309';

async function api(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws?token=${token}`);
    const events = [];
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for socket_ready')), 10000);
    ws.on('message', raw => {
      const event = JSON.parse(raw.toString()); events.push(event);
      if (event.type === 'socket_ready') { clearTimeout(timeout); resolve({ ws, events }); }
    });
    ws.on('error', reject);
  });
}

async function waitFor(events, predicate) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const event = events.find(predicate);
    if (event) return event;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for event; received ${JSON.stringify(events)}`);
}

async function rejectedSocketCode(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws?token=${token}`);
    const timeout = setTimeout(() => { ws.terminate(); reject(new Error('Timed out waiting for rejected WebSocket')); }, 5000);
    ws.on('close', code => { clearTimeout(timeout); resolve(code); });
    ws.on('error', () => {});
  });
}

test('shared catalog permissions and listening lease ownership', { skip: !enabled }, async t => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 14);
  const register = async name => {
    const result = await api('/auth/sign-up', null, 'POST', { email: `${name}${suffix}@winamp.test`, username: `${name}${suffix}`, password: 'test-password' });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body;
  };
  const alice = await register('leasea'); const bob = await register('leaseb'); const stranger = await register('leasec');
  const wrongCompany = jwt.sign({ sub: alice.user.id, companyId: `other-${suffix}`, eventId: process.env.EVENT_ID || 'other-event', authProvider: 'password' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const wrongEvent = jwt.sign({ sub: alice.user.id, companyId: process.env.COMPANY_ID || 'other-company', eventId: `other-${suffix}`, authProvider: 'password' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  for (const token of [wrongCompany, wrongEvent]) {
    assert.equal((await api('/music/tracks', token)).status, 401);
    assert.equal(await rejectedSocketCode(token), 1008);
  }
  const invitation = await api('/friend-requests', alice.access_token, 'POST', { userId: bob.user.id });
  assert.equal(invitation.status, 201);
  assert.equal((await api(`/friend-requests/${invitation.body.request.id}`, bob.access_token, 'PATCH', { status: 'accepted' })).status, 200);

  const videoId = `t${suffix.slice(0, 10)}`;
  const added = await api('/music/tracks', alice.access_token, 'POST', { url: `https://youtu.be/${videoId}`, title: 'Integration track', artist: 'Test band' });
  assert.equal(added.status, 201, JSON.stringify(added.body));
  assert.equal((await api('/music/tracks', bob.access_token, 'POST', { url: `https://youtube.com/watch?v=${videoId}`, title: 'Duplicate' })).status, 409);
  assert.equal((await api(`/music/tracks/${added.body.track.id}`, bob.access_token, 'DELETE')).status, 403);

  await api('/music/listening-preference', alice.access_token, 'PUT', { share: true });
  await api('/music/listening-preference', bob.access_token, 'PUT', { share: true });
  const aliceSocket = await connect(alice.access_token); const bobSocket = await connect(bob.access_token); const strangerSocket = await connect(stranger.access_token);
  t.after(() => { aliceSocket.ws.close(); bobSocket.ws.close(); strangerSocket.ws.close(); });
  const db = new Pool({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT || 5432), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false });
  t.after(() => db.end());
  assert.ok(aliceSocket.events.find(event => event.type === 'listening_snapshot')?.payload.activities.some(item => item.userId === bob.user.id && item.activity === null));
  assert.equal(strangerSocket.events.find(event => event.type === 'listening_snapshot')?.payload.activities.some(item => item.userId === alice.user.id), false);
  const otherVideo = `z${suffix.slice(0, 10)}`;
  const otherTrack = await api('/music/tracks', bob.access_token, 'POST', { url: `https://youtu.be/${otherVideo}`, title: 'Live catalog track' });
  assert.equal(otherTrack.status, 201);
  const scope = (await db.query('SELECT company_id,event_id FROM users WHERE id=$1', [alice.user.id])).rows[0];
  assert.ok(scope);
  let admin = (await db.query('SELECT id FROM users WHERE email=$1 AND company_id=$2 AND event_id=$3', ['gaston.rodriguez@improving.com', scope.company_id, scope.event_id])).rows[0];
  if (!admin) admin = (await db.query(`INSERT INTO users(email,username,password_hash,company_id,event_id,status)
    VALUES($1,$2,$3,$4,$5,'offline') RETURNING id`, ['gaston.rodriguez@improving.com', `adminfixture${suffix}`, 'integration-test-hash', scope.company_id, scope.event_id])).rows[0];
  const adminToken = authProvider => jwt.sign({ sub: admin.id, companyId: scope.company_id, eventId: scope.event_id, authProvider }, process.env.JWT_SECRET, { expiresIn: '5m' });
  assert.equal((await api(`/music/tracks/${otherTrack.body.track.id}`, adminToken('password'), 'DELETE')).status, 403);
  assert.equal((await api(`/music/tracks/${otherTrack.body.track.id}`, adminToken('microsoft'), 'DELETE')).status, 200);
  const invalidation = await waitFor(aliceSocket.events, event => event.type === 'music_catalog_changed');
  assert.equal(typeof invalidation.payload.scope.eventId, 'string');
  const publish = payload => aliceSocket.ws.send(JSON.stringify({ type: 'listening_activity', payload }));
  const firstSession = `first-${suffix}`; const secondSession = `second-${suffix}`;
  publish({ action: 'start', sessionId: firstSession, sequence: 1, trackId: added.body.track.id });
  await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === firstSession);
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(strangerSocket.events.some(event => event.type === 'listening_activity' && event.payload.activity?.sessionId === firstSession), false);
  publish({ action: 'start', sessionId: secondSession, sequence: 1, trackId: added.body.track.id });
  const takeover = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === secondSession);
  publish({ action: 'heartbeat', sessionId: firstSession, sequence: 2, trackId: added.body.track.id });
  publish({ action: 'clear', sessionId: firstSession, sequence: 3 });
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(bobSocket.events.some(event => event.type === 'listening_activity' && event.payload.revision > takeover.payload.revision && event.payload.activity?.sessionId === firstSession), false);
  publish({ action: 'clear', sessionId: secondSession, sequence: 2 });
  const cleared = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.revision > takeover.payload.revision && event.payload.activity === null);
  assert.ok(cleared.payload.revision > takeover.payload.revision);

  const oldOwnerSocket = await connect(alice.access_token); const newOwnerSocket = await connect(alice.access_token);
  t.after(() => { oldOwnerSocket.ws.close(); newOwnerSocket.ws.close(); });
  const socketOwnerOld = `socketold-${suffix}`; const socketOwnerNew = `socketnew-${suffix}`;
  oldOwnerSocket.ws.send(JSON.stringify({ type: 'listening_activity', payload: { action: 'start', sessionId: socketOwnerOld, sequence: 1, trackId: added.body.track.id } }));
  await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === socketOwnerOld);
  newOwnerSocket.ws.send(JSON.stringify({ type: 'listening_activity', payload: { action: 'start', sessionId: socketOwnerNew, sequence: 1, trackId: added.body.track.id } }));
  const newSocketOwner = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === socketOwnerNew);
  oldOwnerSocket.ws.close();
  await new Promise(resolve => setTimeout(resolve, 200));
  const afterOldSocketClose = await api('/music/listening', bob.access_token);
  assert.equal(afterOldSocketClose.body.activities.find(activity => activity.userId === alice.user.id)?.sessionId, socketOwnerNew);
  assert.equal(bobSocket.events.some(event => event.type === 'listening_activity' && event.payload.revision > newSocketOwner.payload.revision && event.payload.activity === null), false);
  newOwnerSocket.ws.close();
  const socketCloseClear = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.revision > newSocketOwner.payload.revision && event.payload.activity === null);

  const optOutSession = `optout-${suffix}`;
  publish({ action: 'start', sessionId: optOutSession, sequence: 1, trackId: added.body.track.id });
  const optOutStarted = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === optOutSession);
  assert.equal((await api('/music/listening-preference', alice.access_token, 'PUT', { share: false })).body.share, false);
  const optOutClear = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity === null && event.payload.revision > optOutStarted.payload.revision);
  assert.ok(optOutClear.payload.revision > socketCloseClear.payload.revision);

  await api('/music/listening-preference', alice.access_token, 'PUT', { share: true });
  const raceOld = `raceold-${suffix}`; const raceNew = `racenew-${suffix}`;
  publish({ action: 'start', sessionId: raceOld, sequence: 1, trackId: added.body.track.id });
  const raceStarted = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === raceOld);
  await db.query('UPDATE user_music_activities SET expires_at=CURRENT_TIMESTAMP-INTERVAL \'1 second\' WHERE user_id=$1', [alice.user.id]);
  const lockClient = await db.connect();
  await lockClient.query('BEGIN');
  await lockClient.query('SELECT user_id FROM user_music_preferences WHERE user_id=$1 FOR UPDATE', [alice.user.id]);
  const expiryFetch = api('/music/listening', alice.access_token);
  await new Promise(resolve => setTimeout(resolve, 150));
  publish({ action: 'start', sessionId: raceNew, sequence: 1, trackId: added.body.track.id });
  await new Promise(resolve => setTimeout(resolve, 150));
  await lockClient.query('COMMIT'); lockClient.release();
  assert.equal((await expiryFetch).status, 200);
  const raceTombstone = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity === null && event.payload.revision > raceStarted.payload.revision);
  const raceActivity = await waitFor(bobSocket.events, event => event.type === 'listening_activity' && event.payload.activity?.sessionId === raceNew);
  assert.ok(raceActivity.payload.revision > raceTombstone.payload.revision);
  assert.equal((await api('/music/listening', alice.access_token)).body.activities.some(activity => activity.sessionId === raceOld), false);

  assert.equal((await api(`/music/tracks/${added.body.track.id}`, alice.access_token, 'DELETE')).status, 200);
  const resubmitted = await api('/music/tracks', bob.access_token, 'POST', { url: `https://youtu.be/${videoId}`, title: 'Resubmitted track' });
  assert.equal(resubmitted.status, 201, JSON.stringify(resubmitted.body));
  assert.equal((await api('/music/listening', bob.access_token)).status, 200);
});
