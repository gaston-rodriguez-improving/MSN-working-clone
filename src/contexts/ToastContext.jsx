import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import sounds from '../imports/sounds';

const ToastContext = createContext(null);
const NUDGE_NOTIFICATION_COOLDOWN = 60 * 60 * 1000;
const LAST_NUDGE_NOTIFICATION_KEY = 'messenger_last_desktop_nudge_at';
let lastNudgeNotificationAt = 0;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    // Browsers block audio until a user gesture; after a Microsoft redirect login the page has none, so unlock on first interaction.
    const unlock = () => { const a = new Audio(sounds.newmessage); a.muted = true; a.play().then(() => a.pause()).catch(() => {}); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);
  const showNotification = useCallback((notification) => {
    setToast(notification);
    const audio = new Audio(sounds.newmessage);
    audio.play().catch(() => {});

    if (notification.kind !== 'nudge' || document.visibilityState !== 'hidden') return;
    const now = Date.now();
    let lastNotification = lastNudgeNotificationAt;
    try {
      lastNotification = Math.max(lastNotification, Number(localStorage.getItem(LAST_NUDGE_NOTIFICATION_KEY) || 0));
    } catch {
      lastNotification = lastNudgeNotificationAt;
    }
    if (now - lastNotification < NUDGE_NOTIFICATION_COOLDOWN) return;

    lastNudgeNotificationAt = now;
    try {
      localStorage.setItem(LAST_NUDGE_NOTIFICATION_KEY, String(now));
    } catch {
      lastNudgeNotificationAt = now;
    }
    window.focus();
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.text,
        icon: '/assets/general/wlm-icon.png',
        tag: 'messenger-nudge',
        renotify: false,
      });
      desktopNotification.onclick = () => {
        window.focus();
        notification.onOpen?.();
        desktopNotification.close();
      };
    } catch {
      return;
    }
  }, []);
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
