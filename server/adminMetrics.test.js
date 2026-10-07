const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { nudgeLeaders } = require('./adminMetrics');

test('nudge leaders count senders and recipients without counting normal messages or other events', { skip: process.env.ADMIN_METRICS_INTEGRATION !== '1' }, async () => {
  const pool = new Pool({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD });
  const db = await pool.connect();
  const scope = [`nudge-test-${randomUUID()}`, 'event'];
  try {
    await db.query('BEGIN');
    assert.deepEqual(await nudgeLeaders(db, scope), { topNudgeSender: null, topNudgeRecipient: null });
    const ids = [];
    for (const name of ['<font color="#FF0000">Alice</font>', 'Bob', 'Carol']) {
      ids.push((await db.query(`INSERT INTO users(email,username,password_hash,company_id,event_id) VALUES($1,$2,'fixture',$3,$4) RETURNING id`, [`${ids.length}@fixture.test`,name,...scope])).rows[0].id);
    }
    const chat = async (key, members, event = scope[1]) => {
      const id = (await db.query('INSERT INTO conversations(company_id,event_id,direct_key) VALUES($1,$2,$3) RETURNING id', [scope[0], event, key])).rows[0].id;
      for (const user of members) await db.query('INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2)', [id,user]);
      return id;
    };
    const send = (chatId, sender, nudge = true) => db.query("INSERT INTO messages(conversation_id,sender_id,content,draw_attention) VALUES($1,$2,'fixture',$3)", [chatId,sender,nudge]);
    const ab = await chat('ab',ids.slice(0,2));
    const ac = await chat('ac',[ids[0],ids[2]]);
    const group = await chat('group',ids);
    await send(ab,ids[0]); await send(ab,ids[0]); await send(ac,ids[0]); await send(group,ids[0]); await send(ab,ids[1]);
    for (let i=0;i<8;i++) await send(ab,ids[1],false);
    const elsewhere = await chat('elsewhere',ids,'different-event');
    for (let i=0;i<8;i++) await send(elsewhere,ids[2]);
    const leaders = await nudgeLeaders(db,scope);
    assert.deepEqual(leaders.topNudgeSender, {id:ids[0],username:'<font color="#FF0000">Alice</font>',email:'0@fixture.test',count:4});
    assert.deepEqual(leaders.topNudgeRecipient, {id:ids[1],username:'Bob',email:'1@fixture.test',count:3});
  } finally {
    await db.query('ROLLBACK'); db.release(); await pool.end();
  }
});
