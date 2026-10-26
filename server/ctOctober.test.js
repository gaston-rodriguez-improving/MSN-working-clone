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
  validatePatchCode,
  createCtRouter,
} = require('./ctOctober');

const config = { companyId: 'co', eventId: 'ev', jwtSecret: 'test-secret' };
const NOW = Date.parse('1999-12-31T23:00:00.000Z');

function memoryDb() {
  const teams = [];
  const sessions = new Map();
  const settings = new Map();
  let nextId = 1;
  const settingsKey = params => params.slice(0, 3).join('|');
  return {
    teams,
    sessions,
    settings,
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
      if (op === 'code-seed') {
        const [companyId, eventId, office, patchCode] = params;
        const key = settingsKey(params);
        if (!settings.has(key)) {
          settings.set(key, { company_id: companyId, event_id: eventId, office, patch_code: patchCode, is_default: true, updated_at: new Date(NOW).toISOString() });
        }
        return { rows: [] };
      }
      if (op === 'code-get') {
        const row = settings.get(settingsKey(params));
        return { rows: row ? [row] : [] };
      }
      if (op === 'code-put') {
        const [companyId, eventId, office, patchCode, updatedAt] = params;
        const key = settingsKey(params);
        const row = settings.get(key) || { company_id: companyId, event_id: eventId, office };
        row.patch_code = patchCode;
        row.is_default = false;
        row.updated_at = updatedAt;
        settings.set(key, row);
        return { rows: [row] };
      }
      if (op === 'admin-delete') {
        const [id, office, companyId, eventId] = params;
        const index = teams.findIndex(team => team.id === id && team.office === office && team.company_id === companyId && team.event_id === eventId);
        if (index < 0) return { rows: [] };
        const [removed] = teams.splice(index, 1);
        sessions.delete(removed.id);
        return { rows: [{ id: removed.id }] };
      }
      if (op === 'team-running') {
        const [id, office, companyId, eventId] = params;
        const team = teams.find(item => item.id === id && item.office === office && item.company_id === companyId && item.event_id === eventId);
        const session = team && sessions.get(team.id);
        return { rows: [{ count: session?.started_at && !session?.finished_at ? 1 : 0 }] };
      }
      if (op === 'team-reset') {
        const [id, office, companyId, eventId] = params;
        const team = teams.find(item => item.id === id && item.office === office && item.company_id === companyId && item.event_id === eventId);
        if (!team || !sessions.has(team.id)) return { rows: [] };
        sessions.set(team.id, { started_at: null, finished_at: null });
        return { rows: [{ team_id: team.id }] };
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
  assert.equal(codesMatch('Y2KPATCH99', 'y2k patch-99'), true);
  assert.equal(codesMatch('Y2KPATCH99', 'nope'), false);
  assert.equal(codesMatch('', 'Y2KPATCH99'), false);
  assert.equal(codesMatch(null, 'Y2KPATCH99'), false);
});

test('validatePatchCode enforces the code rules', () => {
  assert.equal(validatePatchCode('Y2K-fix 2025', ['Y2KPATCH99']), null);
  assert.equal(validatePatchCode('', []), 'Enter a code');
  assert.equal(validatePatchCode('   ', []), 'Enter a code');
  assert.equal(validatePatchCode(null, []), 'Enter a code');
  assert.equal(validatePatchCode('abc', []), 'Use 4 to 32 letters or numbers');
  assert.equal(validatePatchCode('a'.repeat(33), []), 'Use 4 to 32 letters or numbers');
  assert.equal(validatePatchCode('bad!code', []), 'Use only letters, numbers, spaces and dashes');
  assert.equal(validatePatchCode('a'.repeat(49), []), 'Use only letters, numbers, spaces and dashes');
  assert.equal(validatePatchCode('Y2KPATCH99', ['Y2KPATCH99']), 'Choose a code different from the default');
  assert.equal(validatePatchCode('y2k-patch 99', ['Y2KPATCH99']), 'Choose a code different from the default');
  assert.equal(validatePatchCode('OfficeCode1', ['Y2KPATCH99', 'OfficeCode1']), 'Choose a code different from the default');
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
    const restarted = await send(api.base, `/ct/admin/teams/${listed.body.teams[0].id}/reset`, { method: 'POST', token: admin.body.token });
    assert.equal(restarted.status, 200);
    const after = await send(api.base, '/ct/admin/board', { token: admin.body.token });
    assert.equal(after.body.teams.find(team => team.id === listed.body.teams[0].id).status, 'ready');
    assert.equal(after.body.teams.find(team => team.id === listed.body.teams[1].id).status, 'finished');
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

test('seeding stores the env or default code per office and never overwrites', async () => {
  const previous = process.env.Y2K_PATCH_CODE;
  try {
    process.env.Y2K_PATCH_CODE = 'EnvironCode7';
    const db = memoryDb();
    await seedCtOffices(db, config);
    assert.equal(db.settings.get('co|ev|argentina').patch_code, 'EnvironCode7');
    assert.equal(db.settings.get('co|ev|argentina').is_default, true);
    assert.equal(db.settings.get('co|ev|chile').patch_code, 'EnvironCode7');
    db.settings.get('co|ev|argentina').patch_code = 'EditedCode';
    process.env.Y2K_PATCH_CODE = 'SomethingElse';
    await seedCtOffices(db, config);
    assert.equal(db.settings.get('co|ev|argentina').patch_code, 'EditedCode');
    delete process.env.Y2K_PATCH_CODE;
    const db2 = memoryDb();
    await seedCtOffices(db2, config);
    assert.equal(db2.settings.get('co|ev|argentina').patch_code, 'Y2KPATCH99');
  } finally {
    if (previous == null) delete process.env.Y2K_PATCH_CODE;
    else process.env.Y2K_PATCH_CODE = previous;
  }
});

async function loginTeam(base, office, teamId, keyword) {
  const login = await send(base, '/ct/team/login', { method: 'POST', body: { office, teamId, keyword } });
  return login.body.token;
}

async function loginAdmin(base, office, password) {
  const login = await send(base, '/ct/admin/login', { method: 'POST', body: { office, password } });
  return login.body.token;
}

test('per-office codes: own code finishes, the other office code is rejected', async () => {
  process.env.Y2K_PATCH_CODE = 'SharedDefault5';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  process.env.CT_ADMIN_PASSWORD_CHILE = 'chile-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const chileAdmin = await loginAdmin(api.base, 'chile', 'chile-secret');
    await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: argAdmin, body: { code: 'ARG-CODE-9' } });
    await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: chileAdmin, body: { code: 'CHI-CODE-8' } });

    const listed = await send(api.base, '/ct/teams?office=argentina');
    const argToken = await loginTeam(api.base, 'argentina', listed.body.teams[0].id, 'onion');
    await send(api.base, '/ct/team/start', { method: 'POST', token: argToken });
    const withChile = await send(api.base, '/ct/finish', { method: 'POST', token: argToken, body: { code: 'CHI-CODE-8' } });
    assert.equal(withChile.status, 401);
    const withOwn = await send(api.base, '/ct/finish', { method: 'POST', token: argToken, body: { code: 'arg code-9' } });
    assert.equal(withOwn.body.session.status, 'finished');

    const chileTeams = await send(api.base, '/ct/teams?office=chile');
    const chileToken = await loginTeam(api.base, 'chile', chileTeams.body.teams[0].id, 'river');
    await send(api.base, '/ct/team/start', { method: 'POST', token: chileToken });
    const chileFinish = await send(api.base, '/ct/finish', { method: 'POST', token: chileToken, body: { code: 'CHI-CODE-8' } });
    assert.equal(chileFinish.body.session.status, 'finished');
  } finally {
    await api.close();
  }
});

test('admin GET and PUT are scoped to the office in the token', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  process.env.CT_ADMIN_PASSWORD_CHILE = 'chile-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const chileAdmin = await loginAdmin(api.base, 'chile', 'chile-secret');

    const argRead = await send(api.base, '/ct/admin/patch-code', { token: argAdmin });
    assert.equal(argRead.status, 200);
    assert.equal(argRead.body.patchCode, 'Y2KPATCH99');
    assert.equal(argRead.body.isDefault, true);
    assert.ok(argRead.body.updatedAt);

    const saved = await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: argAdmin, body: { code: 'ARG-new 1' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.patchCode, 'ARG-new 1');
    assert.equal(saved.body.isDefault, false);
    assert.ok(saved.body.updatedAt);

    const chileRead = await send(api.base, '/ct/admin/patch-code', { token: chileAdmin });
    assert.equal(chileRead.body.patchCode, 'Y2KPATCH99');
    assert.equal(chileRead.body.isDefault, true);
    const argRead2 = await send(api.base, '/ct/admin/patch-code', { token: argAdmin });
    assert.equal(argRead2.body.patchCode, 'ARG-new 1');
    assert.equal(argRead2.body.isDefault, false);
  } finally {
    await api.close();
  }
});

test('PUT validation matrix rejects invalid and default codes', async () => {
  process.env.Y2K_PATCH_CODE = 'EnvDefault4';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const put = code => send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: argAdmin, body: { code } });
    assert.deepEqual((await put('')).body.error, 'Enter a code');
    assert.deepEqual((await put('abc')).body.error, 'Use 4 to 32 letters or numbers');
    assert.deepEqual((await put('a'.repeat(33))).body.error, 'Use 4 to 32 letters or numbers');
    assert.deepEqual((await put('bad!code')).body.error, 'Use only letters, numbers, spaces and dashes');
    assert.deepEqual((await put('Y2KPATCH99')).body.error, 'Choose a code different from the default');
    assert.deepEqual((await put('envdefault-4')).body.error, 'Choose a code different from the default');
    const ok = await put('good-1 CODE');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.patchCode, 'good-1 CODE');
  } finally {
    await api.close();
  }
});

test('after PUT the default is retired, running teams pick it up, finished stay', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const listed = await send(api.base, '/ct/teams?office=argentina');
    const running = await loginTeam(api.base, 'argentina', listed.body.teams[0].id, 'onion');
    const done = await loginTeam(api.base, 'argentina', listed.body.teams[1].id, 'candle');
    await send(api.base, '/ct/team/start', { method: 'POST', token: running });
    await send(api.base, '/ct/team/start', { method: 'POST', token: done });
    const earlyFinish = await send(api.base, '/ct/finish', { method: 'POST', token: done, body: { code: 'Y2KPATCH99' } });
    assert.equal(earlyFinish.body.session.status, 'finished');

    await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: argAdmin, body: { code: 'NeuCode42' } });

    const oldCode = await send(api.base, '/ct/finish', { method: 'POST', token: running, body: { code: 'Y2KPATCH99' } });
    assert.equal(oldCode.status, 401);
    const newCode = await send(api.base, '/ct/finish', { method: 'POST', token: running, body: { code: 'neu-code42' } });
    assert.equal(newCode.body.session.status, 'finished');
    const doneSession = await send(api.base, '/ct/session', { token: done });
    assert.equal(doneSession.body.session.finishedAt, earlyFinish.body.session.finishedAt);
  } finally {
    await api.close();
  }
});

test('a missing settings row is recreated on read and finish', async () => {
  process.env.Y2K_PATCH_CODE = 'Recreate9';
  const db = memoryDb();
  await seedCtOffices(db, config);
  db.settings.clear();
  const api = await boot(db);
  try {
    process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const read = await send(api.base, '/ct/admin/patch-code', { token: argAdmin });
    assert.equal(read.body.patchCode, 'Recreate9');
    assert.equal(read.body.isDefault, true);

    db.settings.clear();
    const listed = await send(api.base, '/ct/teams?office=argentina');
    const token = await loginTeam(api.base, 'argentina', listed.body.teams[0].id, 'onion');
    await send(api.base, '/ct/team/start', { method: 'POST', token });
    const finish = await send(api.base, '/ct/finish', { method: 'POST', token, body: { code: 'Recreate9' } });
    assert.equal(finish.body.session.status, 'finished');
  } finally {
    await api.close();
  }
});

test('patch-code routes reject team and missing tokens and foreign tenants', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const listed = await send(api.base, '/ct/teams?office=argentina');
    const teamToken = await loginTeam(api.base, 'argentina', listed.body.teams[0].id, 'onion');
    for (const token of [undefined, teamToken]) {
      assert.equal((await send(api.base, '/ct/admin/patch-code', { token })).status, 401);
      assert.equal((await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token, body: { code: 'Whatever1' } })).status, 401);
    }
    const foreign = jwt.sign({ role: 'ct-admin', office: 'argentina', companyId: 'other-co', eventId: 'ev' }, config.jwtSecret);
    assert.equal((await send(api.base, '/ct/admin/patch-code', { token: foreign })).status, 401);
    assert.equal((await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: foreign, body: { code: 'Whatever1' } })).status, 401);
    const foreignEvent = jwt.sign({ role: 'ct-admin', office: 'argentina', companyId: 'co', eventId: 'other-ev' }, config.jwtSecret);
    assert.equal((await send(api.base, '/ct/admin/patch-code', { token: foreignEvent })).status, 401);
    assert.equal(db.settings.get('co|ev|argentina').patch_code, 'Y2KPATCH99');
  } finally {
    await api.close();
  }
});

test('both offices may use the same code and teams never see it', async () => {
  process.env.Y2K_PATCH_CODE = 'Y2KPATCH99';
  process.env.CT_ADMIN_PASSWORD_ARGENTINA = 'argentina-secret';
  process.env.CT_ADMIN_PASSWORD_CHILE = 'chile-secret';
  const db = memoryDb();
  await seedCtOffices(db, config);
  const api = await boot(db);
  try {
    const argAdmin = await loginAdmin(api.base, 'argentina', 'argentina-secret');
    const chileAdmin = await loginAdmin(api.base, 'chile', 'chile-secret');
    await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: argAdmin, body: { code: 'SameCode77' } });
    await send(api.base, '/ct/admin/patch-code', { method: 'PUT', token: chileAdmin, body: { code: 'SameCode77' } });

    for (const [office, keyword] of [['argentina', 'onion'], ['chile', 'river']]) {
      const listed = await send(api.base, `/ct/teams?office=${office}`);
      const token = await loginTeam(api.base, office, listed.body.teams[0].id, keyword);
      await send(api.base, '/ct/team/start', { method: 'POST', token });
      const finish = await send(api.base, '/ct/finish', { method: 'POST', token, body: { code: 'SameCode77' } });
      assert.equal(finish.body.session.status, 'finished');
      for (const payload of [listed.body, await send(api.base, '/ct/session', { token }), finish]) {
        assert.equal(JSON.stringify(payload).includes('SameCode77'), false);
      }
    }
  } finally {
    await api.close();
  }
});
