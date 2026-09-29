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
  allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
};
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(x => x.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
const publicUser = row => row && ({ id: row.id, email: row.email, username: row.username, status: row.status, bio: row.bio, avatar: row.avatar, banner: row.banner });
const tokenFor = user => jwt.sign({ sub: user.id, companyId: user.company_id, eventId: user.event_id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
async function getUser(id) { return (await db.query('SELECT * FROM users WHERE id = $1 AND company_id = $2 AND event_id = $3', [id, config.companyId, config.eventId])).rows[0]; }
function emailAllowed(email) { return !config.allowedDomains.length || config.allowedDomains.includes(String(email).toLowerCase().split('@')[1]); }
function auth(req, res, next) {
  const header = req.get('authorization') || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  let claims;
  try { claims = jwt.verify(token, config.jwtSecret); } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
  if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) return res.status(401).json({ error: 'Invalid or expired token' });
  getUser(Number(claims.sub)).then(user => { if (!user) return res.status(401).json({ error: 'Invalid or expired token' }); req.user = user; next(); }).catch(next);
}
async function conversation(id) { return (await db.query('SELECT * FROM conversations WHERE id = $1 AND company_id = $2 AND event_id = $3', [id, config.companyId, config.eventId])).rows[0]; }
async function member(conversationId, userId) { return !!(await db.query('SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId])).rows[0]; }
async function messageView(row) { return { id: row.id, chatId: row.conversation_id, senderId: row.sender_id, sender: publicUser(await getUser(row.sender_id)), content: row.content, drawAttention: !!row.draw_attention, winks: !!row.winks, createdAt: row.created_at }; }
async function messageViews(rows) { return Promise.all(rows.map(messageView)); }
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
async function initializeDatabase() {
  for (const key of ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD']) if (!process.env[key]) throw new Error(`${key} is required`);
  await db.query(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
}
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/auth/sign-up', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {}; const username = String(req.body?.username || req.body?.name || '').trim();
  if (!email || !password || !username) return res.status(400).json({ error: 'email, username and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!emailAllowed(email)) return res.status(403).json({ error: 'Email domain is not allowed' });
  try { const hash = await bcrypt.hash(String(password), 12); const result = await db.query('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [String(email).trim().toLowerCase(), username, hash, config.companyId, config.eventId, req.body.status || 'offline']); const user = await getUser(result.rows[0].id); res.status(201).json({ access_token: tokenFor(user), user: publicUser(user) }); }
  catch (error) { res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Email or username already exists' : 'Could not create account' }); }
}));
app.post('/auth/sign-in', asyncRoute(async (req, res) => { const email = String(req.body?.email || '').trim().toLowerCase(); const user = (await db.query('SELECT * FROM users WHERE email = $1 AND company_id = $2 AND event_id = $3', [email, config.companyId, config.eventId])).rows[0]; if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' }); await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]); const updated = await getUser(user.id); res.status(200).json({ access_token: tokenFor(updated), user: publicUser(updated) }); }));
async function verifyAzureAdIdToken(idToken) { if (!config.azureAdTenantId || !config.azureAdClientId) throw new Error('Azure AD SSO is not configured'); const { createRemoteJWKSet, jwtVerify } = await import('jose'); const authority = `https://login.microsoftonline.com/${config.azureAdTenantId}`; const issuer = `${authority}/v2.0`; const jwks = createRemoteJWKSet(new URL(`${authority}/discovery/v2.0/keys`)); const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: config.azureAdClientId }); return payload; }
async function uniqueUsername(email, name) { let display = String(name || '').normalize('NFC').replace(/[^\p{L}\p{N} ._'-]/gu, ' ').replace(/\s+/g, ' ').trim(); const comma = display.match(/^([^,]+),\s*(.+)$/); if (comma) display = `${comma[2]} ${comma[1]}`.replace(/\s+/g, ' ').trim(); const base = (display || String(email.split('@')[0]).replace(/[^a-zA-Z0-9._-]/g, '')).slice(0, 40).trim() || 'user'; let username = base; let suffix = 1; while ((await db.query('SELECT 1 FROM users WHERE username = $1 AND company_id = $2 AND event_id = $3', [username, config.companyId, config.eventId])).rows[0]) username = `${base}${suffix++}`; return username; }
app.post('/auth/microsoft', asyncRoute(async (req, res) => { try { const claims = await verifyAzureAdIdToken(String(req.body?.id_token || '')); const email = String(claims.preferred_username || claims.email || '').trim().toLowerCase(); if (!email || !emailAllowed(email)) return res.status(403).json({ error: 'Your Microsoft account is not allowed' }); let user = (await db.query('SELECT * FROM users WHERE email = $1 AND company_id = $2 AND event_id = $3', [email, config.companyId, config.eventId])).rows[0]; if (!user) { const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12); const username = await uniqueUsername(email, claims.name); const result = await db.query('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [email, username, passwordHash, config.companyId, config.eventId, 'online']); user = await getUser(result.rows[0].id); } else await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]); const updated = await getUser(user.id); res.status(200).json({ access_token: tokenFor(updated), user: publicUser(updated) }); } catch (error) { console.error('Microsoft Entra authentication failed:', error.message); res.status(401).json({ error: 'Microsoft sign-in failed. Check the Entra app configuration and try again.' }); } }));
app.get('/auth/check-token', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/users', auth, asyncRoute(async (req, res) => { const search = `%${String(req.query.search || '').trim()}%`; const rows = (await db.query('SELECT * FROM users WHERE company_id = $1 AND event_id = $2 AND id != $3 AND (username ILIKE $4 OR email ILIKE $4) ORDER BY lower(username)', [config.companyId, config.eventId, req.user.id, search])).rows; res.json({ users: rows.map(publicUser) }); }));
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
app.get('/messages/chats', auth, asyncRoute(async (req, res) => {
  const chats = (await db.query('SELECT c.id AS "chatId", u.id AS "userId", u.email, u.username, u.status, u.bio, u.avatar, u.banner, (SELECT count FROM unread_messages um WHERE um.conversation_id = c.id AND um.user_id = $1) AS "unreadCount" FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id != $2 JOIN users u ON u.id = cm.user_id WHERE c.company_id = $3 AND c.event_id = $4', [req.user.id, req.user.id, config.companyId, config.eventId])).rows;
  const unreadCounts = Object.fromEntries(chats.map(c => [c.chatId, c.unreadCount || 0]));
  const chatMessages = Object.fromEntries(await Promise.all(chats.map(async c => [c.chatId, await messageViews((await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC', [c.chatId])).rows)])));
  res.json({ chats: chatMessages, unreadCounts, conversations: chats });
}));
app.get('/messages/chat/:chatId', auth, asyncRoute(async (req, res) => { const id = Number(req.params.chatId); if (!await conversation(id) || !await member(id, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' }); res.json({ messages: await messageViews((await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY id ASC', [id])).rows), chatId: id }); }));
const sockets = new Map();
function broadcast(userIds, type, payload) { for (const userId of userIds) for (const socket of (sockets.get(userId) || [])) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, payload })); }
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
async function updateUser(req, res, field, event) { const value = req.body?.[field]; if (value === undefined) return res.status(400).json({ error: `Missing ${field}` }); try { await db.query(`UPDATE users SET ${field} = $1 WHERE id = $2`, [value, req.user.id]); } catch { return res.status(409).json({ error: 'Username already exists' }); } const user = await getUser(req.user.id); await broadcastUser(event, user); res.json(publicUser(user)); }
app.patch('/users/status', auth, asyncRoute((req, res) => updateUser(req, res, 'status', 'user_status_update')));
app.patch('/users/bio', auth, asyncRoute((req, res) => updateUser(req, res, 'bio', 'user_bio_update')));
app.patch('/users/avatar', auth, asyncRoute((req, res) => updateUser(req, res, 'avatar', 'user_avatar_update')));
app.patch('/users/username', auth, asyncRoute((req, res) => updateUser(req, res, 'username', 'user_username_update')));
app.use((error, _req, res, next) => { if (res.headersSent) return next(error); res.status(500).json({ error: 'Internal server error' }); });
const server = http.createServer(app); const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket, req) => {
  let user;
  socket.on('close', () => { if (!user) return; sockets.get(user.id)?.delete(socket); if (!sockets.get(user.id)?.size) { sockets.delete(user.id); db.query("UPDATE users SET status = 'offline' WHERE id = $1", [user.id]).then(async () => broadcastUser('user_status_update', await getUser(user.id))).catch(() => {}); } });
  (async () => {
    const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token'); const claims = jwt.verify(token, config.jwtSecret); user = await getUser(Number(claims.sub)); if (!user || socket.readyState !== WebSocket.OPEN) throw new Error();
    if (!sockets.has(user.id)) sockets.set(user.id, new Set()); sockets.get(user.id).add(socket);
    await db.query("UPDATE users SET status = 'online' WHERE id = $1", [user.id]); await broadcastUser('user_status_update', await getUser(user.id));
    socket.on('message', raw => { (async () => { const event = JSON.parse(raw.toString()); if (event.type === 'message') { const result = await saveMessage(user.id, event.payload || event); if (result) broadcast(result.recipients, 'message', result.message); } })().catch(() => socket.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid WebSocket event' } }))); });
  })().catch(() => socket.close(1008, 'Invalid token'));
});
if (require.main === module) initializeDatabase().then(() => server.listen(config.port, () => console.log(`Messenger API listening on http://localhost:${config.port}`))).catch(error => { console.error('Database initialization failed:', error.message); db.end().finally(() => { process.exitCode = 1; }); });
module.exports = { app, server, db, config, initializeDatabase };
