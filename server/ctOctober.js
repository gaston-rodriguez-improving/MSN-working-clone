const crypto = require('crypto');
const express = require('express');

const LIMIT_MS = 60 * 60 * 1000;
const RESET_ERROR = 'team_reset';
const OFFICES = ['argentina', 'chile'];
const SEED = {
  argentina: ['onion', 'candle', 'marble', 'pencil', 'rocket', 'garden', 'button', 'silver', 'maple', 'comet'],
  chile: ['river', 'copper', 'anchor', 'pebble', 'lantern', 'cactus', 'violin', 'harbor', 'quartz', 'falcon'],
};

function normalizeCode(value) {
  return String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
}

function keywordsMatch(stored, input) {
  return String(stored ?? '').trim().toLowerCase() === String(input ?? '').trim().toLowerCase();
}

function codesMatch(storedCode, input) {
  if (!storedCode) return false;
  return normalizeCode(storedCode) === normalizeCode(input);
}

function validatePatchCode(input, defaults = []) {
  if (input == null || String(input).trim() === '') return 'Enter a code';
  const raw = String(input).trim();
  if (raw.length > 48 || !/^[A-Za-z0-9 -]+$/.test(raw)) return 'Use only letters, numbers, spaces and dashes';
  const normalized = normalizeCode(raw);
  if (!/^[A-Z0-9]{4,32}$/.test(normalized)) return 'Use 4 to 32 letters or numbers';
  const rejected = new Set(defaults.filter(v => v != null && String(v).trim() !== '').map(v => normalizeCode(v)));
  if (rejected.has(normalized)) return 'Choose a code different from the default';
  return null;
}

async function seedOfficeCode(db, config, office) {
  await db.query(
    `-- ct:code-seed
    INSERT INTO ct_office_settings (company_id, event_id, office, patch_code, is_default, updated_at)
    VALUES ($1,$2,$3,$4,TRUE,$5) ON CONFLICT (company_id, event_id, office) DO NOTHING`,
    [config.companyId, config.eventId, office, String(process.env.Y2K_PATCH_CODE ?? '').trim() || 'Y2KPATCH99', new Date().toISOString()]
  );
}

function secretsMatch(expected, given) {
  const left = Buffer.from(String(expected ?? ''));
  const right = Buffer.from(String(given ?? ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function elapsedMs(startedAt, finishedAt, now) {
  if (!startedAt) return null;
  const end = finishedAt ? new Date(finishedAt).getTime() : now;
  return Math.max(0, end - new Date(startedAt).getTime());
}

function sessionStatus(startedAt, finishedAt) {
  if (finishedAt) return 'finished';
  if (startedAt) return 'running';
  return 'ready';
}

function sessionView(row, now) {
  const startedAt = row?.started_at ? new Date(row.started_at).toISOString() : null;
  const finishedAt = row?.finished_at ? new Date(row.finished_at).toISOString() : null;
  const status = sessionStatus(startedAt, finishedAt);
  const elapsed = elapsedMs(startedAt, finishedAt, now);
  return {
    startedAt,
    finishedAt,
    elapsedMs: elapsed,
    status,
    overtime: status === 'running' && elapsed > LIMIT_MS,
    serverNow: new Date(now).toISOString(),
  };
}

function podium(teams) {
  return teams
    .filter(team => team.status === 'finished')
    .slice()
    .sort((a, b) => a.elapsedMs - b.elapsedMs || a.name.localeCompare(b.name))
    .map((team, index) => ({ place: index + 1, id: team.id, name: team.name, elapsedMs: team.elapsedMs }));
}

function validOffice(office) {
  return OFFICES.includes(office);
}

async function seedCtOffices(db, config) {
  for (const office of OFFICES) {
    await seedOfficeCode(db, config, office);
    const count = await db.query(
      `-- ct:count
      SELECT COUNT(*)::int AS count FROM ct_teams WHERE company_id=$1 AND event_id=$2 AND office=$3`,
      [config.companyId, config.eventId, office]
    );
    if (Number(count.rows[0].count) > 0) continue;
    for (let index = 0; index < SEED[office].length; index += 1) {
      await db.query(
        `-- ct:seed-insert
        INSERT INTO ct_teams (company_id, event_id, office, name, keyword) VALUES ($1,$2,$3,$4,$5)`,
        [config.companyId, config.eventId, office, `Team ${index + 1}`, SEED[office][index]]
      );
    }
  }
}

function createCtRouter({ db, jwt, config, now = () => Date.now() }) {
  const router = express.Router();
  const clock = () => now();
  const scope = () => [config.companyId, config.eventId];

  const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

  function claimsFor(req, role) {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return null;
    try {
      const claims = jwt.verify(token, config.jwtSecret);
      if (claims.role !== role || claims.companyId !== config.companyId || claims.eventId !== config.eventId) return null;
      return claims;
    } catch {
      return null;
    }
  }

  async function loadSession(teamId) {
    const result = await db.query(
      `-- ct:session
      SELECT started_at, finished_at FROM ct_sessions WHERE team_id=$1`,
      [teamId]
    );
    return result.rows[0] || null;
  }

  router.get('/teams', asyncRoute(async (req, res) => {
    if (!validOffice(req.query.office)) return res.status(400).json({ error: 'Unknown office' });
    const result = await db.query(
      `-- ct:public-teams
      SELECT id, name FROM ct_teams WHERE company_id=$1 AND event_id=$2 AND office=$3 ORDER BY id`,
      [...scope(), req.query.office]
    );
    res.json({ teams: result.rows.map(row => ({ id: row.id, name: row.name })) });
  }));

  router.post('/team/login', asyncRoute(async (req, res) => {
    const office = req.body?.office;
    const teamId = Number(req.body?.teamId);
    if (!validOffice(office) || !teamId) return res.status(400).json({ error: 'Unknown office' });
    const result = await db.query(
      `-- ct:team-by-id
      SELECT id, office, keyword FROM ct_teams WHERE id=$1 AND office=$2 AND company_id=$3 AND event_id=$4`,
      [teamId, office, ...scope()]
    );
    const team = result.rows[0];
    if (!team || !keywordsMatch(team.keyword, req.body?.keyword)) return res.status(401).json({ error: 'Wrong keyword' });
    const token = jwt.sign({ role: 'ct-team', teamId: team.id, office, companyId: config.companyId, eventId: config.eventId }, config.jwtSecret, { expiresIn: '12h' });
    res.json({ token, session: sessionView(await loadSession(team.id), clock()) });
  }));

  router.post('/team/start', asyncRoute(async (req, res) => {
    const claims = claimsFor(req, 'ct-team');
    if (!claims) return res.status(401).json({ error: 'Authentication required' });
    const started = new Date(clock()).toISOString();
    const result = await db.query(
      `-- ct:start
      INSERT INTO ct_sessions (team_id, started_at) VALUES ($1, $2)
      ON CONFLICT (team_id) DO UPDATE SET started_at = COALESCE(ct_sessions.started_at, EXCLUDED.started_at)
      RETURNING started_at, finished_at`,
      [claims.teamId, started]
    );
    res.json({ session: sessionView(result.rows[0], clock()) });
  }));

  router.get('/session', asyncRoute(async (req, res) => {
    const claims = claimsFor(req, 'ct-team');
    if (!claims) return res.status(401).json({ error: 'Authentication required' });
    res.json({ session: sessionView(await loadSession(claims.teamId), clock()) });
  }));

  router.post('/finish', asyncRoute(async (req, res) => {
    const claims = claimsFor(req, 'ct-team');
    if (!claims) return res.status(401).json({ error: 'Authentication required' });
    const current = await loadSession(claims.teamId);
    if (!current?.started_at) return res.status(409).json({ error: RESET_ERROR });
    await seedOfficeCode(db, config, claims.office);
    const stored = await db.query(
      `-- ct:code-get
      SELECT patch_code FROM ct_office_settings WHERE company_id=$1 AND event_id=$2 AND office=$3`,
      [...scope(), claims.office]
    );
    if (!codesMatch(stored.rows[0]?.patch_code, req.body?.code)) return res.status(401).json({ error: 'Wrong code' });
    if (current.finished_at) return res.json({ session: sessionView(current, clock()) });
    const finished = new Date(clock()).toISOString();
    const result = await db.query(
      `-- ct:finish
      UPDATE ct_sessions SET finished_at = COALESCE(finished_at, $2) WHERE team_id=$1 AND started_at IS NOT NULL
      RETURNING started_at, finished_at`,
      [claims.teamId, finished]
    );
    res.json({ session: sessionView(result.rows[0], clock()) });
  }));

  router.get('/admin/patch-code', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    await seedOfficeCode(db, config, office);
    const stored = await db.query(
      `-- ct:code-get
      SELECT patch_code, is_default, updated_at FROM ct_office_settings WHERE company_id=$1 AND event_id=$2 AND office=$3`,
      [...scope(), office]
    );
    const row = stored.rows[0];
    return res.json({ patchCode: row.patch_code, isDefault: row.is_default, updatedAt: row.updated_at });
  }));

  router.put('/admin/patch-code', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const error = validatePatchCode(req.body?.code, ['Y2KPATCH99', process.env.Y2K_PATCH_CODE]);
    if (error) return res.status(400).json({ error });
    await seedOfficeCode(db, config, office);
    const patchCode = String(req.body.code).trim();
    const result = await db.query(
      `-- ct:code-put
      UPDATE ct_office_settings SET patch_code = $4, is_default = FALSE, updated_at = $5
      WHERE company_id=$1 AND event_id=$2 AND office=$3 RETURNING patch_code, is_default, updated_at`,
      [...scope(), office, patchCode, new Date(now()).toISOString()]
    );
    const row = result.rows[0];
    return res.json({ patchCode: row.patch_code, isDefault: row.is_default, updatedAt: row.updated_at });
  }));

  router.post('/admin/login', asyncRoute(async (req, res) => {
    const office = req.body?.office;
    if (!validOffice(office)) return res.status(400).json({ error: 'Unknown office' });
    const expected = office === 'argentina' ? process.env.CT_ADMIN_PASSWORD_ARGENTINA : process.env.CT_ADMIN_PASSWORD_CHILE;
    if (!secretsMatch(expected, req.body?.password)) return res.status(401).json({ error: 'Wrong password' });
    const token = jwt.sign({ role: 'ct-admin', office, companyId: config.companyId, eventId: config.eventId }, config.jwtSecret, { expiresIn: '12h' });
    res.json({ token });
  }));

  function adminOffice(req, res) {
    const claims = claimsFor(req, 'ct-admin');
    if (!claims) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }
    return claims.office;
  }

  async function boardFor(office) {
    const result = await db.query(
      `-- ct:board
      SELECT t.id, t.name, t.keyword, s.started_at, s.finished_at
      FROM ct_teams t LEFT JOIN ct_sessions s ON s.team_id = t.id
      WHERE t.company_id=$1 AND t.event_id=$2 AND t.office=$3 ORDER BY t.id`,
      [...scope(), office]
    );
    const moment = clock();
    const teams = result.rows.map(row => {
      const session = sessionView(row, moment);
      return { id: row.id, name: row.name, keyword: row.keyword, ...session };
    });
    return {
      teams,
      runningCount: teams.filter(team => team.status === 'running').length,
      podium: podium(teams),
    };
  }

  router.get('/admin/teams', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const result = await db.query(
      `-- ct:admin-teams
      SELECT id, name, keyword FROM ct_teams WHERE company_id=$1 AND event_id=$2 AND office=$3 ORDER BY id`,
      [...scope(), office]
    );
    return res.json({ teams: result.rows });
  }));

  router.post('/admin/teams', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const name = String(req.body?.name || '').trim();
    const keyword = String(req.body?.keyword || '').trim();
    if (!name || !keyword) return res.status(400).json({ error: 'Name and keyword are required' });
    const result = await db.query(
      `-- ct:admin-insert
      INSERT INTO ct_teams (company_id, event_id, office, name, keyword) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, keyword`,
      [...scope(), office, name, keyword]
    );
    return res.status(201).json({ team: result.rows[0] });
  }));

  router.patch('/admin/teams/:id', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const name = req.body?.name == null ? null : String(req.body.name).trim();
    const keyword = req.body?.keyword == null ? null : String(req.body.keyword).trim();
    const result = await db.query(
      `-- ct:admin-update
      UPDATE ct_teams SET name = COALESCE($5, name), keyword = COALESCE($6, keyword)
      WHERE id=$1 AND office=$2 AND company_id=$3 AND event_id=$4 RETURNING id, name, keyword`,
      [Number(req.params.id), office, ...scope(), name || null, keyword || null]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Team not found' });
    return res.json({ team: result.rows[0] });
  }));

  router.delete('/admin/teams/:id', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const result = await db.query(
      `-- ct:admin-delete
      DELETE FROM ct_teams WHERE id=$1 AND office=$2 AND company_id=$3 AND event_id=$4 RETURNING id`,
      [Number(req.params.id), office, ...scope()]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Team not found' });
    return res.json({ ok: true });
  }));

  router.get('/admin/board', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    return res.json(await boardFor(office));
  }));

  router.post('/admin/teams/:id/reset', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const teamId = Number(req.params.id);
    const running = await db.query(
      `-- ct:team-running
      SELECT COUNT(*)::int AS count FROM ct_sessions s JOIN ct_teams t ON t.id = s.team_id
      WHERE s.team_id=$1 AND t.office=$2 AND t.company_id=$3 AND t.event_id=$4
        AND s.started_at IS NOT NULL AND s.finished_at IS NULL`,
      [teamId, office, ...scope()]
    );
    const cleared = await db.query(
      `-- ct:team-reset
      UPDATE ct_sessions s SET started_at = NULL, finished_at = NULL FROM ct_teams t
      WHERE s.team_id = t.id AND s.team_id=$1 AND t.office=$2 AND t.company_id=$3 AND t.event_id=$4
      RETURNING s.team_id`,
      [teamId, office, ...scope()]
    );
    if (!cleared.rows[0]) {
      const team = await db.query(
        `-- ct:team-by-id
        SELECT id FROM ct_teams WHERE id=$1 AND office=$2 AND company_id=$3 AND event_id=$4`,
        [teamId, office, ...scope()]
      );
      if (!team.rows[0]) return res.status(404).json({ error: 'Team not found' });
    }
    return res.json({ runningCount: Number(running.rows[0].count) });
  }));

  router.post('/admin/reset', asyncRoute(async (req, res) => {
    const office = adminOffice(req, res);
    if (!office) return undefined;
    const running = await db.query(
      `-- ct:running-count
      SELECT COUNT(*)::int AS count FROM ct_sessions s JOIN ct_teams t ON t.id = s.team_id
      WHERE t.company_id=$1 AND t.event_id=$2 AND t.office=$3 AND s.started_at IS NOT NULL AND s.finished_at IS NULL`,
      [...scope(), office]
    );
    await db.query(
      `-- ct:reset
      UPDATE ct_sessions s SET started_at = NULL, finished_at = NULL FROM ct_teams t
      WHERE s.team_id = t.id AND t.company_id=$1 AND t.event_id=$2 AND t.office=$3`,
      [...scope(), office]
    );
    return res.json({ runningCount: Number(running.rows[0].count) });
  }));

  return router;
}

module.exports = {
  LIMIT_MS,
  RESET_ERROR,
  SEED,
  codesMatch,
  elapsedMs,
  keywordsMatch,
  podium,
  secretsMatch,
  seedCtOffices,
  validatePatchCode,
  sessionView,
  createCtRouter,
};
