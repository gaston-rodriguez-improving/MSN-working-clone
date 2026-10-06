import { createContext, useCallback, useEffect, useState } from 'react';
import { checkToken, signIn, signInWithMicrosoft, signUp, updateUsername as updateUsernameRequest } from '../data/api';

export const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('messenger_user') || 'null');
  } catch {
    localStorage.removeItem('messenger_user');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => localStorage.getItem('messenger_token') ? getStoredUser() : null);
  const [loading, setLoading] = useState(true);
  const logout = useCallback(() => { localStorage.removeItem('messenger_token'); localStorage.removeItem('messenger_user'); setUser(null); }, []);
  useEffect(() => {
    const token = localStorage.getItem('messenger_token');
    if (!token) { setLoading(false); return undefined; }
    let cancelled = false;
    checkToken().then(({ data }) => {
      if (cancelled || localStorage.getItem('messenger_token') !== token) return;
      setUser(data.user);
      localStorage.setItem('messenger_user', JSON.stringify(data.user));
    }).catch(() => {
      if (!cancelled && localStorage.getItem('messenger_token') === token) logout();
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [logout]);
  useEffect(() => {
    const syncAuth = (event) => {
      if (event.key !== null && event.key !== 'messenger_token' && event.key !== 'messenger_user') return;
      if (!localStorage.getItem('messenger_token')) { setUser(null); return; }
      setUser(getStoredUser());
    };
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);
  async function login(credentials) { const { data } = await signIn(credentials); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  async function loginWithMicrosoft(idToken) { const { data } = await signInWithMicrosoft(idToken); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  async function updateUsername(username) { const { data } = await updateUsernameRequest(username); const updatedUser = { ...user, ...data }; localStorage.setItem('messenger_user', JSON.stringify(updatedUser)); localStorage.setItem('name', data.username); setUser(updatedUser); return updatedUser; }
  async function register(credentials) { const { data } = await signUp(credentials); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  return <AuthContext.Provider value={{ user, loading, login, loginWithMicrosoft, register, updateUsername, logout }}>{children}</AuthContext.Provider>;
}
