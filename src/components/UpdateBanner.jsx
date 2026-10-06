/* global __APP_VERSION__ */
import React from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const currentVersion = typeof __APP_VERSION__ === 'undefined' ? null : __APP_VERSION__;

const UpdateBanner = () => {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    if (!currentVersion || import.meta.env.DEV) return undefined;
    const check = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok || !(response.headers.get('content-type') || '').includes('json')) return;
        const { version } = await response.json();
        if (version && version !== currentVersion) setUpdateAvailable(true);
      } catch {
        // offline or transient failure; try again later
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!updateAvailable) return null;
  return (
    <div role="status" className="fixed bottom-3 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded border border-[#8ea8b9] bg-white px-3 py-2 text-[12px] text-[#17364a] shadow-lg">
      <span>A new version is available.</span>
      <button type="button" className="msn-glossy-button rounded px-2 py-0.5" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );
};

export default UpdateBanner;
