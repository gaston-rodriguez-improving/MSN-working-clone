const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const databasePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'messenger-')), 'test.sqlite');
process.env.DATABASE_PATH = databasePath;
process.env.JWT_SECRET = 'test-secret';
process.env.COMPANY_ID = 'test-company';
process.env.EVENT_ID = 'test-event';
const { app, server, db } = require('../server');

let base;
test.before(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); db.close(); });

async function json(url, options) {
  const response = await fetch(`${base}${url}`, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers || {}) } });
  return { response, body: await response.json() };
}

test('sign up, authenticate, create an idempotent chat, and persist messages', async () => {
  let result = await json('/auth/sign-up', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', username: 'alice', password: 'password' }) });
  assert.equal(result.response.status, 201);
  const aliceToken = result.body.access_token;
  result = await json('/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: 'a@example.com', password: 'password' }) });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.user.email, 'a@example.com');
  result = await json('/auth/sign-up', { method: 'POST', body: JSON.stringify({ email: 'b@example.com', username: 'bob', password: 'password' }) });
  const bobToken = result.body.access_token;
  const auth = token => ({ Authorization: `Bearer ${token}` });
  result = await json('/users', { headers: auth(aliceToken) });
  assert.equal(result.body.users[0].username, 'bob');
  const bobId = result.body.users[0].id;
  const first = await json('/conversations', { method: 'POST', headers: auth(aliceToken), body: JSON.stringify({ userId: bobId }) });
  const second = await json('/conversations', { method: 'POST', headers: auth(aliceToken), body: JSON.stringify({ userId: bobId }) });
  assert.equal(first.body.chatId, second.body.chatId);
  const sent = await json('/messages', { method: 'POST', headers: auth(aliceToken), body: JSON.stringify({ chatId: first.body.chatId, content: 'hello' }) });
  assert.equal(sent.response.status, 201);
  const messages = await json(`/messages/chat/${first.body.chatId}`, { headers: auth(bobToken) });
  assert.equal(messages.body.messages[0].content, 'hello');
});
