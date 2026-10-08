const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { image, color } = require('./fotolog');
const photo =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
test('Fotolog accepts bounded raster uploads and rejects unsafe image sources', () => {
  assert.ok(image(photo));
  assert.ok(color('#ffffff'));
  assert.ok(!color('red'));
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'https://example.com/x.png', photo + '!'])
    assert.ok(!image(value));
});
test(
  'Fotolog daily uniqueness, persisted comments/favorites, and tenant isolation',
  { skip: process.env.FOTOLOG_INTEGRATION !== '1' },
  async (t) => {
    const db = new Pool({ host: '127.0.0.1', port: 55439, database: 'msn_local', user: 'msn_local', password: 'local-only' });
    const ids = [];
    t.after(async () => {
      await db.query('DELETE FROM users WHERE id=ANY($1::int[])', [ids]);
      await db.end();
    });
    const create = async (company) => {
      const suffix = randomUUID();
      const user = (
        await db.query(
          'INSERT INTO users(email,username,password_hash,company_id,event_id) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [`${suffix}@local.test`, suffix, 'test', company, 'local-retro']
        )
      ).rows[0];
      ids.push(user.id);
      return { ...user, token: jwt.sign({ sub: user.id, companyId: company, eventId: 'local-retro' }, 'local-development-only') };
    };
    const alice = await create('local-company'),
      bob = await create('local-company'),
      other = await create('other-company');
    const request = async (path, user = alice, method = 'GET', body) => {
      const r = await fetch(`http://localhost:3309/fotolog${path}`, {
        method,
        headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: r.status, body: await r.json() };
    };
    assert.equal((await request(`/profiles/${other.id}`)).status, 404);
    assert.equal(
      (
        await request('/profile', alice, 'PUT', {
          name: 'Retro',
          description: 'My page',
          theme: { backgroundColor: '#ffffff', banner: photo },
        })
      ).status,
      200
    );
    assert.equal(
      (await request('/profile', alice, 'PUT', { name: 'Retro', description: '', theme: { banner: 'javascript:alert(1)' } }))
        .status,
      400
    );
    const posts = await Promise.all([
      request('/posts', alice, 'POST', { image: photo, title: 'Today', body: 'A memory' }),
      request('/posts', alice, 'POST', { image: photo, title: 'Duplicate' }),
    ]);
    assert.deepEqual(posts.map((p) => p.status).sort(), [201, 409]);
    const id = posts.find((p) => p.status === 201).body.id;
    assert.equal((await request(`/posts/${id}/comments`, bob, 'POST', { body: 'Me pasé!' })).status, 201);
    assert.equal((await request(`/posts/${id}/comments`)).body[0].body, 'Me pasé!');
    const foreignPost = (
      await db.query('INSERT INTO fotolog_posts(user_id,image,title,day) VALUES($1,$2,$3,CURRENT_DATE) RETURNING id', [
        other.id,
        photo,
        'Other',
      ])
    ).rows[0].id;
    assert.equal((await request(`/posts/${foreignPost}/comments`)).status, 404);
    assert.equal((await request(`/posts/${foreignPost}/comments`, alice, 'POST', { body: 'No' })).status, 404);
    assert.equal((await request(`/favorites/${other.id}`, alice, 'PUT')).status, 400);
    assert.equal((await request(`/favorites/${bob.id}`, alice, 'PUT')).status, 200);
    const profile = (await request(`/profiles/${alice.id}`)).body;
    assert.equal(profile.profile.name, 'Retro');
    assert.equal(profile.posts.length, 1);
    assert.equal(profile.favorites[0].id, bob.id);
    assert.deepEqual((await request(`/profiles/${bob.id}`)).body.profile.theme, {});
    assert.equal((await request(`/favorites/${bob.id}`, alice, 'DELETE')).status, 200);
    assert.equal((await request(`/profiles/${alice.id}`)).body.favorites.length, 0);
  }
);
