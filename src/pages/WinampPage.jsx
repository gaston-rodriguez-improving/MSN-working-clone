/* eslint react/prop-types: off */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ChatContext } from '../contexts/ChatContext';
import { addMusicTrack, getMusicTracks, removeMusicTrack } from '../data/api';
import { listeningEnabled } from '../features/musicConfig';
import WebampPlayer from '../features/winamp/WebampPlayer';
import AddTrackDialog from '../features/winamp/AddTrackDialog';
import YouTubePlayer from '../features/winamp/YouTubePlayer';
import { createYouTubeBridge } from '../features/winamp/youtubeBridge';
import '../features/winamp/winamp.css';

const asTrack = (track) => ({ ...track, videoId: track.videoId || track.video_id });
const makeSessionId = () => globalThis.crypto?.randomUUID?.() || `winamp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function EffectCanvas({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    let frame = 0;
    let request = 0;
    let last = 0;
    const paint = (time) => {
      if (active) request = requestAnimationFrame(paint);
      if (time - last < 50) return;
      last = time;
      const { width, height } = canvas;
      context.fillStyle = '#080510';
      context.fillRect(0, 0, width, height);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = reducedMotion ? 0 : frame++ * 0.015;
      for (let i = 0; i < 34; i += 1) {
        const hue = (190 + i * 8 + offset * 40) % 360;
        const x = width * (0.5 + Math.sin(offset + i * 0.6) * (0.08 + i / 80));
        const y = height * (0.5 + Math.cos(offset * 0.8 + i * 0.44) * (0.08 + i / 70));
        context.beginPath();
        context.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.6 - i / 75})`;
        context.lineWidth = 1 + (i % 3);
        context.ellipse(x, y, width * (0.08 + i * 0.012), height * (0.08 + i * 0.009), offset + i / 10, 0, Math.PI * 2);
        context.stroke();
      }
    };
    request = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(request);
  }, [active]);
  return <canvas ref={canvasRef} className="winamp-effects-canvas" width="640" height="360" aria-label="Procedural retro effects animation" />;
}

export default function WinampPage() {
  const bridge = useMemo(() => createYouTubeBridge(), []);
  const { user, logout } = useContext(AuthContext);
  const { subscribeToServerEvents, sendSocketEvent, listeningSharing, setListeningSharing } = useContext(ChatContext);
  const [tracks, setTracks] = useState([]);
  const [mode, setMode] = useState('effects');
  const [activeWindow, setActiveWindow] = useState('video');
  const [mediaOpen, setMediaOpen] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [playback, setPlayback] = useState({ playing: false, state: 'unstarted' });
  const [playerControls, setPlayerControls] = useState(null);
  const mediaWindowRef = useRef(null);
  const dragRef = useRef(null);
  const activityRef = useRef({ sessionId: null, sequence: 0, trackId: null, playing: false });
  const tracksRef = useRef(tracks);
  const reloadFlightRef = useRef(null);
  const reloadAgainRef = useRef(false);
  const handledTrackParamRef = useRef(false);
  tracksRef.current = tracks;
  useEffect(() => { bridge.setActive(true); }, [bridge]);

  const reloadTracks = useCallback(async () => {
    if (reloadFlightRef.current) { reloadAgainRef.current = true; return reloadFlightRef.current; }
    const request = getMusicTracks().then(({ data }) => {
      setTracks((data.tracks || []).map(asTrack));
      setError('');
    }).catch((requestError) => {
      setError(requestError.response?.data?.error || 'Could not load the shared music catalog.');
    }).finally(() => {
      reloadFlightRef.current = null;
      if (reloadAgainRef.current) {
        reloadAgainRef.current = false;
        queueMicrotask(() => reloadTracks());
      }
    });
    reloadFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    // Subscribe first so catalog changes during the initial snapshot are not missed.
    const unsubscribe = subscribeToServerEvents((event) => {
      if (event.type === 'music_catalog_changed' || event.type === 'socket_open') reloadTracks();
    });
    reloadTracks();
    const timer = window.setInterval(reloadTracks, 30_000);
    window.addEventListener('focus', reloadTracks);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('focus', reloadTracks);
    };
  }, [reloadTracks, subscribeToServerEvents]);

  const publish = useCallback((action, current = activityRef.current) => {
    if (!current.sessionId) return false;
    const sent = sendSocketEvent?.('listening_activity', {
      action,
      sessionId: current.sessionId,
      sequence: current.sequence,
      ...(action === 'start' || action === 'heartbeat' ? { trackId: current.trackId } : {}),
    });
    return Boolean(sent);
  }, [sendSocketEvent]);

  const clearActivity = useCallback(() => {
    const current = activityRef.current;
    if (current.sessionId) {
      current.sequence += 1;
      publish('clear', current);
    }
    activityRef.current = { sessionId: null, sequence: 0, trackId: null, playing: false };
  }, [publish]);

  const openAddDialog = useCallback(() => {
    setError('');
    setAddDialogOpen(true);
  }, []);

  const publishPlaying = useCallback((state) => {
    setPlayback(state);
    if (!state.playing || !listeningEnabled || !listeningSharing || !state.trackId) {
      clearActivity();
      return;
    }
    setSelectedTrack((previous) => tracksRef.current.find((track) => track.id === state.trackId) || (previous?.id === state.trackId ? previous : null));
    const current = activityRef.current;
    if (!current.playing || current.trackId !== state.trackId || !current.sessionId) {
      clearActivity();
      const session = { sessionId: makeSessionId(), sequence: 1, trackId: state.trackId, playing: true };
      activityRef.current = session;
      publish('start', session);
    } else {
      current.playing = true;
    }
  }, [clearActivity, listeningSharing, publish]);

  useEffect(() => {
    if (!playback.playing || !listeningEnabled || !listeningSharing) return undefined;
    const heartbeat = window.setInterval(() => {
      const current = activityRef.current;
      if (!current.playing || !current.sessionId) return;
      current.sequence += 1;
      publish('heartbeat', current);
    }, 20_000);
    return () => window.clearInterval(heartbeat);
  }, [listeningSharing, playback.playing, publish]);

  useEffect(() => {
    if (listeningSharing && listeningEnabled && playback.playing && playback.trackId) publishPlaying(playback);
    else clearActivity();
  }, [clearActivity, listeningSharing, playback, publishPlaying]);

  useEffect(() => {
    const unsubscribe = subscribeToServerEvents((event) => {
      if (event.type === 'socket_open' && playback.playing && listeningEnabled && listeningSharing) {
        const current = activityRef.current;
        if (current.sessionId) {
          current.sequence += 1;
          publish('start', current);
        }
      }
    });
    return unsubscribe;
  }, [listeningSharing, playback.playing, publish, reloadTracks, subscribeToServerEvents]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'messenger_token' && !event.newValue) {
        bridge.pause();
        clearActivity();
        logout?.();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [bridge, clearActivity, logout]);

  useEffect(() => () => {
    bridge.pause();
    clearActivity();
  }, [bridge, clearActivity]);

  useEffect(() => {
    const onPageHide = () => { bridge.pause(); clearActivity(); };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [bridge, clearActivity]);

  useEffect(() => {
    if (!user?.id) clearActivity();
  }, [clearActivity, user?.id]);

  useEffect(() => {
    if (handledTrackParamRef.current || !tracks.length) return;
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track') || params.get('trackId');
    if (!trackId) return;
    const match = tracks.find((track) => String(track.id) === trackId);
    if (!match || !playerControls) return;
    handledTrackParamRef.current = true;
    setSelectedTrack(match);
    playerControls.select(match);
  }, [playerControls, tracks]);

  const handleAddTrack = async (track) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const { data } = await addMusicTrack(track);
      if (data.track) setTracks((current) => current.some((item) => item.id === data.track.id) ? current : [...current, asTrack(data.track)]);
      setAddDialogOpen(false);
      setNotice('Added to the shared playlist.');
      reloadTracks();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not add that YouTube video.');
    } finally { setSubmitting(false); }
  };

  const handleRemoveTrack = async (track) => {
    try {
      await removeMusicTrack(track.id);
      setTracks((current) => current.filter((item) => item.id !== track.id));
      setNotice('Removed from the shared playlist.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not remove that track.');
    }
  };

  const beginDrag = (event) => {
    if (event.target.closest('button') || window.innerWidth <= 760) return;
    const bounds = mediaWindowRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const parent = mediaWindowRef.current.offsetParent.getBoundingClientRect();
    dragRef.current = { x: event.clientX, y: event.clientY, left: bounds.left - parent.left, top: bounds.top - parent.top, width: bounds.width, height: bounds.height, parentLeft: parent.left, parentTop: parent.top, parentHeight: parent.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    if (!dragRef.current || !mediaWindowRef.current) return;
    const media = mediaWindowRef.current;
    const maxLeft = Math.max(6, window.innerWidth - dragRef.current.parentLeft - dragRef.current.width - 6);
    const maxTop = Math.max(6, Math.min(dragRef.current.parentHeight, window.innerHeight - dragRef.current.parentTop) - dragRef.current.height - 6);
    const left = Math.max(6, Math.min(maxLeft, dragRef.current.left + event.clientX - dragRef.current.x));
    const top = Math.max(6, Math.min(maxTop, dragRef.current.top + event.clientY - dragRef.current.y));
    media.style.left = `${left}px`;
    media.style.top = `${top}px`;
  };

  return (
    <main className="winamp-page">
      <section className={`winamp-desktop active-${activeWindow}`} aria-label="Winamp desktop">
        <button className="winamp-desktop-shortcut" type="button" title="Open Winamp" onClick={() => { playerControls?.reopen(); setMediaOpen(true); }} disabled={!playerControls}>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#252535" stroke="#c4c4cc" d="M7 5h34v34H7z"/><path fill="#f6ca38" stroke="#8f6618" d="M30 7 14 25h11l-7 15 18-21H25z"/><path fill="white" stroke="#222" d="M3 30h16v15H3z"/><path fill="#153b9f" d="M6 41v-7h6v-3l5 5-5 5v-3H9v3z"/></svg>
          <span>Winamp</span>
        </button>
        <WebampPlayer bridge={bridge} tracks={tracks} active={true} onFocus={() => setActiveWindow('webamp')} onPlaybackState={publishPlaying} onTrackSelected={setSelectedTrack} onReady={setPlayerControls} onCatalogRequest={openAddDialog} onRemoveTrack={handleRemoveTrack} onRemoveBlocked={(reason) => setNotice(reason)} onError={(value) => setError(value.message || String(value))} />

        <section hidden={!mediaOpen} ref={mediaWindowRef} className={`winamp-media-window ${mode === 'effects' ? 'is-effects' : ''}`} aria-label="YouTube media window" onPointerDownCapture={() => setActiveWindow('video')}>
          <div className="winamp-window-title" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }}>
            <span className="winamp-title-icon">▶</span><span>MSN VIDEO · {selectedTrack?.title || 'YOUTUBE PLAYER'}</span>
            <div className="winamp-window-actions">
              <button type="button" aria-label="Minimize video window" onClick={() => { setMediaOpen(false); }}>_</button>
              <button type="button" aria-label="Close video window" onClick={() => { bridge.stop(); setMediaOpen(false); }}>×</button>
            </div>
          </div>
          <div className="winamp-media-toolbar">
            <button type="button" className={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>VIDEO</button>
            <button type="button" className={mode === 'effects' ? 'active' : ''} onClick={() => setMode('effects')}>EFFECTS</button>
            <span>{playback.playing ? '● PLAYING' : playback.state === 'buffering' ? '◌ BUFFERING' : '■ STOPPED'}</span>
          </div>
          <div className="winamp-media-content">
            {mode === 'effects' && <EffectCanvas active={playback.playing} />}
            <YouTubePlayer bridge={bridge} active={true} onEvent={(event) => {
              if (event.type === 'api_error') setError(event.error.message);
              if (event.type === 'error') setNotice(`YouTube player error ${event.code}. The video may be unavailable or embedding may be disabled.`);
            }} />
          </div>
          <footer className="winamp-attribution">YouTube · <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Terms</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy</a></footer>
        </section>
      </section>

      <AddTrackDialog open={addDialogOpen} busy={submitting} error={error} onSubmit={handleAddTrack} onClose={() => setAddDialogOpen(false)} />
      <aside className="winamp-desktop-controls" aria-label="Player options">
        {listeningEnabled && <label className="winamp-share-toggle"><input type="checkbox" checked={Boolean(listeningSharing)} onChange={(event) => setListeningSharing(event.target.checked).catch((failure) => setError(failure.response?.data?.error || 'Could not update listening sharing.'))} /> Share listening activity</label>}
        {(notice || (error && !addDialogOpen)) && <span className="winamp-desktop-notice" role={error ? 'alert' : 'status'}>{error || notice}</span>}
      </aside>
    </main>
  );
}
