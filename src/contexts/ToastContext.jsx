import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import sounds from '../imports/sounds';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    // Browsers block audio until a user gesture; after a Microsoft redirect login the page has none, so unlock on first interaction.
    const unlock = () => { const a = new Audio(sounds.newmessage); a.muted = true; a.play().then(() => a.pause()).catch(() => {}); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);
  const playSound = useCallback((sound = sounds.newmessage) => {
    const audio = new Audio(sound);
    audio.play().catch(() => {});
  }, []);
  const showNotification = useCallback((notification, { sound = true } = {}) => {
    setToast(notification);
    if (sound) playSound();
  }, [playSound]);
  const closeNotification = useCallback(() => setToast(null), []);
  return <ToastContext.Provider value={{ showNotification, closeNotification, playSound }}>{children}{toast && <RetroNotification {...toast} onClose={closeNotification} />}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
function RetroNotification({ title, text, avatar, onOpen, onClose }) {
  useEffect(() => { const timer = setTimeout(onClose, 6000); return () => clearTimeout(timer); }, [onClose]);
  const image = avatar && avatar !== 'default' ? avatar : '/assets/usertiles/default.png';
  return <div className="retro-notification" role="status" onClick={() => { onOpen?.(); onClose(); }}>
    <button className="retro-notification-close" aria-label="Close notification" onClick={(event) => { event.stopPropagation(); onClose(); }}>×</button>
    <div className="retro-notification-header"><img src="/assets/general/wlm-icon.png" alt="" /> Windows Live Messenger</div>
    <div className="retro-notification-body"><div className="retro-notification-avatar"><img src={image} alt="" /></div><div><strong>{title}</strong><p>{text}</p></div></div>
    <button className="retro-notification-action" onClick={(event) => { event.stopPropagation(); onOpen?.(); onClose(); }}>Open chat</button>
  </div>;
}
