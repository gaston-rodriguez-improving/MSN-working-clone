require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const { WebSocketServer, WebSocket } = require('ws');

const root = __dirname;
const databasePath = path.resolve(root, process.env.DATABASE_PATH || './data/messenger.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(root, 'schema.sql'), 'utf8'));
const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  companyId: process.env.COMPANY_ID || 'default-company',
  eventId: process.env.EVENT_ID || 'default-event',
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID || '',
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
  allowedDomains: (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean)
};
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(x => x.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
const publicUser = row => row && ({ id: row.id, email: row.email, username: row.username, status: row.status, bio: row.bio, avatar: row.avatar, banner: row.banner });
const tokenFor = user => jwt.sign({ sub: user.id, companyId: user.company_id, eventId: user.event_id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
function getUser(id) { return db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ? AND event_id = ?').get(id, config.companyId, config.eventId); }
function emailAllowed(email) { return !config.allowedDomains.length || config.allowedDomains.includes(String(email).toLowerCase().split('@')[1]); }
function auth(req, res, next) {
  const header = req.get('authorization') || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { const claims = jwt.verify(token, config.jwtSecret); if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) throw new Error(); const user = getUser(Number(claims.sub)); if (!user) throw new Error(); req.user = user; next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
function conversation(id) { return db.prepare('SELECT * FROM conversations WHERE id = ? AND company_id = ? AND event_id = ?').get(id, config.companyId, config.eventId); }
function member(conversationId, userId) { return !!db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId); }
function messageView(row) { return { id: row.id, chatId: row.conversation_id, senderId: row.sender_id, sender: publicUser(getUser(row.sender_id)), content: row.content, drawAttention: !!row.draw_attention, winks: !!row.winks, createdAt: row.created_at }; }
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/auth/sign-up', async (req, res) => {
  const { email, password } = req.body || {}; const username = String(req.body?.username || req.body?.name || '').trim();
  if (!email || !password || !username) return res.status(400).json({ error: 'email, username and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!emailAllowed(email)) return res.status(403).json({ error: 'Email domain is not allowed' });
  try { const hash = await bcrypt.hash(String(password), 12); const result = db.prepare('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(String(email).trim().toLowerCase(), username, hash, config.companyId, config.eventId, req.body.status || 'offline'); const user = getUser(result.lastInsertRowid); res.status(201).json({ access_token: tokenFor(user), user: publicUser(user) }); }
  catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Email or username already exists' : 'Could not create account' }); }
});
app.post('/auth/sign-in', async (req, res) => { const email = String(req.body?.email || '').trim().toLowerCase(); const user = db.prepare('SELECT * FROM users WHERE email = ? AND company_id = ? AND event_id = ?').get(email, config.companyId, config.eventId); if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' }); db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id); const updated = getUser(user.id); res.status(200).json({ access_token: tokenFor(updated), user: publicUser(updated) }); });
async function verifyMicrosoftIdToken(idToken) { if (!config.microsoftTenantId || !config.microsoftClientId) throw new Error('Microsoft Entra SSO is not configured'); const { createRemoteJWKSet, jwtVerify } = await import('jose'); const authority = `https://login.microsoftonline.com/${config.microsoftTenantId}`; const issuer = `${authority}/v2.0`; const jwks = createRemoteJWKSet(new URL(`${authority}/discovery/v2.0/keys`)); const { payload } = await jwtVerify(idToken, jwks, { issuer, audience: config.microsoftClientId }); return payload; }
function uniqueUsername(email, name) { const base = String(name || email.split('@')[0]).trim().replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 40) || 'user'; let username = base; let suffix = 1; while (db.prepare('SELECT 1 FROM users WHERE username = ? AND company_id = ? AND event_id = ?').get(username, config.companyId, config.eventId)) username = `${base}${suffix++}`; return username; }
app.post('/auth/microsoft', async (req, res) => { try { const claims = await verifyMicrosoftIdToken(String(req.body?.id_token || '')); const email = String(claims.preferred_username || claims.email || '').trim().toLowerCase(); if (!email || !emailAllowed(email)) return res.status(403).json({ error: 'Your Microsoft account is not allowed' }); let user = db.prepare('SELECT * FROM users WHERE email = ? AND company_id = ? AND event_id = ?').get(email, config.companyId, config.eventId); if (!user) { const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12); const username = uniqueUsername(email, claims.name); const result = db.prepare('INSERT INTO users (email, username, password_hash, company_id, event_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(email, username, passwordHash, config.companyId, config.eventId, 'online'); user = getUser(result.lastInsertRowid); } else db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id); const updated = getUser(user.id); res.status(200).json({ access_token: tokenFor(updated), user: publicUser(updated) }); } catch (error) { console.error('Microsoft Entra authentication failed:', error.message); res.status(401).json({ error: 'Microsoft sign-in failed. Check the Entra app configuration and try again.' }); } });
app.get('/auth/check-token', auth, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/users', auth, (req, res) => { const search = `%${String(req.query.search || '').trim()}%`; const rows = db.prepare('SELECT * FROM users WHERE company_id = ? AND event_id = ? AND id != ? AND (username LIKE ? OR email LIKE ?) ORDER BY username COLLATE NOCASE').all(config.companyId, config.eventId, req.user.id, search, search); res.json({ users: rows.map(publicUser) }); });
const friendRequestView = row => ({ id: row.id, status: row.status, message: row.message, createdAt: row.created_at, user: publicUser(row.user) });
app.get('/friend-requests', auth, (req, res) => {
  const rows = db.prepare(`SELECT fr.*, u.id AS user_id, u.email AS user_email, u.username AS user_username, u.status AS user_status, u.bio AS user_bio, u.avatar AS user_avatar, u.banner AS user_banner
    FROM friend_requests fr JOIN users u ON u.id = CASE WHEN fr.sender_id = ? THEN fr.recipient_id ELSE fr.sender_id END
    WHERE (fr.sender_id = ? OR fr.recipient_id = ?) AND fr.status = 'pending' ORDER BY fr.created_at DESC`).all(req.user.id, req.user.id, req.user.id);
  res.json({ requests: rows.map(row => ({ ...friendRequestView({ ...row, user: { id: row.user_id, email: row.user_email, username: row.user_username, status: row.user_status, bio: row.user_bio, avatar: row.user_avatar, banner: row.user_banner } }), direction: row.sender_id === req.user.id ? 'outgoing' : 'incoming' })) });
});
app.post('/friend-requests', auth, (req, res) => {
  const recipientId = Number(req.body?.userId ?? req.body?.user_id); const recipient = getUser(recipientId);
  if (!recipient || recipient.id === req.user.id) return res.status(400).json({ error: 'A valid user is required' });
  const existing = db.prepare('SELECT * FROM friend_requests WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)').get(req.user.id, recipient.id, recipient.id, req.user.id);
  if (existing?.status === 'accepted') return res.status(409).json({ error: 'You are already friends' });
  if (existing?.status === 'pending') return res.status(409).json({ error: 'A friend invitation is already pending' });
  const result = existing
    ? db.prepare("UPDATE friend_requests SET sender_id = ?, recipient_id = ?, message = ?, status = 'pending', created_at = datetime('now') WHERE id = ?").run(req.user.id, recipient.id, String(req.body?.message || '').trim(), existing.id)
    : db.prepare('INSERT INTO friend_requests (sender_id, recipient_id, message) VALUES (?, ?, ?)').run(req.user.id, recipient.id, String(req.body?.message || '').trim());
  const request = db.prepare('SELECT * FROM friend_requests WHERE id = ?').get(existing?.id || result.lastInsertRowid);
  broadcast([recipient.id], 'friend_request', { ...request, user: publicUser(req.user) });
  res.status(201).json({ request: { ...request, direction: 'outgoing', user: publicUser(recipient) } });
});
app.patch('/friend-requests/:id', auth, (req, res) => {
  const requestId = Number(req.params.id); const status = String(req.body?.status || '');
  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid invitation response' });
  const request = db.prepare("SELECT * FROM friend_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'").get(requestId, req.user.id);
  if (!request) return res.status(404).json({ error: 'Invitation not found' });
  db.prepare('UPDATE friend_requests SET status = ? WHERE id = ?').run(status, requestId);
  broadcast([request.sender_id], 'friend_request_update', { id: requestId, status, user: publicUser(req.user) });
  res.json({ id: requestId, status });
});
app.post('/conversations', auth, (req, res) => { const otherId = Number(req.body?.userId ?? req.body?.user_id); const other = getUser(otherId); if (!other || other.id === req.user.id) return res.status(400).json({ error: 'A valid user is required' }); const directKey = [req.user.id, other.id].sort((a, b) => a - b).join(':'); const create = db.transaction(() => { let chat = db.prepare('SELECT * FROM conversations WHERE company_id = ? AND event_id = ? AND direct_key = ?').get(config.companyId, config.eventId, directKey); if (!chat) { const result = db.prepare('INSERT INTO conversations (company_id, event_id, direct_key) VALUES (?, ?, ?)').run(config.companyId, config.eventId, directKey); chat = conversation(result.lastInsertRowid); db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)').run(chat.id, req.user.id, chat.id, other.id); } return chat; }); const chat = create(); res.json({ id: chat.id, chatId: chat.id, conversation: { id: chat.id, user: publicUser(other) } }); });
app.get('/messages/chats', auth, (req, res) => { const chats = db.prepare('SELECT c.id AS chatId, u.id AS userId, u.email, u.username, u.status, u.bio, u.avatar, u.banner, (SELECT count FROM unread_messages um WHERE um.conversation_id = c.id AND um.user_id = ?) AS unreadCount FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id != ? JOIN users u ON u.id = cm.user_id WHERE c.company_id = ? AND c.event_id = ?').all(req.user.id, req.user.id, config.companyId, config.eventId); const unreadCounts = Object.fromEntries(chats.map(c => [c.chatId, c.unreadCount || 0])); const chatMessages = Object.fromEntries(chats.map(c => [c.chatId, db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(c.chatId).map(messageView)])); res.json({ chats: chatMessages, unreadCounts, conversations: chats }); });
app.get('/messages/chat/:chatId', auth, (req, res) => { const id = Number(req.params.chatId); if (!conversation(id) || !member(id, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' }); res.json({ messages: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(id).map(messageView), chatId: id }); });
const sockets = new Map();
function broadcast(userIds, type, payload) { for (const userId of userIds) for (const socket of (sockets.get(userId) || [])) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, payload })); }
function saveMessage(userId, body) { const chatId = Number(body?.chatId ?? body?.chat_id); const content = String(body?.content ?? ''); if (!chatId || !content.trim() || !conversation(chatId) || !member(chatId, userId)) return null; return db.transaction(() => { const inserted = db.prepare('INSERT INTO messages (conversation_id, sender_id, content, draw_attention, winks) VALUES (?, ?, ?, ?, ?)').run(chatId, userId, content, body.drawAttention ? 1 : 0, body.winks ? 1 : 0); const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(chatId, userId).map(x => x.user_id); for (const recipient of recipients) db.prepare('INSERT INTO unread_messages (conversation_id, user_id, count) VALUES (?, ?, 1) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = count + 1').run(chatId, recipient); return { message: messageView(db.prepare('SELECT * FROM messages WHERE id = ?').get(inserted.lastInsertRowid)), recipients }; })(); }
app.post('/messages', auth, (req, res) => { const result = saveMessage(req.user.id, req.body); if (!result) return res.status(400).json({ error: 'Invalid message or conversation access denied' }); broadcast(result.recipients, 'message', result.message); res.status(201).json(result.message); });
app.post('/unread-messages/reset', auth, (req, res) => { const chatId = Number(req.body?.chatId); if (!chatId || !member(chatId, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' }); db.prepare('INSERT INTO unread_messages (conversation_id, user_id, count) VALUES (?, ?, 0) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = 0').run(chatId, req.user.id); res.json({ ok: true }); });
function broadcastUser(type, user) { const ids = db.prepare('SELECT id FROM users WHERE company_id = ? AND event_id = ?').all(config.companyId, config.eventId).map(x => x.id); broadcast(ids, type, publicUser(user)); }
function updateUser(req, res, field, event) { const value = req.body?.[field]; if (value === undefined) return res.status(400).json({ error: `Missing ${field}` }); try { db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(value, req.user.id); } catch { return res.status(409).json({ error: 'Username already exists' }); } const user = getUser(req.user.id); broadcastUser(event, user); res.json(publicUser(user)); }
app.patch('/users/status', auth, (req, res) => updateUser(req, res, 'status', 'user_status_update'));
app.patch('/users/bio', auth, (req, res) => updateUser(req, res, 'bio', 'user_bio_update'));
app.patch('/users/avatar', auth, (req, res) => updateUser(req, res, 'avatar', 'user_avatar_update'));
app.patch('/users/username', auth, (req, res) => updateUser(req, res, 'username', 'user_username_update'));
const server = http.createServer(app); const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket, req) => { let user; try { const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token'); const claims = jwt.verify(token, config.jwtSecret); user = getUser(Number(claims.sub)); if (!user) throw new Error(); } catch { socket.close(1008, 'Invalid token'); return; } if (!sockets.has(user.id)) sockets.set(user.id, new Set()); sockets.get(user.id).add(socket); db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id); broadcastUser('user_status_update', getUser(user.id)); socket.on('message', raw => { try { const event = JSON.parse(raw.toString()); if (event.type === 'message') { const result = saveMessage(user.id, event.payload || event); if (result) broadcast(result.recipients, 'message', result.message); } } catch { socket.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid WebSocket event' } })); } }); socket.on('close', () => { sockets.get(user.id)?.delete(socket); if (!sockets.get(user.id)?.size) { sockets.delete(user.id); db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(user.id); broadcastUser('user_status_update', getUser(user.id)); } }); });
if (require.main === module) server.listen(config.port, () => console.log(`Messenger API listening on http://localhost:${config.port}`));
module.exports = { app, server, db, config };
