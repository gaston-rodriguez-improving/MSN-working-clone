/** Shared port between Webamp's IMedia adapter and the official YT iframe. */
export function createYouTubeBridge() {
  const subscribers = new Set();
  let player = null;
  let pending = null;
  let active = true;
  let ready = false;
  let pendingPlay = false;
  let loadingVideoId = null;
  let loadedVideoId = null;
  const bridge = {
    pendingVideoId: null,
    currentVideoId: null,
    attach(nextPlayer) {
      player = nextPlayer;
      ready = Boolean(nextPlayer);
      if (player && pending) {
        const { videoId, autoPlay } = pending;
        pending = null;
        bridge.loadTrack(videoId, autoPlay);
      }
    },
    setActive(value) { active = Boolean(value); if (!active) bridge.pause(); },
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    dispatch(event) {
      if (['state', 'loaded', 'time'].includes(event.type) && event.videoId && bridge.currentVideoId && event.videoId !== bridge.currentVideoId) return;
      if (event.type === 'loaded' && event.videoId === bridge.currentVideoId) {
        loadedVideoId = event.videoId;
        loadingVideoId = null;
      }
      if (event.type === 'error') {
        pendingPlay = false;
        loadingVideoId = null;
      }
      if (event.type === 'loaded' || event.type === 'state') {
        if (event.videoId) bridge.currentVideoId = event.videoId;
      }
      subscribers.forEach((listener) => listener(event));
      if (event.type === 'loaded' && pendingPlay && active && ready && event.videoId === bridge.currentVideoId) {
        pendingPlay = false;
        player?.playVideo?.();
      }
    },
    loadTrack(videoId, autoPlay = false) {
      if (!active) return;
      bridge.currentVideoId = videoId;
      bridge.pendingVideoId = videoId;
      loadingVideoId = videoId;
      loadedVideoId = null;
      pendingPlay = pendingPlay || Boolean(autoPlay);
      if (!ready || typeof player?.cueVideoById !== 'function') {
        bridge.dispatch({ type: 'load_requested', videoId });
        pending = { videoId, autoPlay };
        return;
      }
      // Cue first so playback remains directly tied to a user pressing Play.
      player.cueVideoById({ videoId });
    },
    play() {
      if (!active) return;
      if (ready && bridge.currentVideoId && loadedVideoId === bridge.currentVideoId && !loadingVideoId) player?.playVideo?.();
      else pendingPlay = true;
    },
    pause() {
      pendingPlay = false;
      const wasPlaying = player?.getPlayerState?.() === 1;
      player?.pauseVideo?.();
      if (wasPlaying) bridge.dispatch({ type: 'state', state: 'paused', videoId: bridge.currentVideoId });
    },
    stop() {
      pendingPlay = false;
      loadingVideoId = null;
      player?.stopVideo?.();
      bridge.dispatch({ type: 'state', state: 'paused', videoId: bridge.currentVideoId });
    },
    seekTo(seconds) { player?.seekTo?.(seconds, true); },
    setVolume(value) {
      if (!player) return;
      player.unMute?.();
      player.setVolume?.(value);
    },
    setMuted(muted) { muted ? player?.mute?.() : player?.unMute?.(); },
  };
  return bridge;
}
