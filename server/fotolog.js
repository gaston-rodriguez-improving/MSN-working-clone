const { ensureFotologUrl } = require('./fotologUrls');
const image = (value) =>
  typeof value === 'string' && value.length <= 700000 && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
const fotologName = (user) => String(user?.account_name || '').trim() || 'Mi Fotolog';
const nameSql = "COALESCE(NULLIF(BTRIM(p.name), ''), NULLIF(BTRIM(u.account_name), ''), 'Mi Fotolog')";
const color = (value) => /^#[a-fA-F0-9]{6}$/.test(value);
module.exports = function registerFotolog(app, { db, auth, asyncRoute, getUser, config, isAdminRequest }) {
  const exists = async (id) => Number.isSafeInteger(Number(id)) && (await getUser(Number(id)));
  const withUrls = async (rows, key = 'id') =>
    Promise.all(rows.map(async (row) => ({ ...row, slug: await ensureFotologUrl(db, row[key]) })));
  app.get(
    '/fotolog/users',
    auth,
    asyncRoute(async (req, res) => {
      const result = await db.query(
        `SELECT u.id, ${nameSql} AS name,
      (SELECT image FROM fotolog_posts WHERE user_id=u.id ORDER BY day DESC LIMIT 1) AS image
      FROM users u LEFT JOIN fotolog_profiles p ON p.user_id=u.id WHERE company_id=$1 AND event_id=$2 AND ${nameSql} ILIKE $3 ORDER BY name, u.id LIMIT 40`,
        [config.companyId, config.eventId, `%${String(req.query.search || '').slice(0, 80)}%`]
      );
      res.json(await withUrls(result.rows));
    })
  );
  app.get(
    '/fotolog/profiles/:id',
    (req, res, next) => req.params.id === 'leni' && !req.get('authorization') ? next() : auth(req, res, next),
    asyncRoute(async (req, res) => {
      const ref = req.params.id;
      const user = /^\d+$/.test(ref)
        ? await exists(ref)
        : (
            await db.query(
              'SELECT u.* FROM fotolog_urls f JOIN users u ON u.id=f.user_id WHERE f.slug=$1 AND u.company_id=$2 AND u.event_id=$3',
              [ref, config.companyId, config.eventId]
            )
          ).rows[0];
      if (!user || (!req.user && (!user.is_managed_profile || user.email !== 'fotolog-leni@system.invalid'))) return res.status(404).json({ error: 'Fotolog no encontrado' });
      const [profile, posts, favorites, viewer] = await Promise.all([
        db.query('SELECT * FROM fotolog_profiles WHERE user_id=$1', [user.id]),
        db.query('SELECT id, image, title, body, day::text FROM fotolog_posts WHERE user_id=$1 ORDER BY day DESC', [user.id]),
        db.query(
          `SELECT u.id, ${nameSql} AS name, (SELECT image FROM fotolog_posts WHERE user_id=u.id ORDER BY day DESC LIMIT 1) AS image FROM fotolog_favorites f JOIN users u ON u.id=f.favorite_id LEFT JOIN fotolog_profiles p ON p.user_id=u.id WHERE f.user_id=$1 ORDER BY f.created_at DESC`,
          [user.id]
        ),
        req.user ? db.query('SELECT name FROM fotolog_profiles WHERE user_id=$1', [req.user.id]) : Promise.resolve({ rows: [] }),
      ]);
      const canManage = !!req.user && (user.id === req.user.id || (user.is_managed_profile && await isAdminRequest(req)));
      res.json({
        viewerName: viewer.rows[0]?.name || fotologName(req.user),
        profile: {
          user_id: user.id,
          description: '',
          theme: {},
          ...profile.rows[0],
          name: profile.rows[0]?.name?.trim() || fotologName(user),
          slug: await ensureFotologUrl(db, user.id),
          canManage,
        },
        posts: posts.rows,
        favorites: req.user ? await withUrls(favorites.rows) : [],
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
      const targetId = Number(req.body?.userId || req.user.id);
      const target = await exists(targetId);
      if (!target) return res.status(404).json({ error: 'Fotolog no encontrado' });
      if (targetId !== req.user.id && (req.params.userId || !target.is_managed_profile || !(await isAdminRequest(req))))
        return res.status(403).json({ error: 'Solo los administradores pueden editar este Fotolog' });
      await db.query(
        'INSERT INTO fotolog_profiles(user_id,name,description,theme) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET name=$2,description=$3,theme=$4',
        [targetId, name.trim(), description, clean]
      );
      res.json({ ok: true, slug: await ensureFotologUrl(db, targetId) });
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
      const targetId = Number(req.body?.userId || req.user.id);
      const target = await exists(targetId);
      if (!target) return res.status(404).json({ error: 'Fotolog no encontrado' });
      if (targetId !== req.user.id && (req.params.userId || !target.is_managed_profile || !(await isAdminRequest(req))))
        return res.status(403).json({ error: 'Solo los administradores pueden publicar en este Fotolog' });
      const result = await db.query(
        `INSERT INTO fotolog_posts(user_id,image,title,body,day) VALUES($1,$2,$3,$4,(now() AT TIME ZONE $5)::date) ON CONFLICT(user_id,day) DO NOTHING RETURNING id`,
        [targetId, photo, title.trim(), body, config.timezone]
      );
      if (!result.rows.length) return res.status(409).json({ error: 'Ya publicaste tu foto de hoy. ¡Volvé mañana!' });
      res.status(201).json(result.rows[0]);
    })
  );
  const post = async (id) =>
    Number.isSafeInteger(Number(id)) && (await db.query('SELECT user_id FROM fotolog_posts WHERE id=$1', [id])).rows[0];
  app.get(
    '/fotolog/posts/:id/comments',
    asyncRoute(async (req, res, next) => {
      if (req.get('authorization')) return auth(req, res, next);
      const p = await post(req.params.id);
      const owner = p && await exists(p.user_id);
      if (owner?.is_managed_profile && owner.email === 'fotolog-leni@system.invalid') return next();
      return auth(req, res, next);
    }),
    asyncRoute(async (req, res) => {
      const p = await post(req.params.id);
      if (!p || !(await exists(p.user_id))) return res.status(404).json({ error: 'Foto no encontrada' });
      res.json(
        await withUrls(
          (
            await db.query(
              `SELECT c.id,c.body,c.created_at,u.id AS user_id,${nameSql} AS name FROM fotolog_comments c JOIN users u ON u.id=c.user_id LEFT JOIN fotolog_profiles p ON p.user_id=u.id WHERE c.post_id=$1 ORDER BY c.created_at,c.id`,
              [req.params.id]
            )
          ).rows,
          'user_id'
        )
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
