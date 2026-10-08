import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import PrivateRoute from './components/PrivateRoute';
import { EmoticonProvider } from './contexts/EmoticonContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { DiscordAuthHandler } from './utils/discordAuth';
import UpdateBanner from './components/UpdateBanner';
import { winampEnabled } from './features/musicConfig';

const FotologPage = lazy(() => import('./pages/FotologPage'));
const WinampPage = lazy(() => import('./pages/WinampPage'));

const Main = () => {
  return (
    <React.StrictMode>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <EmoticonProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={<PrivateRoute element={HomePage} />} />
                  <Route path="/chat/:id" element={<PrivateRoute element={ChatPage} />} />
                  <Route path="/admin" element={<PrivateRoute element={AdminPage} />} />
                  {winampEnabled && <Route path="/winamp" element={<Suspense fallback={<p role="status">Loading Winamp…</p>}><PrivateRoute element={WinampPage} /></Suspense>} />}
                  <Route path="/fotolog/:userId?" element={<Suspense fallback={<p role="status">Cargando Fotolog…</p>}><PrivateRoute element={FotologPage} /></Suspense>} />
                  <Route path="/discordAuth" element={<DiscordAuthHandler />} />
                </Routes>
              </Router>
              <UpdateBanner />
            </EmoticonProvider>
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Main />);
