function createPresenceGrace({ delay = 10000, schedule = setTimeout, cancel = clearTimeout } = {}) {
  const pending = new Map();
  return {
    reconnect(id) {
      if (!pending.has(id)) return false;
      cancel(pending.get(id));
      pending.delete(id);
      return true;
    },
    disconnect(id, onOffline) {
      if (pending.has(id)) cancel(pending.get(id));
      const timer = schedule(() => {
        pending.delete(id);
        onOffline();
      }, delay);
      timer?.unref?.();
      pending.set(id, timer);
    },
  };
}

module.exports = { createPresenceGrace };
