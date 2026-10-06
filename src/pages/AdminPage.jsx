/* eslint-disable react/prop-types */
import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { addAdmin, api, getAdminMetrics, getAdmins, getMusicTracks, removeAdmin, removeMusicTrack } from '../data/api';
import { winks_icons } from '../imports/winks';

const numberFormat = new Intl.NumberFormat('es-AR');
const formatNumber = (value) => numberFormat.format(value ?? 0);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const prettyWink = (name) => String(name || '').replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
const serverErrors = {
  'A valid email is required': 'Ingresá un email válido.',
  'Email domain is not allowed': 'El dominio de ese email no está permitido.',
  'This person is already an administrator': 'Esa persona ya es administradora.',
  'The original administrators cannot be removed': 'Los administradores fundadores no se pueden quitar.',
  'You cannot remove yourself': 'No podés quitarte a vos mismo.',
  'Administrator not found': 'Esa persona ya no es administradora.',
  'Track not found': 'Esa canción ya no está en la playlist.',
  'Folder not found': 'Esa carpeta ya no existe.',
};
const errorMessage = (error, fallback) => serverErrors[error.response?.data?.error] || fallback;

const icons = {
  users: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9c0-3.3 3.6-5 8-5s8 1.7 8 5v1H4v-1Z',
  music: 'M9 17V5l11-2v12M9 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  nudge: 'M4 8l2-2m14 2-2-2M3 12h3m12 0h3M8 20l4-4 4 4M9 9h6v5H9z',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  friends: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z',
  trash: 'M5 7h14M10 7V4h4v3m-7 0 1 13h8l1-13M10 11v6m4-6v6',
  plus: 'M12 5v14M5 12h14',
};

const Icon = ({ name, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={icons[name]} />
  </svg>
);

const Card = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-[20px] border border-[#dbe6ee] bg-white/95 p-6 shadow-[0_10px_30px_rgba(28,70,100,0.07)] ${className}`}>
    {(title || action) && (
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-[#17344d]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] leading-5 text-[#6d8394]">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

const Skeleton = ({ className }) => <span className={`inline-block animate-pulse rounded-md bg-[#e4edf3] ${className}`} />;

const StatCard = ({ icon, label, value, tint, loading }) => (
  <div className="rounded-2xl border border-[#e2ebf1] bg-white p-5 shadow-[0_6px_18px_rgba(28,70,100,0.05)]">
    <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: tint, backgroundColor: `${tint}1a` }}><Icon name={icon} /></span>
    <p className="mt-4 text-[30px] font-semibold leading-none tracking-tight text-[#17344d]">{loading ? <Skeleton className="h-8 w-16" /> : formatNumber(value)}</p>
    <p className="mt-2 text-[13px] text-[#6d8394]">{label}</p>
  </div>
);

const OnlineChart = ({ days }) => {
  const peak = Math.max(1, ...days.map(({ count }) => count));
  const empty = days.every(({ count }) => count === 0);
  return (
    <div>
      <div className="relative flex h-48 items-end gap-1.5 sm:gap-2.5" role="img" aria-label="Usuarios distintos conectados por día durante los últimos 14 días">
        {days.map(({ date, count }, index) => {
          const isToday = index === days.length - 1;
          const day = new Date(`${date}T12:00:00`);
          return (
            <div key={date} className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className={`mb-1 text-[11px] font-semibold ${count ? 'text-[#4a6a82]' : 'text-transparent'}`}>{formatNumber(count)}</span>
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  title={`${day.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${formatNumber(count)}`}
                  className={`w-full max-w-[34px] rounded-t-lg transition-all ${isToday ? 'bg-gradient-to-t from-[#1769aa] to-[#4aa3df]' : 'bg-gradient-to-t from-[#9cc6e4] to-[#c7e0f1]'}`}
                  style={{ height: `${count ? Math.max(6, (count / peak) * 100) : 2}%` }}
                />
              </div>
              <span className={`mt-2 text-[11px] leading-4 ${isToday ? 'font-semibold text-[#1769aa]' : 'text-[#8296a5]'}`}>{day.getDate()}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[#8296a5]">{empty ? 'Todavía no hay datos: el registro diario empieza desde que se activó este panel.' : 'El número del día es la cantidad de usuarios distintos que se conectaron.'}</p>
    </div>
  );
};

const ConfirmButton = ({ label, confirmLabel = 'Confirmar', busy, onConfirm, disabled }) => {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <button type="button" disabled={busy} onClick={() => { setAsking(false); onConfirm(); }} className="rounded-lg bg-[#c9382f] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#a92d26]">{confirmLabel}</button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#5d768a] transition hover:bg-[#eef3f7]">Cancelar</button>
      </span>
    );
  }
  return (
    <button type="button" disabled={disabled || busy} onClick={() => setAsking(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#8a4a45] transition hover:bg-[#fdeeed] disabled:opacity-40 disabled:hover:bg-transparent">
      <Icon name="trash" className="h-4 w-4" />{label}
    </button>
  );
};

const AdminPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [admins, setAdmins] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [folders, setFolders] = useState(null);
  const [foldersError, setFoldersError] = useState('');
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const myEmail = String(user?.email || '').toLowerCase();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [metricsResult, adminsResult, tracksResult, foldersResult] = await Promise.allSettled([getAdminMetrics(), getAdmins(), getMusicTracks(), api.get('/admin/music/folders')]);
    if ([metricsResult, adminsResult].some((result) => result.status === 'rejected' && result.reason?.response?.status === 403)) setDenied(true);
    else {
      setDenied(false);
      if (metricsResult.status === 'fulfilled' && metricsResult.value.data?.users) setMetrics(metricsResult.value.data);
      else setLoadError('No se pudieron cargar las métricas. Si acabás de actualizar, volvé a desplegar el servidor y recargá la página.');
      if (adminsResult.status === 'fulfilled') setAdmins(adminsResult.value.data.admins);
      if (tracksResult.status === 'fulfilled') setTracks(tracksResult.value.data.tracks);
      if (foldersResult.status === 'fulfilled') {
        setFolders((foldersResult.value.data.folders || []).filter((folder) => folder.isPersonal === false));
        setFoldersError('');
      } else setFoldersError('No se pudieron cargar las carpetas compartidas. Intentá de nuevo.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const run = async (action, success) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      setNotice({ type: 'ok', text: success });
    } catch (error) {
      setNotice({ type: 'error', text: errorMessage(error, 'No se pudo completar la acción. Intentá de nuevo.') });
    } finally {
      setBusy(false);
    }
  };

  const submitAdmin = (event) => {
    event.preventDefault();
    const email = newAdminEmail.trim();
    if (!email) return;
    run(async () => { const { data } = await addAdmin(email); setAdmins(data.admins); setNewAdminEmail(''); }, `${email.toLowerCase()} ahora es administrador.`);
  };
  const dropAdmin = (email) => run(async () => { const { data } = await removeAdmin(email); setAdmins(data.admins); }, `${email} ya no es administrador.`);
  const dropTrack = (track) => run(async () => { await removeMusicTrack(track.id); setTracks((current) => current.filter((item) => item.id !== track.id)); }, `"${track.title}" se quitó de la playlist.`);
  const dropFolder = (folder) => run(async () => { await api.delete(`/admin/music/folders/${encodeURIComponent(folder.id)}`); setFolders((current) => current.filter((item) => item.id !== folder.id)); setTracks((current) => current?.filter((track) => track.folderId !== folder.id)); }, `"${folder.name}" se eliminó para todos.`);
  const retryFolders = async () => {
    setFoldersError('');
    try {
      const { data } = await api.get('/admin/music/folders');
      setFolders((data.folders || []).filter((folder) => folder.isPersonal === false));
    } catch {
      setFoldersError('No se pudieron cargar las carpetas compartidas. Intentá de nuevo.');
    }
  };

  const signOut = () => { logout(); navigate('/login'); };
  const fun = metrics?.fun;
  const days = metrics?.onlineByDay || [];
  const today = days[days.length - 1]?.count ?? 0;
  const topWink = fun?.topWinks?.[0];

  return (
    <main className="msn-font h-screen overflow-y-auto bg-[#eaf1f7] text-[#203447]">
      <div className="min-h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(139,200,240,0.35),_transparent_45%),radial-gradient(ellipse_at_bottom_right,_rgba(190,220,240,0.4),_transparent_50%)] px-4 pb-10 pt-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#2a8fd8] to-[#1458a0] text-[13px] font-bold tracking-wide text-white shadow-lg shadow-blue-900/20">MSN</span>
              <div>
                <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-[#17344d]">Panel de administración</h1>
                <p className="text-[13px] text-[#6d8394]">{metrics?.generatedAt ? `Actualizado ${new Date(metrics.generatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : 'Cargando datos…'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadAll} disabled={loading} className="rounded-xl bg-[#1769aa] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#12588f]">{loading ? 'Actualizando…' : 'Actualizar'}</button>
              <Link to="/" className="rounded-xl border border-[#c9d9e5] bg-white px-4 py-2 text-[13px] font-semibold text-[#31536b] shadow-sm transition hover:bg-[#f6fafd]">Volver al Messenger</Link>
              <button type="button" onClick={signOut} className="rounded-xl px-3 py-2 text-[13px] font-medium text-[#5a7181] transition hover:bg-white">Salir</button>
            </div>
          </header>

          {denied && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#efc8c8] bg-[#fff6f5] px-5 py-4 text-[14px] text-[#8c3434]">
              <span>Esta cuenta no tiene permisos de administración. Iniciá sesión con una cuenta Microsoft autorizada.</span>
              <button type="button" onClick={signOut} className="font-semibold underline underline-offset-2">Cambiar de cuenta</button>
            </div>
          )}
          {!denied && loadError && <div role="alert" className="mb-6 rounded-2xl border border-[#efc8c8] bg-[#fff6f5] px-5 py-4 text-[14px] text-[#8c3434]">{loadError}</div>}
          <div aria-live="polite" className="empty:hidden">
            {notice && (
              <div className={`mb-6 flex items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-[14px] ${notice.type === 'ok' ? 'border-[#bfe0cd] bg-[#f1faf5] text-[#21694a]' : 'border-[#efc8c8] bg-[#fff6f5] text-[#8c3434]'}`}>
                <span>{notice.text}</span>
                <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="text-[18px] leading-none opacity-60 hover:opacity-100">×</button>
              </div>
            )}
          </div>

          {!denied && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Card className="flex flex-col justify-between bg-gradient-to-br from-[#1b73b8] to-[#0f4c85] !border-transparent text-white">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#cfe6f8]"><Icon name="users" className="h-5 w-5" />Usuarios</div>
                  <div className="my-8">
                    <p className="text-[64px] font-semibold leading-none tracking-tight">{loading && !metrics ? <Skeleton className="h-14 w-28 !bg-white/25" /> : formatNumber(metrics?.users.total)}</p>
                    <p className="mt-3 text-[14px] text-[#cfe6f8]">personas con cuenta</p>
                  </div>
                  <p className="border-t border-white/20 pt-4 text-[12px] leading-5 text-[#b6d6ee]">Sin contar {formatNumber(metrics?.users.testersExcluded)} cuentas de prueba (emails que incluyen “test”).</p>
                </Card>
                <Card
                  title="Usuarios online por día"
                  subtitle="Personas distintas que se conectaron, últimos 14 días"
                  action={<div className="rounded-xl bg-[#edf6fc] px-3.5 py-2 text-right"><p className="text-[11px] font-medium uppercase tracking-wider text-[#5b86a5]">Hoy</p><p className="text-[22px] font-semibold leading-tight text-[#1769aa]">{formatNumber(today)}</p></div>}
                >
                  {metrics ? <OnlineChart days={days} /> : <Skeleton className="h-48 w-full" />}
                </Card>
              </div>

              <div>
                <h2 className="mb-3 px-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#5f7d93]">Estadísticas curiosas</h2>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <StatCard icon="music" label="Canciones agregadas" value={fun?.songsAdded} tint="#7653b5" loading={!fun} />
                  <StatCard icon="nudge" label="Nudges enviados" value={fun?.nudges} tint="#d9731a" loading={!fun} />
                  <StatCard icon="chat" label="Mensajes enviados" value={fun?.messages} tint="#1769aa" loading={!fun} />
                  <StatCard icon="friends" label="Amistades creadas" value={fun?.friendsAdded} tint="#c2415f" loading={!fun} />
                  <div className="col-span-2 rounded-2xl border border-[#e2ebf1] bg-white p-5 shadow-[0_6px_18px_rgba(28,70,100,0.05)] lg:col-span-1">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff4d6] text-[#b98507]"><Icon name="star" /></span>
                    {!fun ? <Skeleton className="mt-4 h-8 w-24" /> : topWink ? (
                      <div className="mt-4 flex items-center gap-2.5">
                        {winks_icons[`${topWink.name}_icon`] && <img src={winks_icons[`${topWink.name}_icon`]} alt="" className="h-9 w-9 rounded-md object-contain" />}
                        <div className="min-w-0">
                          <p className="truncate text-[18px] font-semibold leading-tight text-[#17344d]">{prettyWink(topWink.name)}</p>
                          <p className="text-[12px] text-[#6d8394]">{formatNumber(topWink.count)} {topWink.count === 1 ? 'vez' : 'veces'}</p>
                        </div>
                      </div>
                    ) : <p className="mt-4 text-[18px] font-semibold text-[#9ab0be]">Sin winks aún</p>}
                    <p className="mt-2 text-[13px] text-[#6d8394]">Wink más usado</p>
                  </div>
                </div>
              </div>

              <Card title="Carpetas de música compartidas" subtitle={folders ? `${formatNumber(folders.length)} ${folders.length === 1 ? 'carpeta activa' : 'carpetas activas'}. Eliminarlas las quita para todos.` : 'Carpetas compartidas de la música'}>
                {foldersError ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efc8c8] bg-[#fff6f5] px-4 py-3 text-[13px] text-[#8c3434]">
                    <span>{foldersError}</span>
                    <button type="button" onClick={retryFolders} className="font-semibold underline underline-offset-2">Reintentar</button>
                  </div>
                ) : !folders ? <Skeleton className="h-24 w-full" /> : folders.length === 0 ? (
                  <p className="rounded-xl bg-[#f4f8fb] px-4 py-8 text-center text-[14px] text-[#7b91a0]">No hay carpetas compartidas.</p>
                ) : (
                  <ul className="divide-y divide-[#edf2f6]">
                    {folders.map((folder) => (
                      <li key={folder.id} className="flex items-center gap-3 py-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf6fc] text-[#1769aa]"><Icon name="music" className="h-5 w-5" /></span>
                        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[#1d3a52]">{folder.name}</p>
                        <ConfirmButton label="Eliminar" confirmLabel="Sí, eliminar" busy={busy} onConfirm={() => dropFolder(folder)} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Card title="Playlist compartida" subtitle={tracks ? `${formatNumber(tracks.length)} ${tracks.length === 1 ? 'canción activa' : 'canciones activas'}. Quitarla la elimina para todos.` : 'Cargando canciones…'}>
                  {!tracks ? <Skeleton className="h-32 w-full" /> : tracks.length === 0 ? (
                    <p className="rounded-xl bg-[#f4f8fb] px-4 py-8 text-center text-[14px] text-[#7b91a0]">La playlist está vacía.</p>
                  ) : (
                    <ul className="max-h-[420px] divide-y divide-[#edf2f6] overflow-y-auto pr-1">
                      {tracks.map((track) => (
                        <li key={track.id} className="flex items-center gap-3 py-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f1ecfa] text-[#7653b5]"><Icon name="music" className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-[#1d3a52]">{track.title}</p>
                            <p className="truncate text-[12px] text-[#7b91a0]">{[track.artist, `agregada por ${track.contributor?.username || 'alguien'}`, formatDate(track.createdAt)].filter(Boolean).join(' · ')}</p>
                          </div>
                          <ConfirmButton label="Quitar" confirmLabel="Sí, quitar" busy={busy} onConfirm={() => dropTrack(track)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Administradores" subtitle="Pueden ver este panel, gestionar la playlist y sumar o quitar admins.">
                  {!admins ? <Skeleton className="h-32 w-full" /> : (
                    <ul className="divide-y divide-[#edf2f6]">
                      {admins.map((admin) => {
                        const isMe = admin.email === myEmail;
                        return (
                          <li key={admin.email} className="flex items-center gap-3 py-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e3effa] text-[14px] font-semibold uppercase text-[#1769aa]">{(admin.username || admin.email)[0]}</span>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-2 truncate text-[14px] font-semibold text-[#1d3a52]">
                                <span className="truncate">{admin.username || admin.email}</span>
                                {isMe && <span className="shrink-0 rounded-full bg-[#e3f4ea] px-2 py-0.5 text-[10px] font-semibold text-[#21694a]">Vos</span>}
                                {admin.isOwner && <span className="shrink-0 rounded-full bg-[#fff1cf] px-2 py-0.5 text-[10px] font-semibold text-[#8c6508]">Fundador</span>}
                              </p>
                              {admin.username && <p className="truncate text-[12px] text-[#7b91a0]">{admin.email}</p>}
                            </div>
                            {!admin.isOwner && !isMe && <ConfirmButton label="Quitar" confirmLabel="Sí, quitar" busy={busy} onConfirm={() => dropAdmin(admin.email)} />}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <form onSubmit={submitAdmin} className="mt-5 border-t border-[#edf2f6] pt-5">
                    <label htmlFor="new-admin-email" className="mb-2 block text-[13px] font-semibold text-[#31536b]">Sumar administrador</label>
                    <div className="flex gap-2">
                      <input id="new-admin-email" type="email" value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} placeholder="nombre.apellido@improving.com" autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-[#c9d9e5] bg-white px-3.5 py-2.5 text-[14px] outline-none transition placeholder:text-[#a3b5c2] focus:border-[#1769aa] focus:ring-2 focus:ring-[#1769aa]/20" />
                      <button type="submit" disabled={busy || !newAdminEmail.trim()} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1769aa] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#12588f] disabled:opacity-50"><Icon name="plus" className="h-4 w-4" />Agregar</button>
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-[#8296a5]">Tiene que entrar con esa cuenta de Microsoft para acceder.</p>
                  </form>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AdminPage;
