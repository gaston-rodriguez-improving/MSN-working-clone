import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../data/api';
import { stripHtml } from '../helpers/stripHtml';
import '../features/fotolog/fotolog.css';

const MAX_UPLOAD_SIZE = 500000;
const COMPRESSED_TARGET_SIZE = 460000;

function asDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(blob);
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo comprimir la imagen'));
      },
      type,
      quality
    );
  });
}

async function readImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))
    throw new Error('Elegí una imagen JPG, PNG, WebP o GIF.');
  if (file.size <= MAX_UPLOAD_SIZE) return asDataUrl(file);
  if (file.type === 'image/gif') throw new Error('El GIF animado debe pesar menos de 500 KB.');
  if (typeof createImageBitmap !== 'function') throw new Error('Este navegador no permite reducir la imagen automáticamente.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen para subir.');
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const type = file.type === 'image/png' ? 'image/webp' : file.type;

    for (let sizePass = 0; sizePass < 6; sizePass += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56]) {
        const compressed = await canvasBlob(canvas, type, quality);
        if (compressed.size <= COMPRESSED_TARGET_SIZE) return await asDataUrl(compressed);
      }
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
    throw new Error('No se pudo reducir la imagen a menos de 500 KB.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('500 KB')) throw error;
    throw new Error(error.message || 'No se pudo comprimir la imagen.');
  } finally {
    bitmap?.close();
  }
}
async function customization(values, current) {
  const theme = { ...current?.theme };
  for (const key of ['backgroundColor', 'textColor', 'linkColor']) theme[key] = values.get(key);
  for (const key of ['banner', 'background']) {
    if (values.get(`remove-${key}`)) delete theme[key];
    if (values.get(key)?.size) theme[key] = await readImage(values.get(key));
  }
  return { name: values.get('name'), description: values.get('description'), theme };
}
const date = (value) => value?.split('-').reverse().join('-');
export default function FotologPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const id = window.location.pathname === '/fotolog/leni' ? 'leni' : userId || user?.id;

  const [data, setData] = useState(null);
  const mine = !!user && data?.profile.user_id === user.id;
  const [comments, setComments] = useState([]);
  const [view, setView] = useState('photo');
  const [modal, setModal] = useState(null);
  const [ownProfile, setOwnProfile] = useState(null);
  const [ownData, setOwnData] = useState(null);
  const [preview, setPreview] = useState(null);
  const customizationForm = useRef(null);
  const previewRef = useRef(null);
  useEffect(() => {
    if (preview) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      previewRef.current?.focus({ preventScroll: true });
    }
  }, [preview]);
  useEffect(() => {
    setPreview(null);
  }, [modal]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const displayData = preview ? ownData : data;
  const canManage = !!data?.profile.canManage;
  const selected = displayData?.posts.find((p) => String(p.id) === params.get('photo')) || displayData?.posts[0];
  const selectedId = selected?.id;
  useEffect(() => {
    if (data?.reference === String(id) && data?.profile.slug && userId !== data.profile.slug) {
      navigate(`/fotolog/${data.profile.slug}${window.location.search}`, { replace: true });
    }
  }, [data?.profile.slug, data?.reference, id, userId, navigate]);
  const index = displayData?.posts.indexOf(selected) ?? 0;
  useEffect(() => {
    const previous = document.title;
    document.title = 'Fotolog · Throwback in time';
    const icons = [...document.head.querySelectorAll('link[rel~="icon"]')];
    const savedIcons = icons.map((icon) => ({ icon, href: icon.getAttribute('href'), type: icon.getAttribute('type') }));
    const favicon = icons[0] || document.createElement('link');
    if (!icons.length) {
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    for (const icon of icons.length ? icons : [favicon]) {
      icon.href = '/assets/fotolog/favicon.svg';
      icon.type = 'image/svg+xml';
    }
    return () => {
      document.title = previous;
      for (const { icon, href, type } of savedIcons) {
        if (href === null) icon.removeAttribute('href');
        else icon.setAttribute('href', href);
        if (type === null) icon.removeAttribute('type');
        else icon.setAttribute('type', type);
      }
      if (!icons.length) favicon.remove();
    };
  }, []);
  async function load() {
    const response = await api.get(`/fotolog/profiles/${id}`);
    setData({ ...response.data, reference: String(id) });
  }
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setView('photo');
    setError('');
    api
      .get(`/fotolog/profiles/${id}`)
      .then((r) => {
        if (active) setData({ ...r.data, reference: String(id) });
      })
      .catch((e) => {
        if (active) setError(e.response?.data?.error || 'No se pudo cargar el Fotolog');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user?.id]);
  useEffect(() => {
    let active = true;
    setComments([]);
    if (selectedId)
      api
        .get(`/fotolog/posts/${selectedId}/comments`)
        .then((r) => {
          if (active) setComments(r.data);
        })
        .catch(() => {
          if (active) setError('No se pudieron cargar las firmas');
        });
    return () => {
      active = false;
    };
  }, [selectedId]);
  async function action(work) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }
  function select(p) {
    setParams({ photo: p.id });
    setView('photo');
  }
  const profile = preview ? { ...ownProfile, ...preview } : data?.profile;
  const profileDisplayName = stripHtml(profile?.name || 'Mi Fotolog');
  const theme = profile?.theme || {};
  return (
    <div
      className={`fotolog${preview ? ' fl-preview-active' : ''}`}
      style={{
        '--fl-bg': theme.backgroundColor || '#ffffff',
        '--fl-text': theme.textColor || '#000000',
        '--fl-link': theme.linkColor || '#000000',
        backgroundImage: theme.background ? `url("${theme.background}")` : undefined,
      }}
    >
      {preview && (
        <div className="fl-preview-toolbar" ref={previewRef} tabIndex={-1} aria-label="Vista previa de tu Fotolog">
          <span>
            <strong>Vista previa</strong> · Cambios sin guardar
          </span>
          <div className="fl-preview-controls">
            <button disabled={busy} onClick={() => setPreview(null)}>
              Volver a editar
            </button>
            <button disabled={busy} onClick={() => customizationForm.current?.requestSubmit()}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setModal(null);
                setError('');
              }}
            >
              Cancelar
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      <div className="fl-wrap" inert={preview ? '' : undefined}>
        <header className="fl-header">
          <Link to="/fotolog" className="fl-logo">
            <span />
            FOTOLOG<sup>®</sup>
          </Link>
          <form
            className="fl-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (!user) { navigate('/login'); return; }
              action(async () => {
                setResults((await api.get('/fotolog/users', { params: { search: query } })).data);
                setView('search');
              });
            }}
          >
            <div>
              <input
                aria-label="Buscar fotologs"
                placeholder="Buscar"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={80}
              />
              <button disabled={busy}>GO</button>
            </div>
            <small>Buscá a tus amigos en FOTOLOG</small>
          </form>
          <div className="fl-account">
            {user ? <>Hi <b>{stripHtml(data?.viewerName || user.accountName || 'Mi Fotolog')}</b></> : <Link to="/login">Login</Link>}
            <br />
            <Link to="/">Messenger</Link> | Español
          </div>
          <nav>
            <Link to="/fotolog" onClick={() => setView('photo')}>
              MI FOTOLOG ›
            </Link>
            {(mine || canManage) && (
              <button
                onClick={() => {
                  setError('');
                  setOwnProfile(data.profile);
                  setOwnData(data);
                  setModal('upload');
                }}
              >
                SUBIR FOTO
              </button>
            )}
            <button onClick={() => setView('archive')}>ARCHIVO</button>
            <button onClick={() => setView('friends')}>AMIGOS/FAVORITOS</button>
            {(mine || canManage) && (
              <button
                onClick={() => {
                  action(async () => {
                    const own = canManage && !mine ? data : (await api.get(`/fotolog/profiles/${user?.id}`)).data;
                    setOwnProfile(own.profile);
                    setOwnData(own);
                    setModal('custom');
                  });
                }}
              >
                {canManage && !mine ? 'ADMINISTRAR LENI' : 'MI CUENTA'}
              </button>
            )}
          </nav>
        </header>
        <div className="fl-notice">Una foto por día. Un recuerdo para siempre.</div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        {loading && <p role="status">Cargando Fotolog…</p>}
        {profile && (
          <>
            {theme.banner && <img className="fl-banner" src={theme.banner} alt={`Banner de ${profileDisplayName}`} />}
            <div className="fl-profile">
              <h1>{profileDisplayName}</h1>
              <span>Acerca de {profileDisplayName} · </span>
              <button className="fl-link" onClick={() => setView('archive')}>
                Mi archivo
              </button>
              <p>{profile.description || 'Bienvenidos a mi Fotolog :)'}</p>
              {user && !mine && !canManage && (
                <button
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await api.put(`/fotolog/favorites/${profile.user_id}`);
                      setError('¡Agregado a tus favoritos!');
                    })
                  }
                >
                  Agregar a favoritos
                </button>
              )}
            </div>
            <div className="fl-columns">
              <aside>
                <h3>Fotos Recientes</h3>
                <p>de {profileDisplayName}</p>
                {displayData.posts.slice(0, 6).map((p) => (
                  <figure key={p.id}>
                    <button className="fl-thumbnail" onClick={() => select(p)}>
                      <img src={p.image} alt={p.title} />
                    </button>
                    <figcaption>
                      <button className="fl-link" onClick={() => select(p)}>
                        {date(p.day)} »
                      </button>
                    </figcaption>
                  </figure>
                ))}
                {!displayData.posts.length && <p>Todavía no hay fotos.</p>}
              </aside>
              <main>
                {view === 'photo' &&
                  (selected ? (
                    <>
                      <div className="fl-pager">
                        <button
                          disabled={index >= displayData.posts.length - 1}
                          onClick={() => select(displayData.posts[index + 1])}
                        >
                          « Anterior
                        </button>
                        <button disabled={index === 0} onClick={() => select(displayData.posts[index - 1])}>
                          Siguiente »
                        </button>
                      </div>
                      <img className="fl-photo" src={selected.image} alt={selected.title} />
                      <div className="fl-meta">
                        {date(selected.day)} · Cámara: Sin indicar
                        <br />
                        <Link to={`/fotolog/${profile.slug}?photo=${selected.id}`}>Permalink</Link> ·{' '}
                        <button className="fl-link" onClick={() => setView('archive')}>
                          Ver todas las fotos
                        </button>
                      </div>
                      <article className="fl-caption">
                        <h2>{selected.title}</h2>
                        <p>{selected.body}</p>
                      </article>
                      <section className="fl-guestbook">
                        <h3>Libro de visitas</h3>
                        {comments.map((c) => (
                          <div className="fl-comment" key={c.id}>
                            <Link to={`/fotolog/${c.slug}`}>{stripHtml(c.name)}</Link>
                            <time>{new Date(c.created_at).toLocaleString('es-AR')}</time>
                            <p>{c.body}</p>
                          </div>
                        ))}
                        {!comments.length && <p>Sé el primero en firmar :)</p>}
                        {user ? <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const body = new FormData(form).get('body');
                            action(async () => {
                              await api.post(`/fotolog/posts/${selected.id}/comments`, { body });
                              setComments((await api.get(`/fotolog/posts/${selected.id}/comments`)).data);
                              form.reset();
                            });
                          }}
                        >
                          <label>
                            Dejá tu firma :)
                            <textarea name="body" required maxLength={2000} rows={3} placeholder="Me pasé! ¿Te pasás? ♥" />
                          </label>
                          <button disabled={busy}>Firmar</button>
                        </form> : <p><Link to="/login">Iniciá sesión para dejar tu firma</Link></p>}
                      </section>
                    </>
                  ) : (
                    <div className="fl-empty">
                      <h2>Tu historia empieza con una foto.</h2>
                      <p>Un lugar para los amigos, los recuerdos y las firmas.</p>
                      {mine && <button onClick={() => setModal('upload')}>Subí tu primera foto</button>}
                    </div>
                  ))}
                {view === 'archive' && (
                  <>
                    <h2>Archivo de fotos</h2>
                    <p>{displayData.posts.length} recuerdos</p>
                    <div className="fl-grid">
                      {displayData.posts.map((p) => (
                        <button key={p.id} onClick={() => select(p)}>
                          <img src={p.image} alt={p.title} />
                          <span>
                            {date(p.day)}
                            <br />
                            {p.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {view === 'search' && (
                  <>
                    <h2>Buscar fotologs</h2>
                    <p>{results.length ? `${results.length} resultados` : 'No encontramos fotologs.'}</p>
                    {results.map((r) => (
                      <p key={r.id}>
                        <Link to={`/fotolog/${r.slug}`}>{stripHtml(r.name)}</Link>
                      </p>
                    ))}
                  </>
                )}
                {view === 'friends' && (
                  <>
                    <h2>Amigos/Favoritos</h2>
                    {!displayData.favorites.length && <p>Buscá un Fotolog y agregalo a tus favoritos.</p>}
                    {displayData.favorites.map((f) => (
                      <p key={f.id}>
                        <Link to={`/fotolog/${f.slug}`}>{stripHtml(f.name)}</Link>{' '}
                        {mine && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await api.delete(`/fotolog/favorites/${f.id}`);
                                await load();
                              })
                            }
                          >
                            Quitar
                          </button>
                        )}
                      </p>
                    ))}
                  </>
                )}
              </main>
              <aside className="fl-friends">
                <h3>Amigos/Favoritos</h3>
                <p>de {profileDisplayName}</p>
                {displayData.favorites.map((f) => (
                  <figure key={f.id}>
                    <Link to={`/fotolog/${f.slug}`}>
                      {f.image ? <img src={f.image} alt={stripHtml(f.name)} /> : <div className="fl-no-photo">Sin foto</div>}
                      <figcaption>{stripHtml(f.name)}</figcaption>
                    </Link>
                  </figure>
                ))}
                {!displayData.favorites.length && <p>Los amigos hacen la historia.</p>}
              </aside>
            </div>
          </>
        )}
        <footer>
          FOTOLOG · <Link to="/">Throwback in time</Link>
          <br />
          Fotos, amigos y recuerdos.
        </footer>
      </div>
      {modal && (
        <div className="fl-overlay" hidden={!!preview}>
          <dialog
            className="fl-dialog"
            ref={(node) => {
              if (!node) return;
              if (preview) node.close();
              else if (!node.open) node.showModal();
            }}
            onCancel={(e) => {
              e.preventDefault();
              if (!busy) setModal(null);
            }}
            aria-labelledby="fl-dialog-title"
          >
            <h2 id="fl-dialog-title">{modal === 'upload' ? 'La foto de hoy' : 'Personalizá tu Fotolog'}</h2>
            <form
              ref={customizationForm}
              onChange={() => setPreview(null)}
              onSubmit={(e) => {
                e.preventDefault();
                const values = new FormData(e.currentTarget);
                action(async () => {
                  if (modal === 'upload') {
                    await api.post('/fotolog/posts', {
                      userId: ownProfile?.user_id,
                      image: await readImage(values.get('image')),
                      title: values.get('title'),
                      body: values.get('body'),
                    });
                  } else {
                    const targetId = ownProfile?.user_id || user?.id;
                    const current = ownProfile || (await api.get(`/fotolog/profiles/${targetId}`)).data.profile;
                    await api.put('/fotolog/profile', { ...(await customization(values, current)), userId: targetId });
                  }
                  if (mine || canManage) await load();
                  else navigate('/fotolog');
                  setModal(null);
                  setView('photo');
                  if (mine || canManage) setParams({});
                });
              }}
            >
              {modal === 'upload' ? (
                <>
                  <label>
                    Foto
                    <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required autoFocus />
                  </label>
                  <small>Hasta 500 KB · las fotos grandes se reducen automáticamente · GIF animado sin comprimir</small>
                  <label>
                    Título
                    <input name="title" required maxLength={160} />
                  </label>
                  <label>
                    Texto
                    <textarea name="body" rows={4} maxLength={10000} />
                  </label>
                  <p>Podés publicar una foto por día.</p>
                </>
              ) : (
                <>
                  <label>
                    Nombre
                    <input
                      name="name"
                      defaultValue={stripHtml(ownProfile?.name || user?.accountName || 'Mi Fotolog')}
                      required
                      maxLength={80}
                      autoFocus
                    />
                  </label>
                  <label>
                    Descripción
                    <textarea name="description" defaultValue={ownProfile?.description || ''} maxLength={1000} />
                  </label>
                  {[
                    ['backgroundColor', 'Fondo', '#ffffff'],
                    ['textColor', 'Texto', '#000000'],
                    ['linkColor', 'Enlaces', '#000000'],
                  ].map(([key, label, fallback]) => (
                    <label key={key}>
                      {label}
                      <input type="color" name={key} defaultValue={ownProfile?.theme?.[key] || fallback} />
                    </label>
                  ))}
                  {[
                    ['banner', 'Banner'],
                    ['background', 'Imagen de fondo'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input type="file" name={key} accept="image/jpeg,image/png,image/webp,image/gif" />
                      <span>
                        <input type="checkbox" name={`remove-${key}`} /> Quitar imagen actual
                      </span>
                    </label>
                  ))}
                  <small>Hasta 500 KB · las imágenes grandes se reducen automáticamente.</small>
                </>
              )}
              {error && (
                <p role="alert" className="fl-error">
                  {error}
                </p>
              )}
              <div className="fl-actions">
                {modal === 'custom' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      const form = e.currentTarget.form;
                      if (!form.reportValidity()) return;
                      const values = new FormData(form);
                      action(async () => {
                        setPreview(await customization(values, ownProfile));
                        setView('photo');
                      });
                    }}
                  >
                    Preview
                  </button>
                )}
                <button disabled={busy}>{busy ? 'Guardando…' : modal === 'upload' ? 'Publicar' : 'Guardar'}</button>
                <button type="button" disabled={busy} onClick={() => setModal(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
