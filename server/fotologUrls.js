const reserved = new Set(['users', 'profiles', 'profile', 'posts', 'favorites', 'leni']);
function slugBase(name) {
  let slug =
    String(name)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      .replace(/-$/g, '') || 'fotolog';
  if (reserved.has(slug) || /^\d+$/.test(slug)) slug = `fotolog-${slug}`;
  return slug;
}
async function ensureFotologUrl(db, userId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize name/URL allocation for this account while unique slugs handle other accounts.
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const {
      rows: [user],
    } = await client.query(
      "SELECT COALESCE(NULLIF(p.name,''),NULLIF(u.account_name,''),'Mi Fotolog') AS name, u.is_managed_profile FROM users u LEFT JOIN fotolog_profiles p ON p.user_id=u.id WHERE u.id=$1",
      [userId]
    );
    const {
      rows: [current],
    } = await client.query('SELECT name,slug FROM fotolog_addresses WHERE user_id=$1', [userId]);
    if (current?.name === user.name) {
      await client.query('COMMIT');
      return current.slug;
    }
    const base = user.is_managed_profile ? 'leni' : slugBase(user.name);
    let slug = base;
    for (let attempt = 0; ; attempt += 1) {
      await client.query('INSERT INTO fotolog_urls(slug,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [slug, userId]);
      const {
        rows: [owner],
      } = await client.query('SELECT user_id FROM fotolog_urls WHERE slug=$1', [slug]);
      if (owner.user_id === userId) break;
      slug = `${base}-${userId}${attempt ? `-${attempt + 1}` : ''}`;
    }
    await client.query(
      'INSERT INTO fotolog_addresses(user_id,name,slug) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET name=$2,slug=$3',
      [userId, user.name, slug]
    );
    await client.query('COMMIT');
    return slug;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { slugBase, ensureFotologUrl };
