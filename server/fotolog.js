const image = (value) =>
  typeof value === 'string' && value.length <= 700000 && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
const color = (value) => /^#[a-fA-F0-9]{6}$/.test(value);
module.exports = function registerFotolog(app, { db, auth, asyncRoute, getUser, config }) {
  const exists = async (id) => Number.isSafeInteger(Number(id)) && (await getUser(Number(id)));
  app.get(
    '/fotolog/users',
    auth,
    asyncRoute(async (req, res) => {
      const result = await db.query(
        `SELECT u.id, u.username, COALESCE(p.name, u.username) AS name,
      (SELECT image FROM fotolog_posts WHERE user_id=u.id ORDER BY day DESC LIMIT 1) AS image
      FROM users u LEFT JOIN fotolog_profiles p ON p.user_id=u.id WHERE company_id=$1 AND event_id=$2 AND u.username ILIKE $3 ORDER BY u.username LIMIT 40`,
        [config.companyId, config.eventId, `%${String(req.query.search || '').slice(0, 80)}%`]
      );
      res.json(result.rows);
    })
  );
  app.get(
    '/fotolog/profiles/:id',
    auth,
    asyncRoute(async (req, res) => {
      const user = await exists(req.params.id);
      if (!user) return res.status(404).json({ error: 'Fotolog no encontrado' });
      const [profile, posts, favorites] = await Promise.all([
        db.query('SELECT * FROM fotolog_profiles WHERE user_id=$1', [user.id]),
        db.query('SELECT id, image, title, body, day::text FROM fotolog_posts WHERE user_id=$1 ORDER BY day DESC', [user.id]),
        db.query(
          `SELECT u.id, u.username, (SELECT image FROM fotolog_posts WHERE user_id=u.id ORDER BY day DESC LIMIT 1) AS image FROM fotolog_favorites f JOIN users u ON u.id=f.favorite_id WHERE f.user_id=$1 ORDER BY f.created_at DESC`,
          [user.id]
        ),
      ]);
      res.json({
        profile: {
          user_id: user.id,
          name: user.username,
          description: '',
          theme: {},
          ...profile.rows[0],
          username: user.username,
        },
        posts: posts.rows,
        favorites: favorites.rows,
      });
    })
  );
  app.put(
    '/fotolog/profile',
    auth,
    asyncRoute(async (req, res) => {
      const { name, description, theme = {} } = req.body || {};
      if (
        typeof name !== 'string' ||
        !name.trim() ||
        name.length > 80 ||
        typeof description !== 'string' ||
        description.length > 1000 ||
        !theme ||
        typeof theme !== 'object' ||
        Array.isArray(theme)
      )
        return res.status(400).json({ error: 'Perfil inválido' });
      const clean = {};
      for (const key of ['backgroundColor', 'textColor', 'linkColor']) {
        if (theme[key] && !color(theme[key])) return res.status(400).json({ error: 'Color inválido' });
        if (theme[key]) clean[key] = theme[key];
      }
      for (const key of ['banner', 'background']) {
        if (theme[key] && !image(theme[key])) return res.status(400).json({ error: 'Imagen inválida o demasiado grande' });
        if (theme[key]) clean[key] = theme[key];
      }
      await db.query(
        'INSERT INTO fotolog_profiles(user_id,name,description,theme) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET name=$2,description=$3,theme=$4',
        [req.user.id, name.trim(), description, clean]
      );
      res.json({ ok: true });
    })
  );
  app.post(
    '/fotolog/posts',
    auth,
    asyncRoute(async (req, res) => {
      const { image: photo, title, body = '' } = req.body || {};
      if (
        !image(photo) ||
        typeof title !== 'string' ||
        !title.trim() ||
        title.length > 160 ||
        typeof body !== 'string' ||
        body.length > 10000
      )
        return res.status(400).json({ error: 'Revisá la foto, el título y el texto' });
      const result = await db.query(
        `INSERT INTO fotolog_posts(user_id,image,title,body,day) VALUES($1,$2,$3,$4,(now() AT TIME ZONE $5)::date) ON CONFLICT(user_id,day) DO NOTHING RETURNING id`,
        [req.user.id, photo, title.trim(), body, config.timezone]
      );
      if (!result.rows.length) return res.status(409).json({ error: 'Ya publicaste tu foto de hoy. ¡Volvé mañana!' });
      res.status(201).json(result.rows[0]);
    })
  );
  const post = async (id) =>
    Number.isSafeInteger(Number(id)) && (await db.query('SELECT user_id FROM fotolog_posts WHERE id=$1', [id])).rows[0];
  app.get(
    '/fotolog/posts/:id/comments',
    auth,
    asyncRoute(async (req, res) => {
      const p = await post(req.params.id);
      if (!p || !(await exists(p.user_id))) return res.status(404).json({ error: 'Foto no encontrada' });
      res.json(
        (
          await db.query(
            'SELECT c.id,c.body,c.created_at,u.id AS user_id,u.username FROM fotolog_comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at,c.id',
            [req.params.id]
          )
        ).rows
      );
    })
  );
  app.post(
    '/fotolog/posts/:id/comments',
    auth,
    asyncRoute(async (req, res) => {
      const p = await post(req.params.id);
      if (!p || !(await exists(p.user_id))) return res.status(404).json({ error: 'Foto no encontrada' });
      if (typeof req.body?.body !== 'string' || !req.body?.body.trim() || req.body?.body.length > 2000)
        return res.status(400).json({ error: 'La firma debe tener entre 1 y 2000 caracteres' });
      await db.query('INSERT INTO fotolog_comments(post_id,user_id,body) VALUES($1,$2,$3)', [
        req.params.id,
        req.user.id,
        req.body?.body.trim(),
      ]);
      res.status(201).json({ ok: true });
    })
  );
  app.put(
    '/fotolog/favorites/:id',
    auth,
    asyncRoute(async (req, res) => {
      if (!(await exists(req.params.id)) || Number(req.params.id) === req.user.id)
        return res.status(400).json({ error: 'Favorito inválido' });
      await db.query('INSERT INTO fotolog_favorites(user_id,favorite_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [
        req.user.id,
        req.params.id,
      ]);
      res.json({ ok: true });
    })
  );
  app.delete(
    '/fotolog/favorites/:id',
    auth,
    asyncRoute(async (req, res) => {
      if (!Number.isSafeInteger(Number(req.params.id))) return res.status(400).json({ error: 'Favorito inválido' });
      await db.query('DELETE FROM fotolog_favorites WHERE user_id=$1 AND favorite_id=$2', [req.user.id, req.params.id]);
      res.json({ ok: true });
    })
  );
};
module.exports.image = image;
module.exports.color = color;
