require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
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
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const claims = jwt.verify(token, config.jwtSecret);
    if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) throw new Error('wrong scope');
    const user = getUser(Number(claims.sub));
    if (!user) throw new Error('unknown user');
    req.user = user; req.token = token; next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
function userById(id) { return getUser(Number(id)); }
function member(conversationId, userId) { return !!db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?').get(conversationId, userId); }
function conversation(id) { return db.prepare('SELECT * FROM conversations WHERE id = ? AND company_id = ? AND event_id = ?').get(id, config.companyId, config.eventId); }
function messageView(row) { return { id: row.id, chatId: row.conversation_id, senderId: row.sender_id, content: row.content, drawAttention: !!row.draw_attention, winks: !!row.winks, createdAt: row.created_at }; }

app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/auth/sign-up', async (req, res) => {
  const { email, password } = req.body || {};
  const username = String(req.body?.username || req.body?.name || '').trim();
  if (!email || !password || !username) return res.status(400).json({ error: 'email, username and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!emailAllowed(email)) return res.status(403).json({ error: 'Email domain is not allowed' });
  try {
    const hash = await bcrypt.hash(String(password), 12);
    const result = db.prepare(`INSERT INTO users (email, username, password_hash, company_id, event_id, status, bio, avatar, banner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(String(email).trim().toLowerCase(), username, hash, config.companyId, config.eventId, req.body.status || 'offline', req.body.bio || '', req.body.avatar || 'default', req.body.banner || 'default');
    const user = getUser(result.lastInsertRowid);
    res.status(201).json({ access_token: tokenFor(user), user: publicUser(user) });
  } catch (error) { res.status(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 409 : 500).json({ error: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Email or username already exists' : 'Could not create account' }); }
});
app.post('/auth/sign-in', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND company_id = ? AND event_id = ?').get(email, config.companyId, config.eventId);
  if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
  db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id);
  const updated = getUser(user.id);
  res.status(201).json({ access_token: tokenFor(updated), user: publicUser(updated) });
});
app.get('/auth/check-token', auth, (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/users', auth, (req, res) => {
  const search = String(req.query.search || '').trim();
  const like = `%${search}%`;
  const rows = db.prepare(`SELECT * FROM users WHERE company_id = ? AND event_id = ? AND id != ? AND (username LIKE ? OR email LIKE ?) ORDER BY username COLLATE NOCASE`).all(config.companyId, config.eventId, req.user.id, like, like);
  res.json({ users: rows.map(publicUser) });
});
app.post('/conversations', auth, (req, res) => {
  const otherId = Number(req.body?.userId ?? req.body?.user_id);
  const other = userById(otherId);
  if (!other || other.id === req.user.id) return res.status(400).json({ error: 'A valid user in this event is required' });
  const directKey = [req.user.id, other.id].sort((a, b) => a - b).join(':');
  const create = db.transaction(() => {
    let chat = db.prepare('SELECT * FROM conversations WHERE company_id = ? AND event_id = ? AND direct_key = ?').get(config.companyId, config.eventId, directKey);
    if (!chat) {
      const result = db.prepare('INSERT INTO conversations (company_id, event_id, direct_key) VALUES (?, ?, ?)').run(config.companyId, config.eventId, directKey);
      chat = conversation(result.lastInsertRowid);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?), (?, ?)').run(chat.id, req.user.id, chat.id, other.id);
    }
    return chat;
  });
  const chat = create();
  res.status(200).json({ id: chat.id, chatId: chat.id, conversation: { id: chat.id, chatId: chat.id, user: publicUser(other) } });
});

app.get('/messages/chats', auth, (req, res) => {
  const chats = db.prepare(`SELECT c.id AS chatId, u.id AS userId, u.email, u.username, u.status, u.bio, u.avatar, u.banner,
    (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessage,
    (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS lastMessageAt,
    COALESCE((SELECT count FROM unread_messages um WHERE um.conversation_id = c.id AND um.user_id = ?), 0) AS unreadCount
    FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id != ?
    JOIN users u ON u.id = cm.user_id WHERE c.company_id = ? AND c.event_id = ? ORDER BY lastMessageAt DESC NULLS LAST`).all(req.user.id, req.user.id, config.companyId, config.eventId);
  const unreadCounts = Object.fromEntries(chats.map(c => [c.chatId, c.unreadCount]));
  const chatMessages = Object.fromEntries(chats.map(c => [c.chatId, db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(c.chatId).map(messageView)]));
  res.json({ chats: chatMessages, unreadCounts, conversations: chats });
});
app.get('/messages/chat/:chatId', auth, (req, res) => {
  const id = Number(req.params.chatId);
  if (!conversation(id) || !member(id, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' });
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(id).map(messageView);
  res.json({ messages, chatId: id });
});

const sockets = new Map();
function broadcast(userIds, type, payload) {
  for (const userId of userIds) for (const socket of (sockets.get(userId) || [])) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type, payload }));
}
app.post('/messages', auth, (req, res) => {
  const chatId = Number(req.body?.chatId ?? req.body?.chat_id);
  const content = String(req.body?.content ?? '');
  if (!chatId || !content.trim()) return res.status(400).json({ error: 'chatId and content are required' });
  if (!conversation(chatId) || !member(chatId, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' });
  const result = db.transaction(() => {
    const inserted = db.prepare('INSERT INTO messages (conversation_id, sender_id, content, draw_attention, winks) VALUES (?, ?, ?, ?, ?)').run(chatId, req.user.id, content, req.body.drawAttention ? 1 : 0, req.body.winks ? 1 : 0);
    const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(chatId, req.user.id);
    for (const recipient of recipients) db.prepare(`INSERT INTO unread_messages (conversation_id, user_id, count) VALUES (?, ?, 1) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = count + 1`).run(chatId, recipient.user_id);
    return { message: messageView(db.prepare('SELECT * FROM messages WHERE id = ?').get(inserted.lastInsertRowid)), recipients: recipients.map(x => x.user_id) };
  })();
  broadcast(result.recipients, 'message', result.message);
  res.status(201).json(result.message);
});
app.post('/unread-messages/reset', auth, (req, res) => {
  const chatId = Number(req.body?.chatId ?? req.body?.chat_id);
  if (!chatId || !member(chatId, req.user.id)) return res.status(403).json({ error: 'Conversation access denied' });
  db.prepare('INSERT INTO unread_messages (conversation_id, user_id, count) VALUES (?, ?, 0) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = 0').run(chatId, req.user.id);
  res.json({ ok: true });
});

function updateUser(req, res, fields, event) {
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  const values = fields.map(field => req.body?.[field]);
  if (values.some(value => value === undefined)) return res.status(400).json({ error: `Missing ${fields.join(' or ')}` });
  try { db.prepare(`UPDATE users SET ${fields.map(x => `${x} = ?`).join(', ')} WHERE id = ?`).run(...values, req.user.id); }
  catch { return res.status(409).json({ error: 'Username already exists' }); }
  const user = getUser(req.user.id); broadcastUser(event, user); res.json(publicUser(user));
}
function broadcastUser(type, user) { const ids = db.prepare('SELECT id FROM users WHERE company_id = ? AND event_id = ?').all(config.companyId, config.eventId).map(x => x.id); broadcast(ids, type, publicUser(user)); }
app.patch('/users', auth, (req, res) => updateUser(req, res, ['avatar', 'banner'].filter(x => req.body?.[x] !== undefined), 'user_profile_update'));
app.patch('/users/status', auth, (req, res) => updateUser(req, res, ['status'], 'user_status_update'));
app.patch('/users/bio', auth, (req, res) => updateUser(req, res, ['bio'], 'user_bio_update'));
app.patch('/users/username', auth, (req, res) => updateUser(req, res, ['username'], 'user_username_update'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket, req) => {
  let user;
  try { const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token'); const claims = jwt.verify(token, config.jwtSecret); if (claims.companyId !== config.companyId || claims.eventId !== config.eventId) throw new Error(); user = getUser(Number(claims.sub)); if (!user) throw new Error(); }
  catch { socket.close(1008, 'Invalid token'); return; }
  if (!sockets.has(user.id)) sockets.set(user.id, new Set()); sockets.get(user.id).add(socket);
  db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(user.id);
  broadcastUser('user_status_update', getUser(user.id));
  socket.on('message', raw => {
    try {
      const event = JSON.parse(raw.toString());
      if (event.type === 'message') {
        const body = event.payload || event;
        const chatId = Number(body.chatId ?? body.chat_id);
        if (chatId && member(chatId, user.id) && String(body.content || '').trim()) {
          const result = db.transaction(() => { const r = db.prepare('INSERT INTO messages (conversation_id, sender_id, content, draw_attention, winks) VALUES (?, ?, ?, ?, ?)').run(chatId, user.id, String(body.content), body.drawAttention ? 1 : 0, body.winks ? 1 : 0); const recipients = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(chatId, user.id); for (const x of recipients) db.prepare(`INSERT INTO unread_messages (conversation_id, user_id, count) VALUES (?, ?, 1) ON CONFLICT(conversation_id, user_id) DO UPDATE SET count = count + 1`).run(chatId, x.user_id); return { message: messageView(db.prepare('SELECT * FROM messages WHERE id = ?').get(r.lastInsertRowid)), recipients: recipients.map(x => x.user_id) }; })();
          broadcast(result.recipients, 'message', result.message);
        }
      }
    } catch { socket.send(JSON.stringify({ type: 'error', payload: { error: 'Invalid WebSocket event' } })); }
  });
  socket.on('close', () => { sockets.get(user.id)?.delete(socket); if (!sockets.get(user.id)?.size) { sockets.delete(user.id); db.prepare("UPDATE users SET status = 'offline' WHERE id = ?").run(user.id); broadcastUser('user_status_update', getUser(user.id)); } });
});

app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Internal server error' }); });
if (require.main === module) server.listen(config.port, () => console.log(`Messenger API listening on http://localhost:${config.port}`));
module.exports = { app, server, db, config };
