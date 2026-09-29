import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import sounds from '../imports/sounds';

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const showNotification = useCallback((notification) => { setToast(notification); const audio = new Audio(sounds.newmessage); audio.play().catch(() => {}); }, []);
  const closeNotification = useCallback(() => setToast(null), []);
  return <ToastContext.Provider value={{ showNotification, closeNotification }}>{children}{toast && <RetroNotification {...toast} onClose={closeNotification} />}</ToastContext.Provider>;
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
