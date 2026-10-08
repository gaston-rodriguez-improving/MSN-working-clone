const { nudgeLeaders } = require('./adminMetrics');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { WebSocketServer, WebSocket } = require('ws');
const { accountNameFromClaims } = require('./accountName');
const { parseYouTubeVideoId } = require('./music');
const { ensureFotologUrl } = require('./fotologUrls');

const root = __dirname;
const db = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false
});
const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  companyId: process.env.COMPANY_ID || 'default-company',
  eventId: process.env.EVENT_ID || 'default-event',
  azureAdTenantId: process.env.AZURE_AD_TENANT_ID || '',
  azureAdClientId: process.env.AZURE_AD_CLIENT_ID || '',
  allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
  timezone: process.env.ADMIN_TIMEZONE || 'America/Argentina/Buenos_Aires'
};
const adminEmails = new Set(['gaston.rodriguez@improving.com', 'diana.corigliano@improving.com']);
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(x => x.trim()) : true }));
app.use('/fotolog', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '1mb' }));
const publicUser = row => row && ({ id: row.id, email: row.email, username: row.username, accountName: row.account_name, status: row.status, bio: row.bio, avatar: row.avatar, banner: row.banner });
const tokenFor = (user, authProvider = 'password') => jwt.sign({ sub: user.id, companyId: user.company_id, eventId: user.event_id, authProvider }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
async function getUser(id) { return (await db.query('SELECT * FROM users WHERE id = $1 AND company_id = $2 AND event_id = $3', [id, config.companyId, config.eventId])).rows[0]; }
function emailAllowed(email) { return !config.allowedDomains.length || config.allowedDomains.includes(String(email).toLowerCase().split('@')[1]); }
function auth(req, res, next) {
  const header = req.get('authorization') || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  let claims;
  try { claims = jwt.verify(token, config.jwtSecret); } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
  if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) return res.status(401).json({ error: 'Invalid or expired token' });
  getUser(Number(claims.sub)).then(user => { if (!user) return res.status(401).json({ error: 'Invalid or expired token' }); req.user = user; req.authProvider = claims.authProvider; next(); }).catch(next);
}
async function isAdminRequest(req) {
  if (req.authProvider !== 'microsoft') return false;
  const email = normalizeEmail(req.user.email);
  return adminEmails.has(email) || !!(await db.query('SELECT 1 FROM admin_users WHERE email = $1', [email])).rows[0];
}
async function conversation(id) { return (await db.query('SELECT * FROM conversations WHERE id = $1 AND company_id = $2 AND event_id = $3', [id, config.companyId, config.eventId])).rows[0]; }
async function member(conversationId, userId) { return !!(await db.query('SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId])).rows[0]; }
async function messageView(row) { return { id: row.id, chatId: row.conversation_id, senderId: row.sender_id, sender: publicUser(await getUser(row.sender_id)), content: row.content, drawAttention: !!row.draw_attention, winks: !!row.winks, createdAt: row.created_at }; }
async function messageViews(rows) { return Promise.all(rows.map(messageView)); }
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const adminAuth = asyncRoute(async (req, res, next) => { if (!await isAdminRequest(req)) return res.status(403).json({ error: 'Admin access denied' }); next(); });
async function recordPresence(userIds) {
  if (userIds.length) await db.query('INSERT INTO user_presence_days (user_id, day) SELECT unnest($1::int[]), (now() AT TIME ZONE $2)::date ON CONFLICT DO NOTHING', [userIds, config.timezone]);
}
const normalizeContactPreferences = preferences => {
  const categories = (Array.isArray(preferences?.categories) ? preferences.categories : [])
    .filter(category => category?.id && category?.name)
    .slice(0, 200)
    .map(category => ({ id: String(category.id).slice(0, 80), name: String(category.name).trim().slice(0, 40) }))
    .filter(category => category.name);
  const categoryIds = new Set(categories.map(category => category.id));
  const favorites = [...new Set((Array.isArray(preferences?.favorites) ? preferences.favorites : [])
    .map(String).filter(id => /^\d+$/.test(id)))].slice(0, 10000);
  const assignments = Object.fromEntries(Object.entries(preferences?.assignments && typeof preferences.assignments === 'object' ? preferences.assignments : {})
    .filter(([contactId, ids]) => /^\d+$/.test(contactId) && Array.isArray(ids))
    .slice(0, 10000)
    .map(([contactId, ids]) => [contactId, [...new Set(ids.map(String).filter(id => categoryIds.has(id)))]]));
  return { favorites, categories, assignments, layout: preferences?.layout === 'categories' ? 'categories' : 'status' };
};
async function initializeDatabase() {
  for (const key of ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD']) if (!process.env[key]) throw new Error(`${key} is required`);
  await db.query(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
  await db.query("INSERT INTO admin_users (email, added_by) SELECT unnest($1::text[]), 'system' ON CONFLICT DO NOTHING", [[...adminEmails]]);
  const email = 'fotolog-leni@system.invalid';
  let leni = (await db.query('SELECT * FROM users WHERE email=$1 AND company_id=$2 AND event_id=$3', [email, config.companyId, config.eventId])).rows[0];
  if (!leni) {
    const username = await uniqueUsername(email, 'fotolog-leni');
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    leni = (await db.query(`INSERT INTO users(email,username,password_hash,company_id,event_id,account_name,is_managed_profile)
      VALUES($1,$2,$3,$4,$5,'Leni',TRUE) RETURNING *`, [email, username, passwordHash, config.companyId, config.eventId])).rows[0];
  } else {
    await db.query('UPDATE users SET is_managed_profile=TRUE, account_name=CASE WHEN account_name=\'\' THEN \'Leni\' ELSE account_name END WHERE id=$1', [leni.id]);
  }
  await db.query("INSERT INTO fotolog_profiles(user_id,name,description,theme) VALUES($1,'Leni','La mascota de la empresa 🐾','{}') ON CONFLICT(user_id) DO NOTHING", [leni.id]);
  await ensureFotologUrl(db, leni.id);
}
require('./fotolog')(app, { db, auth, asyncRoute, getUser, config, isAdminRequest });
app.get('/health', (_req, res) => res.json({ ok: true }));
const adminScope = () => [config.companyId, config.eventId];
const adminView = row => ({ email: row.email, username: row.username || null, addedBy: row.added_by, createdAt: row.created_at, isOwner: adminEmails.has(row.email) });
async function listAdmins() {
  return (await db.query(`SELECT a.email, a.added_by, a.created_at, u.username FROM admin_users a
    LEFT JOIN users u ON u.email = a.email AND u.company_id = $1 AND u.event_id = $2 ORDER BY a.created_at, a.email`, adminScope())).rows.map(adminView);
}
app.get('/admin/metrics', auth, adminAuth, asyncRoute(async (_req, res) => {
  const scope = adminScope();
  const [users, onlineByDay, totals, winks, leaders] = await Promise.all([
    db.query(`SELECT COUNT(*) FILTER (WHERE email !~* 'test')::int AS total, COUNT(*) FILTER (WHERE email ~* 'test')::int AS testers
      FROM users WHERE company_id = $1 AND event_id = $2`, scope),
    db.query(`WITH today AS (SELECT (now() AT TIME ZONE $3)::date AS day)
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COUNT(DISTINCT p.user_id)::int AS count
      FROM today, generate_series((today.day - 13)::timestamp, today.day::timestamp, INTERVAL '1 day') AS d(day)
      LEFT JOIN (user_presence_days p JOIN users u ON u.id = p.user_id AND u.company_id = $1 AND u.event_id = $2 AND u.email !~* 'test')
        ON p.day = d.day::date
      GROUP BY d.day ORDER BY d.day`, [...scope, config.timezone]),
    db.query(`SELECT
      (SELECT COUNT(*)::int FROM event_music_tracks WHERE company_id = $1 AND event_id = $2) AS songs_added,
      (SELECT COUNT(*)::int FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.company_id = $1 AND c.event_id = $2 AND m.draw_attention) AS nudges,
      (SELECT COUNT(*)::int FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.company_id = $1 AND c.event_id = $2 AND NOT m.draw_attention AND NOT m.winks) AS messages,
      (SELECT COUNT(*)::int FROM friend_requests fr JOIN users u ON u.id = fr.recipient_id WHERE u.company_id = $1 AND u.event_id = $2 AND fr.status = 'accepted') AS friends_added`, scope),
    db.query(`SELECT m.content AS name, COUNT(*)::int AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id
      WHERE c.company_id = $1 AND c.event_id = $2 AND m.winks GROUP BY m.content ORDER BY count DESC, name LIMIT 5`, scope),
    nudgeLeaders(db, scope)
  ]);
  const t = totals.rows[0];
  res.set('Cache-Control', 'no-store').json({
    generatedAt: new Date().toISOString(), timezone: config.timezone,
    users: { total: users.rows[0].total, testersExcluded: users.rows[0].testers },
    onlineByDay: onlineByDay.rows,
    fun: { songsAdded: t.songs_added, nudges: t.nudges, messages: t.messages, friendsAdded: t.friends_added, topWinks: winks.rows, ...leaders }
  });
}));
app.get('/admin/admins', auth, adminAuth, asyncRoute(async (_req, res) => res.set('Cache-Control', 'no-store').json({ admins: await listAdmins() })));
app.post('/admin/admins', auth, adminAuth, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'A valid email is required' });
  if (!emailAllowed(email)) return res.status(400).json({ error: 'Email domain is not allowed' });
  const inserted = await db.query('INSERT INTO admin_users (email, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING email', [email, normalizeEmail(req.user.email)]);
  if (!inserted.rows[0]) return res.status(409).json({ error: 'This person is already an administrator' });
  res.status(201).json({ admins: await listAdmins() });
}));
app.delete('/admin/admins/:email', auth, adminAuth, asyncRoute(async (req, res) => {
  const email = normalizeEmail(req.params.email);
  if (adminEmails.has(email)) return res.status(403).json({ error: 'The original administrators cannot be removed' });
  if (email === normalizeEmail(req.user.email)) return res.status(400).json({ error: 'You cannot remove yourself' });
  const removed = await db.query('DELETE FROM admin_users WHERE email = $1 RETURNING email', [email]);
  if (!removed.rows[0]) return res.status(404).json({ error: 'Administrator not found' });
  res.json({ admins: await listAdmins() });
}));
app.post('/auth/sign-up', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {}; const username = String(req.body?.username || req.body?.name || '').trim();
  if (!email || !password || !username) return res.status(400).json({ error: 'email, username and password are required' });
  if (limitError('username', username)) return res.status(400).json({ error: limitError('username', username) });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!emailAllowed(email)) return res.status(403).json({ error: 'Email domain is not allowed' });
  try { const hash = await bcrypt.hash(String(password), 12); const result = await db.query('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [String(email).trim().toLowerCase(), username, hash, config.companyId, config.eventId, req.body.status || 'offline']); const user = await getUser(result.rows[0].id); await ensureMusicFolders(user.id); res.status(201).json({ access_token: tokenFor(user), user: publicUser(user) }); }
  catch (error) { res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Email or username already exists' : 'Could not create account' }); }
}));
app.post('/auth/sign-in', asyncRoute(async (req, res) => { const email = String(req.body?.email || '').trim().toLowerCase(); const user = (await db.query('SELECT * FROM users WHERE email = $1 AND company_id = $2 AND event_id = $3', [email, config.companyId, config.eventId])).rows[0]; if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' }); await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]); const updated = await getUser(user.id); await ensureMusicFolders(updated.id); res.status(200).json({ access_token: tokenFor(updated), user: publicUser(updated) }); }));
async function verifyAzureAdIdToken(idToken) { if (!config.azureAdTenantId || !config.azureAdClientId) throw new Error('Azure AD SSO is not configured'); const { createRemoteJWKSet, jwtVerify } = await import('jose'); const authority = `https://login.microsoftonline.com/${config.azureAdTenantId}`; const issuer = `${authority}/v2.0`; const jwks = createRemoteJWKSet(new URL(`${authority}/discovery/v2.0/keys`)); const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: config.azureAdClientId }); return payload; }
async function uniqueUsername(email, name) { let display = String(name || '').normalize('NFC').replace(/[^\p{L}\p{N} ._'-]/gu, ' ').replace(/\s+/g, ' ').trim(); const comma = display.match(/^([^,]+),\s*(.+)$/); if (comma) display = `${comma[2]} ${comma[1]}`.replace(/\s+/g, ' ').trim(); const base = (display || String(email.split('@')[0]).replace(/[^a-zA-Z0-9._-]/g, '')).slice(0, 40).trim() || 'user'; let username = base; let suffix = 1; while ((await db.query('SELECT 1 FROM users WHERE username = $1 AND company_id = $2 AND event_id = $3', [username, config.companyId, config.eventId])).rows[0]) username = `${base}${suffix++}`; return username; }
app.post('/auth/microsoft', asyncRoute(async (req, res) => { try { const claims = await verifyAzureAdIdToken(String(req.body?.id_token || '')); const email = String(claims.preferred_username || claims.email || '').trim().toLowerCase(); if (!email || !emailAllowed(email)) return res.status(403).json({ error: 'Your Microsoft account is not allowed' }); let user = (await db.query('SELECT * FROM users WHERE email = $1 AND company_id = $2 AND event_id = $3', [email, config.companyId, config.eventId])).rows[0]; if (!user) { const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12); const username = await uniqueUsername(email, claims.name); const result = await db.query('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [email, username, passwordHash, config.companyId, config.eventId, 'online']); user = await getUser(result.rows[0].id); } else await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]); const accountName = accountNameFromClaims(claims); if (accountName) await db.query('UPDATE users SET account_name = $1 WHERE id = $2', [accountName, user.id]); const updated = await getUser(user.id); await ensureMusicFolders(updated.id); res.status(200).json({ access_token: tokenFor(updated, 'microsoft'), user: publicUser(updated) }); } catch (error) { console.error('Microsoft Entra authentication failed:', error.message); res.status(401).json({ error: 'Microsoft sign-in failed. Check the Entra app configuration and try again.' }); } }));
app.get('/auth/check-token', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/contact-preferences', auth, asyncRoute(async (req, res) => {
  const row = (await db.query('SELECT preferences FROM user_contact_preferences WHERE user_id = $1', [req.user.id])).rows[0];
  res.json({ exists: Boolean(row), preferences: normalizeContactPreferences(row?.preferences) });
}));
app.put('/contact-preferences', auth, asyncRoute(async (req, res) => {
  const submitted = req.body?.preferences;
  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) return res.status(400).json({ error: 'Contact preferences are required' });
  const preferences = normalizeContactPreferences(submitted);
  const result = await db.query(`INSERT INTO user_contact_preferences (user_id, preferences) VALUES ($1, $2::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = CURRENT_TIMESTAMP RETURNING preferences`, [req.user.id, JSON.stringify(preferences)]);
  res.json({ preferences: result.rows[0].preferences });
}));
app.get('/users', auth, asyncRoute(async (req, res) => { const search = `%${String(req.query.search || '').trim()}%`; const rows = (await db.query('SELECT * FROM users WHERE company_id = $1 AND event_id = $2 AND id != $3 AND (username ILIKE $4 OR email ILIKE $4) ORDER BY lower(username)', [config.companyId, config.eventId, req.user.id, search])).rows; res.json({ users: rows.map(publicUser) }); }));

let catalogRevision = 0;
const musicTrackView = (row, userId, isAdmin = false) => ({ id: row.id, videoId: row.video_id, title: row.title, artist: row.artist, folderId: row.folder_id, contributor: { id: row.contributor_id, username: row.contributor_username }, createdAt: row.created_at, canRemove: row.contributor_id === userId || isAdmin });
const musicTrackSelect = `SELECT t.*, u.username AS contributor_username, u.email AS contributor_email FROM event_music_tracks t JOIN users u ON u.id = t.contributor_id`;
async function ensureMusicFolders(userId) {
  const scope = [config.companyId, config.eventId];
  await db.query(`INSERT INTO event_music_folders(company_id,event_id,name) SELECT $1,$2,'Improving'
    WHERE NOT EXISTS(SELECT 1 FROM event_music_folders WHERE company_id=$1 AND event_id=$2) ON CONFLICT DO NOTHING`, scope);
  await db.query(`INSERT INTO event_music_folders(company_id,event_id,name,owner_id) VALUES($1,$2,'Personal',$3)
    ON CONFLICT DO NOTHING`, [...scope, userId]);
}
const musicFolderView = row => ({ id: row.id, name: row.name, isPersonal: row.owner_id != null });
async function accessibleFolder(folderId, userId, client = db) {
  return (await client.query(`SELECT * FROM event_music_folders WHERE id=$1 AND company_id=$2 AND event_id=$3
    AND deleted_at IS NULL AND (owner_id IS NULL OR owner_id=$4)`, [folderId, config.companyId, config.eventId, userId])).rows[0];
}
async function broadcastCatalogChange(folder) {
  const query = folder?.owner_id == null
    ? ['SELECT id FROM users WHERE company_id=$1 AND event_id=$2', [config.companyId, config.eventId]]
    : ['SELECT id FROM users WHERE id=$1 AND company_id=$2 AND event_id=$3', [folder.owner_id, config.companyId, config.eventId]];
  const ids = (await db.query(query[0], query[1])).rows.map(x => x.id);
  broadcast(ids, 'music_catalog_changed', { scope: { companyId: config.companyId, eventId: config.eventId }, revision: ++catalogRevision });
}
app.get('/music/folders', auth, asyncRoute(async (req, res) => {
  await ensureMusicFolders(req.user.id);
  const rows = (await db.query(`SELECT * FROM event_music_folders WHERE company_id=$1 AND event_id=$2
    AND deleted_at IS NULL AND (owner_id IS NULL OR owner_id=$3) ORDER BY (owner_id IS NOT NULL), lower(name), id`, [config.companyId, config.eventId, req.user.id])).rows;
  res.set('Cache-Control','no-store').json({ folders: rows.map(musicFolderView) });
}));
app.post('/music/folders', auth, asyncRoute(async (req, res) => {
  await ensureMusicFolders(req.user.id);
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 80) return res.status(400).json({ error: 'Folder name is required and must be at most 80 characters' });
  if (/^personal(?: \(not shared\))?$/i.test(name)) return res.status(400).json({ error: 'Personal is reserved for your private folder' });
  try {
    const row = (await db.query(`INSERT INTO event_music_folders(company_id,event_id,name) VALUES($1,$2,$3) RETURNING *`, [config.companyId, config.eventId, name])).rows[0];
    await broadcastCatalogChange(row); res.status(201).json({ folder: musicFolderView(row) });
  } catch (error) { if (error.code === '23505') return res.status(409).json({ error: 'A folder with this name already exists' }); throw error; }
}));
app.get('/admin/music/folders', auth, adminAuth, asyncRoute(async (_req, res) => {
  const rows = (await db.query(`SELECT * FROM event_music_folders WHERE company_id=$1 AND event_id=$2 AND deleted_at IS NULL AND owner_id IS NULL ORDER BY lower(name),id`, [config.companyId, config.eventId])).rows;
  res.set('Cache-Control','no-store').json({ folders: rows.map(musicFolderView) });
}));
app.delete('/admin/music/folders/:id', auth, adminAuth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Folder not found' });
  const folder = (await db.query(`SELECT * FROM event_music_folders WHERE id=$1 AND company_id=$2 AND event_id=$3 AND owner_id IS NULL AND deleted_at IS NULL`, [id, config.companyId, config.eventId])).rows[0];
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  const client = await db.connect();
  let clearedUsers = [];
  try {
    await client.query('BEGIN');
    clearedUsers = (await client.query(`SELECT a.user_id FROM user_music_activities a JOIN event_music_tracks t ON t.id=a.track_id WHERE t.folder_id=$1 FOR UPDATE`, [id])).rows.map(row => row.user_id);
    for (const userId of clearedUsers) {
      await client.query('INSERT INTO user_music_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
      const revision = Number((await client.query('SELECT revision FROM user_music_preferences WHERE user_id=$1 FOR UPDATE', [userId])).rows[0].revision) + 1;
      await client.query('DELETE FROM user_music_activities WHERE user_id=$1', [userId]);
      await client.query('UPDATE user_music_preferences SET revision=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [userId, revision]);
    }
    await client.query('UPDATE event_music_folders SET deleted_at=CURRENT_TIMESTAMP WHERE id=$1', [id]);
    await client.query('UPDATE event_music_tracks SET removed_at=CURRENT_TIMESTAMP,removed_by=$2 WHERE folder_id=$1 AND removed_at IS NULL', [id, req.user.id]);
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  for (const userId of clearedUsers) {
    const revision = Number((await db.query('SELECT revision FROM user_music_preferences WHERE user_id=$1', [userId])).rows[0]?.revision || 0);
    await sendListening(userId, listeningEnvelope(userId, revision, null));
  }
  await broadcastCatalogChange(folder); res.json({ ok: true });
}));
app.get('/music/tracks', auth, asyncRoute(async (req, res) => {
  await ensureMusicFolders(req.user.id);
  const folderId = req.query.folderId == null ? (await db.query(`SELECT id FROM event_music_folders WHERE company_id=$1 AND event_id=$2 AND owner_id IS NULL AND deleted_at IS NULL ORDER BY (name='Improving') DESC,id LIMIT 1`, [config.companyId, config.eventId])).rows[0]?.id : Number(req.query.folderId);
  if (folderId == null && req.query.folderId == null) return res.json({ tracks: [] });
  if (!Number.isSafeInteger(Number(folderId))) return res.status(400).json({ error: 'Invalid folderId' });
  if (!await accessibleFolder(folderId, req.user.id)) return res.status(404).json({ error: 'Folder not found' });
  const rows = (await db.query(`${musicTrackSelect} WHERE t.company_id = $1 AND t.event_id = $2 AND t.folder_id=$3 AND t.removed_at IS NULL ORDER BY t.id`, [config.companyId, config.eventId, folderId])).rows;
  const isAdmin = await isAdminRequest(req);
  res.set('Cache-Control', 'no-store').json({ tracks: rows.map(row => musicTrackView(row, req.user.id, isAdmin)) });
}));
app.get('/music/tracks/:id', auth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Track not found' });
  const row = (await db.query(`${musicTrackSelect} WHERE t.id=$1 AND t.company_id=$2 AND t.event_id=$3 AND t.removed_at IS NULL`, [id,config.companyId,config.eventId])).rows[0];
  if (!row || !await accessibleFolder(row.folder_id,req.user.id)) return res.status(404).json({ error: 'Track not found' });
  res.set('Cache-Control','no-store').json({ track: musicTrackView(row,req.user.id,await isAdminRequest(req)) });
}));
app.post('/music/tracks', auth, asyncRoute(async (req, res) => {
  await ensureMusicFolders(req.user.id);
  const videoId = parseYouTubeVideoId(String(req.body?.url || ''));
  const title = String(req.body?.title || '').trim(); const artist = String(req.body?.artist || '').trim();
  if (!videoId) return res.status(400).json({ error: 'A supported YouTube video URL is required' });
  if (!title || title.length > 120) return res.status(400).json({ error: 'Title is required and must be at most 120 characters' });
  if (artist.length > 80) return res.status(400).json({ error: 'Artist must be at most 80 characters' });
  const requestedFolderId = req.body?.folderId == null ? null : Number(req.body.folderId);
  const folderId = requestedFolderId == null ? Number((await db.query(`SELECT id FROM event_music_folders WHERE company_id=$1 AND event_id=$2 AND owner_id IS NULL AND deleted_at IS NULL ORDER BY (name='Improving') DESC,id LIMIT 1`, [config.companyId, config.eventId])).rows[0]?.id) : requestedFolderId;
  if (!Number.isSafeInteger(folderId) || !await accessibleFolder(folderId, req.user.id)) return res.status(404).json({ error: 'Folder not found' });
  try {
    const inserted = await db.query(`INSERT INTO event_music_tracks(company_id,event_id,video_id,title,artist,contributor_id,folder_id)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [config.companyId, config.eventId, videoId, title, artist, req.user.id, folderId]);
    const row = (await db.query(`${musicTrackSelect} WHERE t.id = $1`, [inserted.rows[0].id])).rows[0];
    const isAdmin = await isAdminRequest(req);
    await broadcastCatalogChange(await accessibleFolder(folderId, req.user.id)); res.status(201).json({ track: musicTrackView(row, req.user.id, isAdmin) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This video is already in this folder' });
    throw error;
  }
}));
app.delete('/music/tracks/:id', auth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Track not found' });
  const row = (await db.query(`SELECT t.*, u.email AS contributor_email FROM event_music_tracks t JOIN users u ON u.id=t.contributor_id JOIN event_music_folders f ON f.id=t.folder_id
    WHERE t.id=$1 AND t.company_id=$2 AND t.event_id=$3 AND t.removed_at IS NULL AND f.deleted_at IS NULL AND (f.owner_id IS NULL OR f.owner_id=$4)`, [id, config.companyId, config.eventId, req.user.id])).rows[0];
  if (!row) return res.status(404).json({ error: 'Track not found' });
  const isAdmin = await isAdminRequest(req);
  if (row.contributor_id !== req.user.id && !isAdmin) return res.status(403).json({ error: 'Only the contributor or an administrator can remove this track' });
  await db.query('UPDATE event_music_tracks SET removed_at=CURRENT_TIMESTAMP, removed_by=$1 WHERE id=$2 AND removed_at IS NULL', [req.user.id, id]);
  await broadcastCatalogChange(await accessibleFolder(row.folder_id, req.user.id)); res.json({ ok: true });
}));
function listeningEnvelope(userId, revision, activity) { return { userId, revision, activity }; }
function activityView(row) { return { userId: row.user_id, username: row.username, sessionId: row.session_id, revision: Number(row.revision), trackId: row.track_id, title: row.title, artist: row.artist, updatedAt: row.updated_at, expiresAt: row.expires_at }; }
async function sendListening(userId, envelope) {
  const pref = (await db.query('SELECT share_activity FROM user_music_preferences WHERE user_id=$1', [userId])).rows[0];
  const friendIds = (envelope.activity === null || pref?.share_activity) ? (await db.query(`SELECT CASE WHEN fr.sender_id=$1 THEN fr.recipient_id ELSE fr.sender_id END AS id
    FROM friend_requests fr JOIN users u ON u.id=CASE WHEN fr.sender_id=$1 THEN fr.recipient_id ELSE fr.sender_id END
    WHERE fr.status='accepted' AND (fr.sender_id=$1 OR fr.recipient_id=$1) AND u.company_id=$2 AND u.event_id=$3`, [userId, config.companyId, config.eventId])).rows.map(row => row.id) : [];
  broadcast([userId, ...friendIds], 'listening_activity', envelope);
}
async function removeExpiredActivities() {
  const client = await db.connect(); const expired = [];
  try {
    await client.query('BEGIN');
    const rows = (await client.query('SELECT user_id FROM user_music_activities WHERE expires_at <= CURRENT_TIMESTAMP ORDER BY user_id')).rows;
    for (const row of rows) {
      await client.query('INSERT INTO user_music_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [row.user_id]);
      const pref = (await client.query('SELECT revision FROM user_music_preferences WHERE user_id=$1 FOR UPDATE', [row.user_id])).rows[0];
      await client.query('SELECT user_id FROM user_music_activities WHERE user_id=$1 FOR UPDATE', [row.user_id]);
      const deleted = (await client.query('DELETE FROM user_music_activities WHERE user_id=$1 AND expires_at <= CURRENT_TIMESTAMP RETURNING user_id', [row.user_id])).rows[0];
      if (deleted) {
        const revision = Number(pref.revision) + 1;
        await client.query('UPDATE user_music_preferences SET revision=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [row.user_id, revision]);
        expired.push({ userId: row.user_id, revision });
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  for (const item of expired) {
    await sendListening(item.userId, listeningEnvelope(item.userId, item.revision, null));
  }
}
const listeningSelect = `SELECT a.*, u.username FROM user_music_activities a JOIN users u ON u.id=a.user_id`;
async function listListening(userId) {
  await removeExpiredActivities();
  return (await db.query(`${listeningSelect} WHERE (a.user_id=$1 OR (EXISTS(SELECT 1 FROM user_music_preferences p WHERE p.user_id=a.user_id AND p.share_activity=TRUE)
    AND EXISTS(SELECT 1 FROM friend_requests fr WHERE fr.status='accepted' AND ((fr.sender_id=$1 AND fr.recipient_id=a.user_id) OR (fr.recipient_id=$1 AND fr.sender_id=a.user_id)))))
    AND u.company_id=$2 AND u.event_id=$3 ORDER BY a.user_id`, [userId, config.companyId, config.eventId])).rows;
}
async function pushListeningSnapshot(userId, targetSocket = null) {
  await removeExpiredActivities();
  const rows = (await db.query(`SELECT u.id AS snapshot_user_id,u.username,COALESCE(p.revision,0) AS preference_revision,
      a.session_id,a.client_sequence,a.track_id,a.title,a.artist,a.revision AS activity_revision,a.started_at,a.updated_at,a.expires_at
    FROM users u
    LEFT JOIN user_music_preferences p ON p.user_id=u.id
    LEFT JOIN user_music_activities a ON a.user_id=u.id
    WHERE u.company_id=$2 AND u.event_id=$3 AND (u.id=$1 OR EXISTS(
      SELECT 1 FROM friend_requests fr WHERE fr.status='accepted' AND ((fr.sender_id=$1 AND fr.recipient_id=u.id) OR (fr.recipient_id=$1 AND fr.sender_id=u.id))))
    ORDER BY u.id`, [userId, config.companyId, config.eventId])).rows;
  const activities = rows.map(row => {
    const revision = Number(row.activity_revision ?? row.preference_revision);
    const activity = row.session_id ? { userId: row.snapshot_user_id, username: row.username, sessionId: row.session_id, revision: Number(row.activity_revision), trackId: row.track_id, title: row.title, artist: row.artist, updatedAt: row.updated_at, expiresAt: row.expires_at } : null;
    return listeningEnvelope(row.snapshot_user_id, revision, activity);
  });
  const message = JSON.stringify({ type: 'listening_snapshot', payload: { activities } });
  if (targetSocket) {
    if (targetSocket.readyState === WebSocket.OPEN) targetSocket.send(message);
  } else broadcast([userId], 'listening_snapshot', { activities });
}
app.get('/music/listening', auth, asyncRoute(async (req, res) => {
  const rows = await listListening(req.user.id);
  res.set('Cache-Control', 'no-store').json({ activities: rows.map(activityView) });
}));
app.get('/music/listening-preference', auth, asyncRoute(async (req, res) => {
  const row = (await db.query('SELECT share_activity FROM user_music_preferences WHERE user_id=$1', [req.user.id])).rows[0];
  res.json({ share: Boolean(row?.share_activity) });
}));
app.put('/music/listening-preference', auth, asyncRoute(async (req, res) => {
  if (typeof req.body?.share !== 'boolean') return res.status(400).json({ error: 'share must be a boolean' });
  const client = await db.connect(); let removed = false; let share; let clearRevision = null;
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO user_music_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [req.user.id]);
    const pref = (await client.query('SELECT revision FROM user_music_preferences WHERE user_id=$1 FOR UPDATE', [req.user.id])).rows[0];
    share = (await client.query('UPDATE user_music_preferences SET share_activity=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING share_activity', [req.user.id, req.body.share])).rows[0].share_activity;
    if (!req.body.share) {
      removed = Boolean((await client.query('DELETE FROM user_music_activities WHERE user_id=$1 RETURNING user_id', [req.user.id])).rows[0]);
      if (removed) {
        clearRevision = Number(pref.revision) + 1;
        await client.query('UPDATE user_music_preferences SET revision=$2 WHERE user_id=$1', [req.user.id, clearRevision]);
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  if (removed) {
    await sendListening(req.user.id, listeningEnvelope(req.user.id, clearRevision, null));
  }
  res.json({ share });
}));
app.get('/friends', auth, asyncRoute(async (req, res) => { const rows = (await db.query("SELECT u.* FROM users u JOIN friend_requests fr ON u.id = CASE WHEN fr.sender_id = $1 THEN fr.recipient_id ELSE fr.sender_id END WHERE (fr.sender_id = $2 OR fr.recipient_id = $3) AND fr.status = 'accepted' AND u.company_id = $4 AND u.event_id = $5 ORDER BY lower(u.username)", [req.user.id, req.user.id, req.user.id, config.companyId, config.eventId])).rows; res.json({ users: rows.map(publicUser) }); }));
const friendRequestView = row => ({ id: row.id, status: row.status, message: row.message, createdAt: row.created_at, user: publicUser(row.user) });
app.get('/friend-requests', auth, asyncRoute(async (req, res) => {
  const rows = (await db.query(`SELECT fr.*, u.id AS user_id, u.email AS user_email, u.username AS user_username, u.status AS user_status, u.bio AS user_bio, u.avatar AS user_avatar, u.banner AS user_banner
    FROM friend_requests fr JOIN users u ON u.id = CASE WHEN fr.sender_id = $1 THEN fr.recipient_id ELSE fr.sender_id END
    WHERE (fr.sender_id = $2 OR fr.recipient_id = $3) AND fr.status = 'pending' ORDER BY fr.created_at DESC`, [req.user.id, req.user.id, req.user.id])).rows;
  res.json({ requests: rows.map(row => ({ ...friendRequestView({ ...row, user: { id: row.user_id, email: row.user_email, username: row.user_username, status: row.user_status, bio: row.user_bio, avatar: row.user_avatar, banner: row.user_banner } }), direction: row.sender_id === req.user.id ? 'outgoing' : 'incoming' })) });
}));
app.post('/friend-requests', auth, asyncRoute(async (req, res) => {
  const recipientId = Number(req.body?.userId ?? req.body?.user_id); const recipient = await getUser(recipientId);
  if (!recipient || recipient.id === req.user.id) return res.status(400).json({ error: 'A valid user is required' });
  const existing = (await db.query('SELECT * FROM friend_requests WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $3 AND recipient_id = $4)', [req.user.id, recipient.id, recipient.id, req.user.id])).rows[0];
  if (existing?.status === 'accepted') return res.status(409).json({ error: 'You are already friends' });
  if (existing?.status === 'pending') return res.status(409).json({ error: 'A friend invitation is already pending' });
  const result = existing
    ? await db.query("UPDATE friend_requests SET sender_id = $1, recipient_id = $2, message = $3, status = 'pending', created_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id", [req.user.id, recipient.id, String(req.body?.message || '').trim(), existing.id])
    : await db.query('INSERT INTO friend_requests (sender_id, recipient_id, message) VALUES ($1, $2, $3) RETURNING id', [req.user.id, recipient.id, String(req.body?.message || '').trim()]);
  const request = (await db.query('SELECT * FROM friend_requests WHERE id = $1', [existing?.id || result.rows[0].id])).rows[0];
  broadcast([recipient.id], 'friend_request', { ...request, user: publicUser(req.user) });
  res.status(201).json({ request: { ...request, direction: 'outgoing', user: publicUser(recipient) } });
}));
app.patch('/friend-requests/:id', auth, asyncRoute(async (req, res) => {
  const requestId = Number(req.params.id); const status = String(req.body?.status || '');
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid invitation response' });
  const request = (await db.query("SELECT * FROM friend_requests WHERE id = $1 AND recipient_id = $2 AND status = 'pending'", [requestId, req.user.id])).rows[0];
  if (!request) return res.status(404).json({ error: 'Invitation not found' });
  await db.query('UPDATE friend_requests SET status = $1 WHERE id = $2', [status, requestId]);
  broadcast([request.sender_id], 'friend_request_update', { id: requestId, status, user: publicUser(req.user) });
  if (status === 'accepted') {
    await pushListeningSnapshot(req.user.id);
    await pushListeningSnapshot(request.sender_id);
  }
  res.json({ id: requestId, status });
}));
app.post('/conversations', auth, asyncRoute(async (req, res) => {
  const otherId = Number(req.body?.userId ?? req.body?.user_id); const other = await getUser(otherId);
  if (!other || other.id === req.user.id) return res.status(400).json({ error: 'A valid user is required' });
  const directKey = [req.user.id, other.id].sort((a, b) => a - b).join(':'); const client = await db.connect();
  let chat;
  try {
    await client.query('BEGIN');
    chat = (await client.query('SELECT * FROM conversations WHERE company_id = $1 AND event_id = $2 AND direct_key = $3', [config.companyId, config.eventId, directKey])).rows[0];
    if (!chat) {
      const result = await client.query('INSERT INTO conversations (company_id, event_id, direct_key) VALUES ($1, $2, $3) RETURNING id', [config.companyId, config.eventId, directKey]);
      chat = (await client.query('SELECT * FROM conversations WHERE id = $1', [result.rows[0].id])).rows[0];
      await client.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($3, $4)', [chat.id, req.user.id, chat.id, other.id]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  res.json({ id: chat.id, chatId: chat.id, conversation: { id: chat.id, user: publicUser(other) } });
}));
const chatSelect = 'SELECT c.id AS "chatId", u.id AS "userId", u.email, u.username, u.status, u.bio, u.avatar, u.banner, COALESCE(um.count, 0) AS "unreadCount" FROM conversation_members me JOIN conversations c ON c.id = me.conversation_id JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id != me.user_id JOIN users u ON u.id = cm.user_id LEFT JOIN unread_messages um ON um.conversation_id = c.id AND um.user_id = me.user_id WHERE me.user_id = $1 AND c.company_id = $2 AND c.event_id = $3';
app.get('/messages/chats', auth, asyncRoute(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
  const rows = (await db.query(`${chatSelect} ORDER BY c.id DESC LIMIT $4 OFFSET $5`, [req.user.id, config.companyId, config.eventId, limit + 1, offset])).rows;
  res.json({ conversations: rows.slice(0, limit), hasMore: rows.length > limit });
}));
app.get('/messages/unread', auth, asyncRoute(async (req, res) => {
  const conversations = (await db.query(`${chatSelect} AND um.count > 0`, [req.user.id, config.companyId, config.eventId])).rows;
  res.json({ conversations });
}));
app.get('/messages/chat/:chatId', auth, asyncRoute(async (req, res) => {
  const id = Number(req.params.chatId);
  if (!await conversation(id) || !await member(id, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' });
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const beforeId = req.query.before ? Number(req.query.before) : null;
  if (beforeId !== null && (!Number.isInteger(beforeId) || beforeId < 1)) return res.status(400).json({ error: 'Invalid message cursor' });
  const values = beforeId === null ? [id, limit + 1] : [id, beforeId, limit + 1];
  const cursorClause = beforeId === null ? '' : ' AND m.id < $2';
  const limitParameter = beforeId === null ? '$2' : '$3';
  const rows = (await db.query(`SELECT m.*, u.id AS sender_user_id, u.email AS sender_email, u.username AS sender_username, u.status AS sender_status, u.bio AS sender_bio, u.avatar AS sender_avatar, u.banner AS sender_banner FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = $1${cursorClause} ORDER BY m.id DESC LIMIT ${limitParameter}`, values)).rows;
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse().map(row => ({ id: row.id, chatId: row.conversation_id, senderId: row.sender_id, sender: { id: row.sender_user_id, email: row.sender_email, username: row.sender_username, status: row.sender_status, bio: row.sender_bio, avatar: row.sender_avatar, banner: row.sender_banner }, content: row.content, drawAttention: !!row.draw_attention, winks: !!row.winks, createdAt: row.created_at }));
  res.json({ messages, hasMore, chatId: id });
}));
const sockets = new Map();
const presenceGrace = require('./presenceGrace').createPresenceGrace();
function broadcast(userIds, type, payload) { for (const userId of userIds) for (const socket of (sockets.get(userId) || [])) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, payload })); }
async function updateListening(userId, body, socketId) {
  const action = body?.action; const sessionId = String(body?.sessionId || ''); const sequence = Number(body?.sequence);
  if (!['start', 'heartbeat', 'clear'].includes(action) || sessionId.length < 8 || sessionId.length > 128 || !Number.isSafeInteger(sequence) || sequence < 0) return;
  const client = await db.connect(); let envelope = null;
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO user_music_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
    const pref = (await client.query('SELECT share_activity,revision FROM user_music_preferences WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
    if (!pref.share_activity) { await client.query('COMMIT'); return; }
    await client.query(`INSERT INTO user_music_session_sequences(user_id,session_id,client_sequence) VALUES($1,$2,-1)
      ON CONFLICT(user_id,session_id) DO NOTHING`, [userId, sessionId]);
    const session = (await client.query('SELECT client_sequence FROM user_music_session_sequences WHERE user_id=$1 AND session_id=$2 FOR UPDATE', [userId, sessionId])).rows[0];
    if (sequence <= Number(session.client_sequence)) { await client.query('COMMIT'); return; }
    await client.query('UPDATE user_music_session_sequences SET client_sequence=$3 WHERE user_id=$1 AND session_id=$2', [userId, sessionId, sequence]);
    const existing = (await client.query('SELECT * FROM user_music_activities WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
    if (action === 'start') {
      const trackId = Number(body.trackId);
      const track = (await client.query(`SELECT t.id,t.title,t.artist,f.owner_id FROM event_music_tracks t JOIN event_music_folders f ON f.id=t.folder_id WHERE t.id=$1 AND t.company_id=$2 AND t.event_id=$3 AND t.removed_at IS NULL AND f.deleted_at IS NULL`, [trackId, config.companyId, config.eventId])).rows[0];
      if (!track) { await client.query('COMMIT'); return; }
      if (track.owner_id != null && track.owner_id !== userId) { await client.query('COMMIT'); return; }
      const revision = Number(pref.revision) + 1;
      const row = (await client.query(`INSERT INTO user_music_activities(user_id,session_id,socket_id,client_sequence,track_id,title,artist,revision,started_at,updated_at,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '60 seconds')
        ON CONFLICT(user_id) DO UPDATE SET session_id=EXCLUDED.session_id,socket_id=EXCLUDED.socket_id,client_sequence=EXCLUDED.client_sequence,track_id=EXCLUDED.track_id,title=EXCLUDED.title,artist=EXCLUDED.artist,revision=EXCLUDED.revision,started_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,expires_at=EXCLUDED.expires_at
        RETURNING *`, [userId, sessionId, socketId, sequence, track.id, track.title, track.artist, revision])).rows[0];
      await client.query('UPDATE user_music_preferences SET revision=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [userId, revision]);
      envelope = listeningEnvelope(userId, revision, activityView({ ...row, username: (await getUser(userId)).username }));
    } else if (action === 'heartbeat') {
      if (!existing || existing.session_id !== sessionId || existing.socket_id !== socketId || sequence <= Number(existing.client_sequence) || existing.expires_at <= new Date()) { await client.query('COMMIT'); return; }
      const revision = Number(pref.revision) + 1;
      const row = (await client.query(`UPDATE user_music_activities SET client_sequence=$2,revision=$3,updated_at=CURRENT_TIMESTAMP,expires_at=CURRENT_TIMESTAMP+INTERVAL '60 seconds' WHERE user_id=$1 AND socket_id=$4 RETURNING *`, [userId, sequence, revision, socketId])).rows[0];
      await client.query('UPDATE user_music_preferences SET revision=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [userId, revision]);
      envelope = listeningEnvelope(userId, revision, activityView({ ...row, username: (await getUser(userId)).username }));
    } else {
      if (!existing || existing.session_id !== sessionId || existing.socket_id !== socketId || sequence <= Number(existing.client_sequence)) { await client.query('COMMIT'); return; }
      const revision = Number(pref.revision) + 1;
      await client.query('DELETE FROM user_music_activities WHERE user_id=$1', [userId]);
      await client.query('UPDATE user_music_preferences SET revision=$2,updated_at=CURRENT_TIMESTAMP WHERE user_id=$1', [userId, revision]);
      envelope = listeningEnvelope(userId, revision, null);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  if (envelope) await sendListening(userId, envelope);
  return Boolean(envelope);
}
const expirySweep = setInterval(() => removeExpiredActivities().catch(() => {}), 5000); expirySweep.unref();
async function saveMessage(userId, body) {
  const chatId = Number(body?.chatId ?? body?.chat_id); const content = String(body?.content ?? '');
  if (!chatId || !content.trim() || !await conversation(chatId) || !await member(chatId, userId)) return null;
  const client = await db.connect(); let message; let recipients;
  try {
    await client.query('BEGIN');
    const inserted = await client.query('INSERT INTO messages (conversation_id, sender_id, content, draw_attention, winks) VALUES ($1, $2, $3, $4, $5) RETURNING *', [chatId, userId, content, !!body.drawAttention, !!body.winks]);
    recipients = (await client.query('SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2', [chatId, userId])).rows.map(x => x.user_id);
    for (const recipient of recipients) await client.query('INSERT INTO unread_messages (conversation_id, user_id, count) VALUES ($1, $2, 1) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = unread_messages.count + 1', [chatId, recipient]);
    message = inserted.rows[0];
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return { message: await messageView(message), recipients };
}
app.post('/messages', auth, asyncRoute(async (req, res) => { const result = await saveMessage(req.user.id, req.body); if (!result) return res.status(400).json({ error: 'Invalid message or conversation access denied' }); broadcast(result.recipients, 'message', result.message); res.status(201).json(result.message); }));
app.post('/unread-messages/reset', auth, asyncRoute(async (req, res) => { const chatId = Number(req.body?.chatId); if (!chatId || !await member(chatId, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' }); await db.query('INSERT INTO unread_messages (conversation_id, user_id, count) VALUES ($1, $2, 0) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = 0', [chatId, req.user.id]); res.json({ ok: true }); }));
async function broadcastUser(type, user) { const ids = (await db.query('SELECT id FROM users WHERE company_id = $1 AND event_id = $2', [config.companyId, config.eventId])).rows.map(x => x.id); broadcast(ids, type, publicUser(user)); }
const LIMITS = { username: 40, bio: 80 };
const limitError = (field, value) => { const max = LIMITS[field]; if (!max) return null; const text = String(value).replace(/<[^>]*>/g, '').trim(); if (field === 'username' && !text) return 'Display name cannot be empty.'; return text.length > max || String(value).length > 800 ? `${field === 'username' ? 'Display name' : 'Personal message'} is too long (max ${max} characters).` : null; };
async function updateUser(req, res, field, event) { const value = req.body?.[field]; if (value === undefined) return res.status(400).json({ error: `Missing ${field}` }); const tooLong = limitError(field, value); if (tooLong) return res.status(400).json({ error: tooLong }); try { await db.query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [value, req.user.id]); } catch { return res.status(409).json({ error: 'Username already exists' }); } const user = await getUser(req.user.id); await broadcastUser(event, user); res.json(publicUser(user)); }
app.patch('/users/status', auth, asyncRoute((req, res) => updateUser(req, res, 'status', 'user_status_update')));
app.patch('/users/bio', auth, asyncRoute((req, res) => updateUser(req, res, 'bio', 'user_bio_update')));
app.patch('/users/avatar', auth, asyncRoute((req, res) => updateUser(req, res, 'avatar', 'user_avatar_update')));
app.patch('/users/username', auth, asyncRoute((req, res) => updateUser(req, res, 'username', 'user_username_update')));
app.use((error, _req, res, next) => { if (res.headersSent) return next(error); res.status(500).json({ error: 'Internal server error' }); });
const server = http.createServer(app); const wss = new WebSocketServer({ server, path: '/ws' });
const heartbeat = setInterval(() => { for (const client of wss.clients) { if (client.isAlive === false) { client.terminate(); continue; } client.isAlive = false; client.ping(); } }, 30000);
heartbeat.unref();
const presenceSweep = setInterval(() => recordPresence([...sockets.keys()]).catch(() => {}), 300000); presenceSweep.unref();
wss.on('close', () => clearInterval(heartbeat));
wss.on('connection', (socket, req) => {
  let user; let ready = false; let messageChain = Promise.resolve(); const pendingMessages = []; const socketSessions = new Map(); const socketId = crypto.randomUUID();
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  const processSocketMessage = raw => {
    messageChain = messageChain.then(async () => {
      const event = JSON.parse(raw.toString());
      if (event.type === 'message') { const result = await saveMessage(user.id, event.payload || event); if (result) broadcast(result.recipients, 'message', result.message); }
      else if (event.type === 'typing') {
        const payload = event.payload || event; const chatId = Number(payload.chatId);
        if (!Number.isSafeInteger(chatId) || chatId < 1 || typeof payload.isTyping !== 'boolean' || !await conversation(chatId) || !await member(chatId, user.id)) return;
        const recipients = (await db.query('SELECT user_id FROM conversation_members WHERE conversation_id = $1 AND user_id != $2', [chatId, user.id])).rows.map(row => row.user_id);
        broadcast(recipients, 'typing', { chatId, senderId: user.id, isTyping: payload.isTyping });
      }
      else if (event.type === 'listening_activity') {
        const payload = event.payload || event; const sessionId = String(payload.sessionId || ''); const sequence = Number(payload.sequence);
        const priorSequence = socketSessions.get(sessionId);
        if (priorSequence !== undefined && Number.isSafeInteger(sequence)) socketSessions.set(sessionId, Math.max(priorSequence, sequence));
        const accepted = await updateListening(user.id, payload, socketId);
        if (accepted && payload.action === 'start') socketSessions.set(sessionId, sequence);
        if (accepted && payload.action === 'clear') socketSessions.delete(sessionId);
      }
    }).catch(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid WebSocket event' } })); });
    return messageChain;
  };
  socket.on('message', raw => { if (!ready) pendingMessages.push(raw); else processSocketMessage(raw); });
  socket.on('close', () => {
    if (!user) return;
    messageChain = messageChain.then(async () => {
      for (const [sessionId, sequence] of socketSessions) await updateListening(user.id, { action: 'clear', sessionId, sequence: sequence + 1 }, socketId);
      socketSessions.clear();
    }).catch(() => {});
    sockets.get(user.id)?.delete(socket); if (!sockets.get(user.id)?.size) {
      sockets.delete(user.id);
      presenceGrace.disconnect(user.id, () => {
        if (sockets.get(user.id)?.size) return;
        db.query("UPDATE users SET status = 'offline' WHERE id = $1", [user.id]).then(async () => broadcastUser('user_status_update', await getUser(user.id))).catch(() => {});
      });
    }
  });
  (async () => {
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token'); const claims = jwt.verify(token, config.jwtSecret); if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) throw new Error(); user = await getUser(Number(claims.sub)); if (!user || socket.readyState !== WebSocket.OPEN) throw new Error();
    const reconnecting = presenceGrace.reconnect(user.id);
    const alreadyConnected = Boolean(sockets.get(user.id)?.size);
    if (!sockets.has(user.id)) sockets.set(user.id, new Set()); sockets.get(user.id).add(socket);
    if (!reconnecting && !alreadyConnected) {
      await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]);
      await broadcastUser('user_status_update', await getUser(user.id));
    }
    recordPresence([user.id]).catch(() => {});
    await pushListeningSnapshot(user.id, socket);
    ready = true;
    socket.send(JSON.stringify({ type: 'socket_ready', payload: {} }));
    for (const raw of pendingMessages.splice(0)) processSocketMessage(raw);
  })().catch(() => socket.close(1008, 'Invalid token'));
});
if (require.main === module) initializeDatabase().then(() => server.listen(config.port, () => console.log(`Messenger API listening on http://localhost:${config.port}`))).catch(error => { console.error('Database initialization failed:', error.message); db.end().finally(() => { process.exitCode = 1; }); });
module.exports = { app, server, db, config, initializeDatabase };
