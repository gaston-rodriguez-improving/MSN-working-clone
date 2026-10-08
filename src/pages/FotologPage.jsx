import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../data/api';
import { stripHtml } from '../helpers/stripHtml';
import '../features/fotolog/fotolog.css';

const MAX_UPLOAD_SIZE = 500000;
const COMPRESSED_TARGET_SIZE = 460000;
const LANGUAGE_KEY = 'fotolog-language';
const languageFromBrowser = () => (/^es(?:-|$)/i.test(navigator.language || '') ? 'es' : 'en');
const translations = {
  es: {
    switchLanguage: 'English', search: 'Buscar', searchHint: 'Buscá a tus amigos en FOTOLOG', login: 'Iniciar sesión',
    myFotolog: 'MI FOTOLOG ›', upload: 'SUBIR FOTO', archive: 'ARCHIVO', favorites: 'AMIGOS/FAVORITOS', account: 'MI CUENTA', manage: 'ADMINISTRAR LENI',
    notice: 'Una foto por día. Un recuerdo para siempre.', loading: 'Cargando Fotolog…', about: 'Acerca de', myArchive: 'Mi archivo', welcome: 'Bienvenidos a mi Fotolog :)', addFavorite: 'Agregar a favoritos',
    recent: 'Fotos Recientes', of: 'de', noPhotos: 'Todavía no hay fotos.', previous: '« Anterior', next: 'Siguiente »', camera: 'Cámara: Sin indicar', permalink: 'Permalink', allPhotos: 'Ver todas las fotos',
    guestbook: 'Libro de visitas', firstSign: 'Sé el primero en firmar :)', leaveSignature: 'Dejá tu firma :)', signaturePlaceholder: 'Me pasé! ¿Te pasás? ♥', sign: 'Firmar', loginToSign: 'Iniciá sesión para dejar tu firma',
    storyStarts: 'Tu historia empieza con una foto.', storySub: 'Un lugar para los amigos, los recuerdos y las firmas.', firstPhoto: 'Subí tu primera foto', photoArchive: 'Archivo de fotos', memories: 'recuerdos', searchFotologs: 'Buscar fotologs', results: 'resultados', noResults: 'No encontramos fotologs.', findFavorite: 'Buscá un Fotolog y agregalo a tus favoritos.', remove: 'Quitar', noPhoto: 'Sin foto', friendsStory: 'Los amigos hacen la historia.',
    footer: 'Fotos, amigos y recuerdos.', todayPhoto: 'La foto de hoy', customize: 'Personalizá tu Fotolog', preview: 'Vista previa', unsaved: 'Cambios sin guardar', edit: 'Volver a editar', saveChanges: 'Guardar cambios', cancel: 'Cancelar',
    photo: 'Foto', uploadHint: 'Hasta 500 KB · las fotos grandes se reducen automáticamente · GIF animado sin comprimir', title: 'Título', text: 'Texto', dailyLimit: 'Podés publicar una foto por día.', name: 'Nombre', description: 'Descripción', background: 'Fondo', links: 'Enlaces', banner: 'Banner', backgroundImage: 'Imagen de fondo', removeCurrent: 'Quitar imagen actual', imageHint: 'Hasta 500 KB · las imágenes grandes se reducen automáticamente.', save: 'Guardar', publish: 'Publicar',
    addSuccess: '¡Agregado a tus favoritos!',
  },
  en: {
    switchLanguage: 'Español', search: 'Search', searchHint: 'Find your friends on FOTOLOG', login: 'Log in',
    myFotolog: 'MY FOTOLOG ›', upload: 'UPLOAD PHOTO', archive: 'ARCHIVE', favorites: 'FRIENDS/FAVORITES', account: 'MY ACCOUNT', manage: 'MANAGE LENI',
    notice: 'One photo a day. A memory forever.', loading: 'Loading Fotolog…', about: 'About', myArchive: 'My archive', welcome: 'Welcome to my Fotolog :)', addFavorite: 'Add to favorites',
    recent: 'Recent Photos', of: 'by', noPhotos: 'No photos yet.', previous: '« Previous', next: 'Next »', camera: 'Camera: Not specified', permalink: 'Permalink', allPhotos: 'View all photos',
    guestbook: 'Guestbook', firstSign: 'Be the first to sign :)', leaveSignature: 'Leave your signature :)', signaturePlaceholder: 'I stopped by! Come visit ♥', sign: 'Sign', loginToSign: 'Log in to leave a signature',
    storyStarts: 'Your story starts with a photo.', storySub: 'A place for friends, memories, and signatures.', firstPhoto: 'Upload your first photo', photoArchive: 'Photo archive', memories: 'memories', searchFotologs: 'Search Fotologs', results: 'results', noResults: 'No Fotologs found.', findFavorite: 'Find a Fotolog and add it to your favorites.', remove: 'Remove', noPhoto: 'No photo', friendsStory: 'Friends make history.',
    footer: 'Photos, friends, and memories.', todayPhoto: 'Today’s photo', customize: 'Customize your Fotolog', preview: 'Preview', unsaved: 'Changes not saved', edit: 'Back to editing', saveChanges: 'Save changes', cancel: 'Cancel',
    photo: 'Photo', uploadHint: 'Up to 500 KB · larger photos are automatically resized · animated GIFs must stay uncompressed', title: 'Title', text: 'Text', dailyLimit: 'You can post one photo per day.', name: 'Name', description: 'Description', background: 'Background', links: 'Links', banner: 'Banner', backgroundImage: 'Background image', removeCurrent: 'Remove current image', imageHint: 'Up to 500 KB · larger images are automatically resized.', save: 'Save', publish: 'Post',
    addSuccess: 'Added to your favorites!',
  },
};

function initialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === 'en' || saved === 'es' ? saved : languageFromBrowser();
  } catch {
    return languageFromBrowser();
  }
}

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
const date = (value, locale = 'es-AR') => (value ? new Date(`${value}T12:00:00`).toLocaleDateString(locale) : '');
export default function FotologPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [language, setLanguage] = useState(initialLanguage);
  const t = translations[language];
  const locale = language === 'es' ? 'es-AR' : 'en';
  const [actingAccount, setActingAccount] = useState('personal');
  const requestOptions = { headers: { 'X-Fotolog-Account': actingAccount } };
  const fotologApi = {
    get: (url, options = {}) => api.get(url, { ...options, headers: { ...options.headers, ...requestOptions.headers } }),
    post: (url, body) => api.post(url, body, requestOptions),
    put: (url, body) => api.put(url, body, requestOptions),
    delete: (url) => api.delete(url, requestOptions),
  };
  useEffect(() => { setActingAccount('personal'); }, [user?.id]);
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const id = window.location.pathname === '/fotolog/leni' ? 'leni' : userId || (actingAccount === 'leni' ? 'leni' : user?.id);

  const [data, setData] = useState(null);
  const mine = !!user && data?.profile.user_id === (data?.actorId || user.id);
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
  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Keep the in-memory choice if storage is unavailable. */ }
    document.documentElement.lang = language;
  }, [language]);
  function toggleLanguage() {
    setLanguage((current) => current === 'es' ? 'en' : 'es');
  }
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
    const response = await fotologApi.get(`/fotolog/profiles/${id}`);
    setData({ ...response.data, reference: String(id) });
  }
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setView('photo');
    setError('');
    fotologApi
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
  }, [id, user?.id, actingAccount]);
  useEffect(() => {
    let active = true;
    setComments([]);
    if (selectedId)
      fotologApi
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
        <div className="fl-preview-toolbar" ref={previewRef} tabIndex={-1} aria-label={`${t.preview} ${profileDisplayName}`}>
          <span>
            <strong>{t.preview}</strong> · {t.unsaved}
          </span>
          <div className="fl-preview-controls">
            <button disabled={busy} onClick={() => setPreview(null)}>
              {t.edit}
            </button>
            <button disabled={busy} onClick={() => customizationForm.current?.requestSubmit()}>
              {busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : t.saveChanges}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setModal(null);
                setError('');
              }}
            >
              {t.cancel}
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      {user && data?.canActAsLeni && actingAccount === 'leni' && (
        <div className="fl-identity-bar" role="status">
          <strong>Estás usando la cuenta de Leni</strong>
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
                setResults((await fotologApi.get('/fotolog/users', { params: { search: query } })).data);
                setView('search');
              });
            }}
          >
            <div>
              <input
                aria-label="Buscar fotologs"
                placeholder={t.search}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={80}
              />
              <button disabled={busy}>GO</button>
            </div>
            <small>{t.searchHint}</small>
          </form>
          <div className="fl-account">
            {user ? <>{language === 'es' ? 'Hola' : 'Hi'} <b>{stripHtml(data?.viewerName || user.accountName || 'Mi Fotolog')}</b></> : <Link to="/login">{t.login}</Link>}
            <br />
            {user && data?.canActAsLeni && (
              <>
                <select className="fl-account-switch" aria-label="Leni/Personal" value={actingAccount} disabled={busy || !!modal} onChange={(e) => setActingAccount(e.target.value)}>
                  <option value="leni">Leni</option>
                  <option value="personal">Personal</option>
                </select>
                {' | '}
              </>
            )}
            <button type="button" className="fl-link" onClick={toggleLanguage} aria-label={language === 'es' ? 'Switch to English' : 'Cambiar a español'}>{t.switchLanguage}</button>
          </div>
          <nav>
            <Link to={actingAccount === 'leni' ? '/fotolog/leni' : '/fotolog'} onClick={() => setView('photo')}>
              {t.myFotolog}
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
                {t.upload}
              </button>
            )}
            <button onClick={() => setView('archive')}>{t.archive}</button>
            <button onClick={() => setView('friends')}>{t.favorites}</button>
            {(mine || canManage) && (
              <button
                onClick={() => {
                  action(async () => {
                    const own = canManage && !mine ? data : (await fotologApi.get(`/fotolog/profiles/${data?.actorId || user?.id}`)).data;
                    setOwnProfile(own.profile);
                    setOwnData(own);
                    setModal('custom');
                  });
                }}
              >
                {canManage && !mine ? t.manage : t.account}
              </button>
            )}
          </nav>
        </header>
        <div className="fl-notice">{t.notice}</div>
        {error && (
          <p className="fl-error" role="alert">
            {error}
          </p>
        )}
        {loading && <p role="status">{t.loading}</p>}
        {profile && (
          <>
            {theme.banner && <img className="fl-banner" src={theme.banner} alt={`Banner de ${profileDisplayName}`} />}
            <div className="fl-profile">
              <h1>{profileDisplayName}</h1>
              <span>{t.about} {profileDisplayName} · </span>
              <button className="fl-link" onClick={() => setView('archive')}>
                {t.myArchive}
              </button>
              <p>{profile.description || t.welcome}</p>
              {user && !mine && (
                <button
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await fotologApi.put(`/fotolog/favorites/${profile.user_id}`);
                      setError(t.addSuccess);
                    })
                  }
                >
                  {t.addFavorite}
                </button>
              )}
            </div>
            <div className="fl-columns">
              <aside>
                <h3>{t.recent}</h3>
                <p>{t.of} {profileDisplayName}</p>
                {displayData.posts.slice(0, 6).map((p) => (
                  <figure key={p.id}>
                    <button className="fl-thumbnail" onClick={() => select(p)}>
                      <img src={p.image} alt={p.title} />
                    </button>
                    <figcaption>
                      <button className="fl-link" onClick={() => select(p)}>
                        {date(p.day, locale)} »
                      </button>
                    </figcaption>
                  </figure>
                ))}
                {!displayData.posts.length && <p>{t.noPhotos}</p>}
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
                          {t.previous}
                        </button>
                        <button disabled={index === 0} onClick={() => select(displayData.posts[index - 1])}>
                          {t.next}
                        </button>
                      </div>
                      <img className="fl-photo" src={selected.image} alt={selected.title} />
                      <div className="fl-meta">
                        {new Date(`${selected.day}T12:00:00`).toLocaleDateString(locale)} · {t.camera}
                        <br />
                        <Link to={`/fotolog/${profile.slug}?photo=${selected.id}`}>{t.permalink}</Link> ·{' '}
                        <button className="fl-link" onClick={() => setView('archive')}>
                          {t.allPhotos}
                        </button>
                      </div>
                      <article className="fl-caption">
                        <h2>{selected.title}</h2>
                        <p>{selected.body}</p>
                      </article>
                      <section className="fl-guestbook">
                        <h3>{t.guestbook}</h3>
                        {comments.map((c) => (
                          <div className="fl-comment" key={c.id}>
                            <Link to={`/fotolog/${c.slug}`}>{stripHtml(c.name)}</Link>
                            <time>{new Date(c.created_at).toLocaleString(locale)}</time>
                            <p>{c.body}</p>
                          </div>
                        ))}
                        {!comments.length && <p>{t.firstSign}</p>}
                        {user ? <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const body = new FormData(form).get('body');
                            action(async () => {
                              await fotologApi.post(`/fotolog/posts/${selected.id}/comments`, { body });
                              setComments((await fotologApi.get(`/fotolog/posts/${selected.id}/comments`)).data);
                              form.reset();
                            });
                          }}
                        >
                          <label>
                            {t.leaveSignature}
                            <textarea name="body" required maxLength={2000} rows={3} placeholder={t.signaturePlaceholder} />
                          </label>
                          <button disabled={busy}>{t.sign}</button>
                        </form> : <p><Link to="/login">{t.loginToSign}</Link></p>}
                      </section>
                    </>
                  ) : (
                    <div className="fl-empty">
                      <h2>{t.storyStarts}</h2>
                      <p>{t.storySub}</p>
                      {(mine || canManage) && <button onClick={() => { setOwnProfile(data.profile); setOwnData(data); setModal('upload'); }}>{t.firstPhoto}</button>}
                    </div>
                  ))}
                {view === 'archive' && (
                  <>
                    <h2>{t.photoArchive}</h2>
                    <p>{displayData.posts.length} {t.memories}</p>
                    <div className="fl-grid">
                      {displayData.posts.map((p) => (
                        <button key={p.id} onClick={() => select(p)}>
                          <img src={p.image} alt={p.title} />
                          <span>
                            {date(p.day, locale)}
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
                    <h2>{t.searchFotologs}</h2>
                    <p>{results.length ? `${results.length} ${t.results}` : t.noResults}</p>
                    {results.map((r) => (
                      <p key={r.id}>
                        <Link to={`/fotolog/${r.slug}`}>{stripHtml(r.name)}</Link>
                      </p>
                    ))}
                  </>
                )}
                {view === 'friends' && (
                  <>
                    <h2>{t.favorites}</h2>
                    {!displayData.favorites.length && <p>{t.findFavorite}</p>}
                    {displayData.favorites.map((f) => (
                      <p key={f.id}>
                        <Link to={`/fotolog/${f.slug}`}>{stripHtml(f.name)}</Link>{' '}
                        {mine && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await fotologApi.delete(`/fotolog/favorites/${f.id}`);
                                await load();
                              })
                            }
                          >
                            {t.remove}
                          </button>
                        )}
                      </p>
                    ))}
                  </>
                )}
              </main>
              <aside className="fl-friends">
                <h3>{t.favorites}</h3>
                <p>{t.of} {profileDisplayName}</p>
                {displayData.favorites.map((f) => (
                  <figure key={f.id}>
                    <Link to={`/fotolog/${f.slug}`}>
                      {f.image ? <img src={f.image} alt={stripHtml(f.name)} /> : <div className="fl-no-photo">{t.noPhoto}</div>}
                      <figcaption>{stripHtml(f.name)}</figcaption>
                    </Link>
                  </figure>
                ))}
                {!displayData.favorites.length && <p>{t.friendsStory}</p>}
              </aside>
            </div>
          </>
        )}
        <footer>
          FOTOLOG · <Link to="/">Throwback in time</Link>
          <br />
          {t.footer}
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
            <h2 id="fl-dialog-title">{modal === 'upload' ? t.todayPhoto : t.customize}</h2>
            <form
              ref={customizationForm}
              onChange={() => setPreview(null)}
              onSubmit={(e) => {
                e.preventDefault();
                const values = new FormData(e.currentTarget);
                action(async () => {
                  if (modal === 'upload') {
                    await fotologApi.post('/fotolog/posts', {
                      userId: ownProfile?.user_id,
                      image: await readImage(values.get('image')),
                      title: values.get('title'),
                      body: values.get('body'),
                    });
                  } else {
                    const targetId = ownProfile?.user_id || user?.id;
                    const current = ownProfile || (await fotologApi.get(`/fotolog/profiles/${targetId}`)).data.profile;
                    await fotologApi.put('/fotolog/profile', { ...(await customization(values, current)), userId: targetId });
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
                    {t.photo}
                    <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required autoFocus />
                  </label>
                  <small>{t.uploadHint}</small>
                  <label>
                    {t.title}
                    <input name="title" required maxLength={160} />
                  </label>
                  <label>
                    {t.text}
                    <textarea name="body" rows={4} maxLength={10000} />
                  </label>
                  <p>{t.dailyLimit}</p>
                </>
              ) : (
                <>
                  <label>
                    {t.name}
                    <input
                      name="name"
                      defaultValue={stripHtml(ownProfile?.name || user?.accountName || 'Mi Fotolog')}
                      required
                      maxLength={80}
                      autoFocus
                    />
                  </label>
                  <label>
                    {t.description}
                    <textarea name="description" defaultValue={ownProfile?.description || ''} maxLength={1000} />
                  </label>
                  {[
                    ['backgroundColor', t.background, '#ffffff'],
                    ['textColor', 'Texto', '#000000'],
                    ['linkColor', t.links, '#000000'],
                  ].map(([key, label, fallback]) => (
                    <label key={key}>
                      {label}
                      <input type="color" name={key} defaultValue={ownProfile?.theme?.[key] || fallback} />
                    </label>
                  ))}
                  {[
                    ['banner', t.banner],
                    ['background', t.backgroundImage],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input type="file" name={key} accept="image/jpeg,image/png,image/webp,image/gif" />
                      <span>
                        <input type="checkbox" name={`remove-${key}`} /> {t.removeCurrent}
                      </span>
                    </label>
                  ))}
                  <small>{t.imageHint}</small>
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
                    {t.preview}
                  </button>
                )}
                <button disabled={busy}>{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : modal === 'upload' ? t.publish : t.save}</button>
                <button type="button" disabled={busy} onClick={() => setModal(null)}>
                  {t.cancel}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
