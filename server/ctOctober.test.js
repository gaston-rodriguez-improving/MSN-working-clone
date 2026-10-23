const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  SEED,
  codesMatch,
  elapsedMs,
  keywordsMatch,
  podium,
  secretsMatch,
  seedCtOffices,
  createCtRouter,
} = require('./ctOctober');

const config = { companyId: 'co', eventId: 'ev', jwtSecret: 'test-secret' };
const NOW = Date.parse('1999-12-31T23:00:00.000Z');

function memoryDb() {
  const teams = [];
  const sessions = new Map();
  let nextId = 1;
  return {
    teams,
    sessions,
    async query(sql, params = []) {
      const op = sql.match(/-- ct:(\S+)/)[1];
      if (op === 'count') {
        const [companyId, eventId, office] = params;
        return { rows: [{ count: teams.filter(team => team.company_id === companyId && team.event_id === eventId && team.office === office).length }] };
      }
      if (op === 'seed-insert' || op === 'admin-insert') {
        const [companyId, eventId, office, name, keyword] = params;
        const row = { id: nextId, company_id: companyId, event_id: eventId, office, name, keyword };
        nextId += 1;
        teams.push(row);
        return { rows: [{ id: row.id, name: row.name, keyword: row.keyword }] };
      }
      if (op === 'team-by-id') {
        const [id, office, companyId, eventId] = params;
        return { rows: teams.filter(team => team.id === id && team.office === office && team.company_id === companyId && team.event_id === eventId) };
      }
      if (op === 'session') {
        const row = sessions.get(params[0]);
        return { rows: row ? [row] : [] };
      }
      if (op === 'start') {
        const [teamId, started] = params;
        const existing = sessions.get(teamId) || { started_at: null, finished_at: null };
        if (!existing.started_at) existing.started_at = started;
        sessions.set(teamId, existing);
        return { rows: [existing] };
      }
      if (op === 'finish') {
        const existing = sessions.get(params[0]);
        if (!existing?.started_at) return { rows: [] };
        if (!existing.finished_at) existing.finished_at = params[1];
        return { rows: [existing] };
      }
      if (op === 'public-teams' || op === 'admin-teams') {
        const [companyId, eventId, office] = params;
        return { rows: teams.filter(team => team.company_id === companyId && team.event_id === eventId && team.office === office).sort((a, b) => a.id - b.id) };
      }
      if (op === 'board') {
        const [companyId, eventId, office] = params;
        return {
          rows: teams
            .filter(team => team.company_id === companyId && team.event_id === eventId && team.office === office)
            .sort((a, b) => a.id - b.id)
            .map(team => ({ ...team, ...(sessions.get(team.id) || {}) })),
        };
      }
      if (op === 'admin-update') {
        const [id, office, companyId, eventId, name, keyword] = params;
        const team = teams.find(item => item.id === id && item.office === office && item.company_id === companyId && item.event_id === eventId);
        if (!team) return { rows: [] };
        if (name) team.name = name;
        if (keyword) team.keyword = keyword;
        return { rows: [{ id: team.id, name: team.name, keyword: team.keyword }] };
      }
      if (op === 'admin-delete') {
        const [id, office, companyId, eventId] = params;
        const index = teams.findIndex(team => team.id === id && team.office === office && team.company_id === companyId && team.event_id === eventId);
        if (index < 0) return { rows: [] };
        const [removed] = teams.splice(index, 1);
        sessions.delete(removed.id);
        return { rows: [{ id: removed.id }] };
      }
      if (op === 'running-count') {
        const [companyId, eventId, office] = params;
        const count = teams.filter(team => team.company_id === companyId && team.event_id === eventId && team.office === office && sessions.get(team.id)?.started_at && !sessions.get(team.id)?.finished_at).length;
        return { rows: [{ count }] };
      }
      if (op === 'reset') {
        const [companyId, eventId, office] = params;
        for (const team of teams) {
          if (team.company_id === companyId && team.event_id === eventId && team.office === office && sessions.has(team.id)) {
            sessions.set(team.id, { started_at: null, finished_at: null });
          }
        }
        return { rows: [] };
      }
      throw new Error(`unexpected query ${op}`);
    },
  };
}

async function boot(db, now = () => NOW) {
  const app = express();
  app.use(express.json());
  app.use('/ct', createCtRouter({ db, jwt, config, now }));
  const server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function send(base, path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

test('keyword and patch code comparison ignore case and spacing', () => {
  assert.equal(keywordsMatch('Onion', ' onion '), true);
  assert.equal(keywordsMatch('onion', 'river'), false);
  const previous = process.env.Y2K_PATCH_CODE;
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  assert.equal(codesMatch('y2k patch-99'), true);
  assert.equal(codesMatch('nope'), false);
  if (previous == null) delete process.env.Y2K_PATCH_CODE;
  else process.env.Y2K_PATCH_CODE = previous;
});

test('elapsed time, overtime, and podium order', () => {
  const started = new Date(NOW - 10 * 60 * 1000).toISOString();
  assert.equal(elapsedMs(started, null, NOW), 10 * 60 * 1000);
  const late = new Date(NOW - 61 * 60 * 1000).toISOString();
  const rows = [
    { id: 2, name: 'Team 2', status: 'finished', elapsedMs: 30 },
    { id: 1, name: 'Team 1', status: 'finished', elapsedMs: 10 },
    { id: 3, name: 'Team 3', status: 'running', elapsedMs: 5 },
  ];
  assert.deepEqual(podium(rows).map(row => row.name), ['Team 1', 'Team 2']);
  assert.equal(require('./ctOctober').sessionView({ started_at: late, finished_at: null }, NOW).overtime, true);
});

test('admin passwords must match and a missing password rejects login', () => {
  assert.equal(secretsMatch('office-secret', 'office-secret'), true);
  assert.equal(secretsMatch('office-secret', 'other'), false);
  assert.equal(secretsMatch('', 'office-secret'), false);
});

test('seeding an office twice does not replace an edited keyword', async () => {
  const db = memoryDb();
  await seedCtOffices(db, config);
  assert.equal(db.teams.length, 20);
  assert.deepEqual(SEED.argentina, ['onion', 'candle', 'marble', 'pencil', 'rocket', 'garden', 'button', 'silver', 'maple', 'comet']);
  db.teams[0].keyword = 'changed';
  await seedCtOffices(db, config);
  assert.equal(db.teams[0].keyword, 'changed');
  assert.equal(db.teams.length, 20);
});

test('a team can start once, finish, and a reset blocks the next finish', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const listed = await send(api.base, '/ct/teams?office=argentina');
    assert.equal(listed.body.teams.length, 10);
    assert.equal(JSON.stringify(listed.body).includes('onion'), false);
    const wrong = await send(api.base, '/ct/team/login', { method: 'POST', body: { office: 'argentina', teamId: listed.body.teams[0].id, keyword: 'river' } });
    assert.equal(wrong.status, 401);
    const login = await send(api.base, '/ct/team/login', { method: 'POST', body: { office: 'argentina', teamId: listed.body.teams[0].id, keyword: 'onion' } });
    assert.equal(login.status, 200);
    const started = await send(api.base, '/ct/team/start', { method: 'POST', token: login.body.token });
    const again = await send(api.base, '/ct/team/start', { method: 'POST', token: login.body.token });
    assert.equal(again.body.session.startedAt, started.body.session.startedAt);
    const badCode = await send(api.base, '/ct/finish', { method: 'POST', token: login.body.token, body: { code: 'nope' } });
    assert.equal(badCode.status, 401);
    const finished = await send(api.base, '/ct/finish', { method: 'POST', token: login.body.token, body: { code: 'y2k-patch99' } });
    assert.equal(finished.body.session.status, 'finished');
    const repeat = await send(api.base, '/ct/finish', { method: 'POST', token: login.body.token, body: { code: 'Y2KPATCH99' } });
    assert.equal(repeat.body.session.finishedAt, finished.body.session.finishedAt);

    process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
    process.env.CT_ADMIN_PASSWORD_CHILE = 'chile-secret';
    const admin = await send(api.base, '/ct/admin/login', { method: 'POST', body: { office: 'argentina', password: 'argentina-secret' } });
    const reset = await send(api.base, '/ct/admin/reset', { method: 'POST', token: admin.body.token });
    assert.equal(reset.body.runningCount, 0);
    const blocked = await send(api.base, '/ct/finish', { method: 'POST', token: login.body.token, body: { code: 'Y2KPATCH99' } });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error, 'team_reset');
  } finally {
    await api.close();
  }
});

test('a late finish is recorded and an Argentina board hides Chile', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
    process.env.CT_ADMIN_PASSWORD_CHILE = 'chile-secret';
    const listed = await send(api.base, '/ct/teams?office=argentina');
    const first = await send(api.base, '/ct/team/login', { method: 'POST', body: { office: 'argentina', teamId: listed.body.teams[0].id, keyword: 'onion' } });
    const second = await send(api.base, '/ct/team/login', { method: 'POST', body: { office: 'argentina', teamId: listed.body.teams[1].id, keyword: 'candle' } });
    await send(api.base, '/ct/team/start', { method: 'POST', token: first.body.token });
    await send(api.base, '/ct/team/start', { method: 'POST', token: second.body.token });
    db.sessions.get(listed.body.teams[0].id).started_at = new Date(NOW - 61 * 60 * 1000).toISOString();
    db.sessions.get(listed.body.teams[1].id).started_at = new Date(NOW - 10 * 60 * 1000).toISOString();
    const late = await send(api.base, '/ct/finish', { method: 'POST', token: first.body.token, body: { code: 'Y2KPATCH99' } });
    assert.equal(late.body.session.elapsedMs > 60 * 60 * 1000, true);
    await send(api.base, '/ct/finish', { method: 'POST', token: second.body.token, body: { code: 'Y2KPATCH99' } });
    const other = await send(api.base, '/ct/admin/login', { method: 'POST', body: { office: 'argentina', password: 'chile-secret' } });
    assert.equal(other.status, 401);
    const admin = await send(api.base, '/ct/admin/login', { method: 'POST', body: { office: 'argentina', password: 'argentina-secret' } });
    const board = await send(api.base, '/ct/admin/board', { token: admin.body.token });
    assert.equal(board.body.teams.length, 10);
    assert.equal(board.body.teams.some(team => team.keyword === 'river'), false);
    assert.deepEqual(board.body.podium.map(row => row.name), ['Team 2', 'Team 1']);
    const created = await send(api.base, '/ct/admin/teams', { method: 'POST', token: admin.body.token, body: { name: 'Team Extra', keyword: 'badge' } });
    assert.equal(created.status, 201);
    const edited = await send(api.base, `/ct/admin/teams/${created.body.team.id}`, { method: 'PATCH', token: admin.body.token, body: { keyword: 'badge-2' } });
    assert.equal(edited.body.team.keyword, 'badge-2');
    const removed = await send(api.base, `/ct/admin/teams/${created.body.team.id}`, { method: 'DELETE', token: admin.body.token });
    assert.equal(removed.status, 200);
  } finally {
    await api.close();
  }
});
