/* eslint react/prop-types: off */
import { useEffect, useRef } from 'react';
import Webamp from 'webamp';
import { YouTubeMediaAdapter, videoIdFromUrl } from './YouTubeMediaAdapter';
import { toWebampTrack } from './tracks';
import { planSharedPlaylistSync, selectedSharedTracksForRemoval } from './sharedPlaylistSync';

export default function WebampPlayer({ bridge, tracks, active, onPlaybackState, onTrackSelected, onError, onReady, onCatalogRequest, onNewFolder, onRemoveTrack, onRemoveBlocked, onFocus }) {
  const mountRef = useRef(null);
  const webampRef = useRef(null);
  const stateCallbackRef = useRef(onPlaybackState);
  const trackCallbackRef = useRef(onTrackSelected);
  const errorCallbackRef = useRef(onError);
  const readyCallbackRef = useRef(onReady);
  const catalogCallbackRef = useRef(onCatalogRequest);
  const newFolderCallbackRef = useRef(onNewFolder);
  const removeCallbackRef = useRef(onRemoveTrack);
  const blockedCallbackRef = useRef(onRemoveBlocked);
  const localTracksRef = useRef(new Map());
  const pendingVideoIdsRef = useRef(new Set());

  stateCallbackRef.current = onPlaybackState;
  trackCallbackRef.current = onTrackSelected;
  errorCallbackRef.current = onError;
  readyCallbackRef.current = onReady;
  catalogCallbackRef.current = onCatalogRequest;
  newFolderCallbackRef.current = onNewFolder;
  removeCallbackRef.current = onRemoveTrack;
  blockedCallbackRef.current = onRemoveBlocked;

  useEffect(() => {
    const node = mountRef.current;
    if (!node) return undefined;
    let disposed = false;
    const CustomMedia = class extends YouTubeMediaAdapter {
      constructor() { super(bridge); }
    };
    if (!Webamp.browserIsSupported()) {
      errorCallbackRef.current?.(new Error('This browser does not support Webamp.'));
      return undefined;
    }
    const webamp = new Webamp({
      __customMediaClass: CustomMedia,
      initialTracks: [],
      enableHotkeys: false,
      handleTrackDropEvent: () => [],
      handleAddUrlEvent: () => { catalogCallbackRef.current?.(); return []; },
      handleLoadListEvent: () => { catalogCallbackRef.current?.(); return []; },
      windowLayout: {
        main: { position: { x: 24, y: 24 } },
        playlist: { position: { x: 24, y: 140 } },
      },
    });
    webampRef.current = webamp;
    const unsubscribeClose = webamp.onClose(() => {
      bridge.stop();
      stateCallbackRef.current?.({ playing: false, state: 'closed', reason: 'closed' });
    });
    webamp.renderInto(node).then(() => {
      if (disposed) return;
      webamp.store.dispatch({
        type: 'UPDATE_WINDOW_POSITIONS',
        positions: { main: { x: 24, y: 24 }, playlist: { x: 24, y: 140 } },
        absolute: true,
      });
      webamp.onTrackDidChange((trackInfo) => {
        const videoId = videoIdFromUrl(trackInfo?.url || '');
        const track = localTracksRef.current.get(videoId) || tracksRef.current.find((item) => item.videoId === videoId);
        if (track) trackCallbackRef.current?.(track);
      });
      node.__webamp = webamp;
      readyCallbackRef.current?.({
        reopen() { webamp.reopen(); },
        select(track) {
          if (!track?.videoId) return;
          localTracksRef.current.set(track.videoId, track);
          webamp.pause();
          const queuedIndex = () => webamp.getPlaylistTracks().findIndex((item) => videoIdFromUrl(item.url || '') === track.videoId);
          const index = queuedIndex();
          if (index >= 0) webamp.setCurrentTrack(index);
          else {
            if (!pendingVideoIdsRef.current.has(track.videoId)) {
              pendingVideoIdsRef.current.add(track.videoId);
              webamp.appendTracks([toWebampTrack(track)]);
            }
            const unsubscribe = webamp.store.subscribe(() => {
              const queued = queuedIndex();
              if (queued < 0) return;
              pendingVideoIdsRef.current.delete(track.videoId);
              unsubscribe();
              webamp.setCurrentTrack(queued);
            });
          }
        },
      });
      bridge.dispatch({ type: 'webamp_ready', player: webamp });
    }).catch((error) => errorCallbackRef.current?.(error));

    const requestCatalog = (event) => {
      const listAction = event.target.closest('#playlist-list-menu .new-list, #playlist-list-menu .save-list');
      if (listAction) {
        event.preventDefault();
        event.stopPropagation();
        if (listAction.classList.contains('new-list')) newFolderCallbackRef.current?.();
        // Shared and private playlists persist through the API; never export a file.
        return;
      }
      const playButton = event.target.closest('#play, .playlist-play-button');
      const playlist = webamp.getPlaylistTracks();
      if (event.target.closest('#eject, #playlist-add-menu') || (playButton && !playlist.length)) {
        event.preventDefault();
        event.stopPropagation();
        catalogCallbackRef.current?.();
        return;
      }
      // Shared rows are appended without selecting a current track. Native Play
      // only resumes the media adapter, so select the first row before playing.
      if (playButton && webamp.store.getState().playlist.currentTrack == null) {
        event.preventDefault();
        event.stopPropagation();
        webamp.setCurrentTrack(0);
        webamp.play();
      }
    };
    const interceptRemove = (event) => {
      const target = event.target.closest('#playlist-remove-menu .remove-selected, #playlist-remove-menu .remove-all, #playlist-remove-menu .crop');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      const action = target.classList.contains('remove-all') ? 'remove-all'
        : target.classList.contains('crop') ? 'crop' : 'remove-selected';
      const playlistTracks = webamp.getPlaylistTracks();
      const selectedTrackIds = webamp.store.getState().playlist.selectedTracks || [];
      const result = selectedSharedTracksForRemoval({
        action,
        playlistTracks,
        selectedTrackIds,
        knownTracksByVideoId: localTracksRef.current,
      });
      if (result.blocked || !removeCallbackRef.current) {
        blockedCallbackRef.current?.('Only your own tracks or tracks you administer can be removed.');
        return;
      }
      result.tracks.forEach((track) => removeCallbackRef.current?.(track));
    };
    node.addEventListener('click', requestCatalog, true);
    node.addEventListener('click', interceptRemove, true);

    return () => {
      disposed = true;
      unsubscribeClose();
      node.removeEventListener('click', requestCatalog, true);
      node.removeEventListener('click', interceptRemove, true);
      bridge.pause();
      bridge.stop();
      try { webamp.dispose(); } catch { /* Webamp documents best-effort cleanup only. */ }
      if (webampRef.current === webamp) webampRef.current = null;
      if (node.__webamp === webamp) delete node.__webamp;
      node.replaceChildren();
    };
  }, [bridge]);

  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    const webamp = webampRef.current;
    if (!webamp) return undefined;
    for (const track of tracks) if (track?.videoId) localTracksRef.current.set(track.videoId, track);
    const reconcile = () => {
      if (webampRef.current !== webamp) return;
      const playlistTracks = webamp.getPlaylistTracks();
      const state = webamp.store.getState();
      const plan = planSharedPlaylistSync({
        catalogTracks: tracksRef.current,
        playlistTracks,
        knownTracksByVideoId: localTracksRef.current,
        pendingVideoIds: pendingVideoIdsRef.current,
        currentTrackId: state.playlist.currentTrack,
        mediaStatus: webamp.getMediaStatus(),
      });
      if (plan.removeIds.length) webamp.store.dispatch({ type: 'REMOVE_TRACKS', ids: plan.removeIds });
      if (plan.additions.length) {
        for (const track of plan.additions) pendingVideoIdsRef.current.add(track.videoId);
        webamp.appendTracks(plan.additions.map(toWebampTrack));
      }
      const present = new Set(webamp.getPlaylistTracks().map((row) => videoIdFromUrl(row.url || '')).filter(Boolean));
      for (const id of pendingVideoIdsRef.current) if (present.has(id)) pendingVideoIdsRef.current.delete(id);
    };
    reconcile();
    const unsubscribe = webamp.store.subscribe(reconcile);
    return unsubscribe;
  }, [tracks]);

  useEffect(() => {
    if (!active) {
      bridge.pause();
      onPlaybackState?.({ playing: false, reason: 'hidden' });
    }
  }, [active, bridge, onPlaybackState]);

  useEffect(() => bridge.subscribe((event) => {
    if (event.type === 'state') {
      const track = localTracksRef.current.get(event.videoId) || tracksRef.current.find((item) => item.videoId === event.videoId);
      const webamp = webampRef.current;
      if (webamp && event.state === 'paused' && webamp.getMediaStatus() === 'PLAYING') webamp.pause();
      if (webamp && event.state === 'playing' && webamp.getMediaStatus() !== 'PLAYING') webamp.play();
      stateCallbackRef.current?.({
        playing: event.state === 'playing',
        state: event.state,
        reason: event.state,
        trackId: track?.id ?? null,
        videoId: event.videoId ?? null,
        title: track?.title || null,
        artist: track?.artist || track?.contributor?.username || null,
      });
    }
    if (event.type === 'volume') {
      const webamp = webampRef.current;
      const currentVolume = webamp?.store?.getState?.().media?.volume;
      if (webamp && Number.isFinite(currentVolume) && Math.abs(currentVolume - event.volume) > 1) webamp.setVolume(event.volume);
    }
  }), [bridge]);

  return <div className="winamp-main-host" ref={mountRef} aria-label="Webamp player" onPointerDownCapture={onFocus} />;
}
