import { Link, useLocation } from 'react-router-dom';
import { winampEnabled } from '../features/musicConfig';
import './AppShortcuts.css';

const apps = [
  { id: 'msn', name: 'MSN', to: '/', icon: '/assets/favicon.png' },
  { id: 'fotolog', name: 'Fotolog', to: '/fotolog', icon: '/assets/fotolog/favicon.svg' },
  { id: 'winamp', name: 'Winamp', to: '/winamp', icon: '/assets/winamp/favicon.svg' },
];

export default function AppShortcuts() {
  const { pathname } = useLocation();
  const current = pathname === '/winamp' ? 'winamp'
    : /^\/fotolog(?:\/|$)/.test(pathname) ? 'fotolog'
      : pathname === '/' || pathname.startsWith('/chat/') ? 'msn' : null;

  if (!current) return null;

  return (
    <nav className="app-shortcuts" aria-label="Accesos a otras apps">
      {apps.filter((app) => app.id !== current && (app.id !== 'winamp' || winampEnabled)).map((app) => (
        <Link key={app.id} className="app-shortcuts__link" to={app.to} aria-label={`Abrir ${app.name}`}>
          <img src={app.icon} width="24" height="24" alt="" />
          <span className="app-shortcuts__tooltip" aria-hidden="true">{app.name}</span>
        </Link>
      ))}
    </nav>
  );
}
