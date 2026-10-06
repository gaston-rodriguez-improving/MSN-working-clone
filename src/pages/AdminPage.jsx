import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getAdminMetrics } from '../data/api';

const numberFormat = new Intl.NumberFormat('es-AR');

const metricDefinitions = [
  { key: 'total_users', label: 'Usuarios registrados', detail: 'Cuentas en total', color: '#1769aa', mark: 'US' },
  { key: 'online_users', label: 'Conectados ahora', detail: 'Estado online', color: '#16845b', mark: 'ON' },
  { key: 'new_users_7d', label: 'Nuevos usuarios', detail: 'Últimos 7 días', color: '#7653b5', mark: '7D' },
  { key: 'total_conversations', label: 'Conversaciones', detail: 'Creadas en total', color: '#c16a16', mark: 'CH' },
  { key: 'messages_7d', label: 'Mensajes enviados', detail: 'Últimos 7 días', color: '#bd4f67', mark: 'MS' },
  { key: 'accepted_friendships', label: 'Amistades', detail: 'Solicitudes aceptadas', color: '#14818a', mark: 'FR' },
  { key: 'pending_friend_requests', label: 'Invitaciones pendientes', detail: 'Por responder', color: '#a47116', mark: 'PE' },
];

function downloadCsv(metrics) {
  const rows = [
    ['Métrica', 'Cantidad'],
    ...metricDefinitions.map(({ key, label }) => [label, metrics.overview[key]]),
    [],
    ['Fecha', 'Nuevos usuarios'],
    ...metrics.signupsByDay.map(({ date, count }) => [date, count]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'messenger-metricas.csv';
  link.click();
  URL.revokeObjectURL(url);
}

const AdminPage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getAdminMetrics();
      const metricData = data?.metrics && typeof data.metrics === 'object' ? data.metrics : data;
      const overview = data?.overview ?? metricData?.overview ?? metricData;
      if (!overview || typeof overview !== 'object' || !Object.prototype.hasOwnProperty.call(overview, 'total_users')) throw new Error('Invalid admin metrics response');
      setMetrics({ ...data, overview, signupsByDay: data?.signupsByDay ?? data?.signups_by_day ?? metricData?.signupsByDay ?? [] });
    } catch (requestError) {
      setError(requestError.message === 'Invalid admin metrics response'
        ? 'La API devolvió un formato de métricas inesperado. Actualizá el servidor y volvé a intentar.'
        : requestError.response?.status === 403
          ? 'Esta cuenta no tiene permisos de administración. Iniciá sesión con una cuenta Microsoft autorizada.'
          : 'No se pudieron cargar las métricas. Revisá la conexión e intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const chartValues = metrics?.signupsByDay || [];
  const chartMaximum = Math.max(1, ...chartValues.map(({ count }) => count));

  return (
    <main className="admin-dashboard msn-font h-screen overflow-y-auto bg-[#eef3f8] text-[#203447]">
      <div className="min-h-full bg-[radial-gradient(ellipse_at_top_left,_rgba(153,209,244,0.28),_transparent_42%)] px-4 py-6 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1769aa] text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-900/15">MSN</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#648096]">Messenger · Administración</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#17344d] sm:text-3xl">Panel de control</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => metrics && downloadCsv(metrics)} disabled={!metrics} className="rounded-lg border border-[#c7d5df] bg-white px-4 py-2 text-sm font-semibold text-[#31536b] shadow-sm transition hover:bg-[#f7fbfd] disabled:opacity-50">Exportar CSV</button>
              <button type="button" onClick={loadMetrics} disabled={loading} className="rounded-lg bg-[#1769aa] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12588f] disabled:opacity-60">{loading ? 'Actualizando…' : 'Actualizar'}</button>
              <Link to="/" className="rounded-lg border border-[#c7d5df] bg-white px-4 py-2 text-sm font-semibold text-[#31536b] shadow-sm transition hover:bg-[#f7fbfd]">Volver al Messenger</Link>
              <button type="button" onClick={signOut} className="rounded-lg px-3 py-2 text-sm font-medium text-[#5a7181] transition hover:bg-white hover:text-[#17344d]">Salir</button>
            </div>
          </header>

          <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17344d]">Resumen general</h2>
              <p className="mt-1 text-sm text-[#6a8090]">Métricas del espacio de trabajo configurado.</p>
            </div>
            <div className="text-xs text-[#7890a0]">{metrics?.generatedAt ? `Actualizado ${new Date(metrics.generatedAt).toLocaleString('es-AR')}` : ' '}</div>
          </section>

          {error && (
            <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efc8c8] bg-[#fff6f5] px-4 py-3 text-sm text-[#8c3434]">
              <span>{error}</span>
              {error.startsWith('Esta cuenta') && <button type="button" onClick={signOut} className="font-semibold underline underline-offset-2">Cambiar de cuenta</button>}
            </div>
          )}

          <section aria-label="Métricas" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {metricDefinitions.map((metric) => (
              <article key={metric.key} className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_8px_24px_rgba(31,67,91,0.07)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#647c8e]">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1d3a52]">{metrics?.overview?.[metric.key] === undefined ? '—' : numberFormat.format(metrics.overview[metric.key])}</p>
                  </div>
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-bold tracking-wide" style={{ color: metric.color, backgroundColor: `${metric.color}14` }}>{metric.mark}</span>
                </div>
                <p className="mt-4 border-t border-[#edf1f4] pt-3 text-xs text-[#8295a3]">{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <article className="rounded-2xl border border-white/80 bg-white p-5 shadow-[0_8px_24px_rgba(31,67,91,0.07)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#1d3a52]">Altas de usuarios</h2>
                  <p className="mt-1 text-sm text-[#7a8e9c]">Registros por día · últimos 7 días</p>
                </div>
                <span className="rounded-full bg-[#edf6fc] px-3 py-1 text-xs font-semibold text-[#1769aa]">{numberFormat.format(metrics?.overview?.new_users_7d || 0)} nuevos</span>
              </div>
              <div className="mt-7 flex h-44 items-end gap-2 sm:gap-4" role="img" aria-label="Gráfico de altas de usuarios durante los últimos siete días">
                {chartValues.map(({ date, count }) => {
                  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
                  return (
                    <div key={date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-[#617b8f]">{numberFormat.format(count)}</span>
                      <div className="flex h-32 w-full items-end justify-center rounded-t-md bg-[#f2f7fa]">
                        <div title={`${date}: ${count}`} className="w-3/5 min-w-3 rounded-t-md bg-gradient-to-t from-[#1769aa] to-[#58a8dd] transition-all" style={{ height: `${count ? Math.max(8, (count / chartMaximum) * 100) : 2}%` }} />
                      </div>
                      <span className="text-[11px] capitalize text-[#8194a2]">{dayLabel}</span>
                    </div>
                  );
                })}
                {!metrics && !loading && <p className="w-full text-center text-sm text-[#8194a2]">Sin datos disponibles</p>}
              </div>
            </article>

            <article className="flex flex-col justify-between rounded-2xl border border-[#cde1ee] bg-gradient-to-br from-[#eaf6fd] to-[#f8fbfd] p-6 shadow-[0_8px_24px_rgba(31,67,91,0.05)]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e7d9c]">Acciones rápidas</span>
                <h2 className="mt-2 text-xl font-semibold text-[#1d3a52]">Administración</h2>
                <p className="mt-2 text-sm leading-6 text-[#668092]">Actualizá los indicadores o descargá una copia CSV para compartir el resumen.</p>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button type="button" onClick={() => metrics && downloadCsv(metrics)} disabled={!metrics} className="rounded-lg bg-white px-4 py-3 text-left text-sm font-semibold text-[#31536b] shadow-sm ring-1 ring-[#d3e1e9] transition hover:bg-[#f8fcff] disabled:opacity-50">Descargar informe de métricas</button>
                <button type="button" onClick={loadMetrics} disabled={loading} className="rounded-lg bg-[#1769aa] px-4 py-3 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-[#12588f] disabled:opacity-60">{loading ? 'Actualizando métricas…' : 'Actualizar métricas'}</button>
              </div>
            </article>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 py-6 text-xs text-[#8497a4]">
            <span>Acceso restringido a administradores autorizados.</span>
            <span>Sesión: {user?.email || 'Cuenta autenticada'}</span>
          </footer>
        </div>
      </div>
    </main>
  );
};

export default AdminPage;
