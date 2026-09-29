import React, { createContext, useEffect, useState } from 'react';
import { checkToken, signIn, signInWithMicrosoft, signUp } from '../data/api';

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
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!localStorage.getItem('messenger_token')) return setLoading(false); checkToken().then(({ data }) => { setUser(data.user); localStorage.setItem('messenger_user', JSON.stringify(data.user)); }).catch(logout).finally(() => setLoading(false)); }, []);
  async function login(credentials) { const { data } = await signIn(credentials); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  async function loginWithMicrosoft(idToken) { const { data } = await signInWithMicrosoft(idToken); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  async function register(credentials) { const { data } = await signUp(credentials); localStorage.setItem('messenger_token', data.access_token); localStorage.setItem('messenger_user', JSON.stringify(data.user)); setUser(data.user); return data.user; }
  function logout() { localStorage.removeItem('messenger_token'); localStorage.removeItem('messenger_user'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, loginWithMicrosoft, register, logout }}>{children}</AuthContext.Provider>;
}
