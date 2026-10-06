/* eslint react/prop-types: off */
import { useEffect, useRef, useState } from 'react';

let apiPromise;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    let script = document.querySelector('script[data-youtube-iframe-api]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';
      script.onerror = () => reject(new Error('YouTube player API could not be loaded.'));
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export default function YouTubePlayer({ bridge, active, onEvent }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const initialVideoIdRef = useRef(bridge.pendingVideoId);
  const [hasTrack, setHasTrack] = useState(Boolean(bridge.pendingVideoId));
  onEventRef.current = onEvent;

  useEffect(() => {
    return bridge.subscribe((event) => {
      if (event.type === 'load_requested' && !hasTrack) {
        initialVideoIdRef.current = event.videoId;
        setHasTrack(true);
      }
    });
  }, [bridge, hasTrack]);

  useEffect(() => {
    if (!hasTrack) return undefined;
    let cancelled = false;
    let pollId;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      const targetNode = document.createElement('div');
      hostRef.current.replaceChildren(targetNode);
      const player = new YT.Player(targetNode, {
        width: '100%',
        height: '100%',
        videoId: initialVideoIdRef.current,
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: ({ target }) => {
            if (cancelled) return;
            playerRef.current = target;
            bridge.attach(target);
            pollId = window.setInterval(() => {
              if (!playerRef.current) return;
              const actualVideoId = target.getVideoData?.().video_id;
              if (actualVideoId && actualVideoId !== bridge.currentVideoId) return;
              bridge.dispatch({ type: 'time', videoId: actualVideoId, currentTime: target.getCurrentTime(), duration: target.getDuration() });
              bridge.dispatch({ type: 'volume', videoId: actualVideoId, volume: target.isMuted() ? 0 : target.getVolume(), muted: target.isMuted() });
            }, 500);
          },
          onStateChange: ({ data, target }) => {
            const actualVideoId = target.getVideoData?.().video_id;
            if (actualVideoId && bridge.currentVideoId && actualVideoId !== bridge.currentVideoId) return;
            const state = data === YT.PlayerState.PLAYING ? 'playing'
              : data === YT.PlayerState.PAUSED ? 'paused'
                : data === YT.PlayerState.BUFFERING ? 'buffering'
                  : data === YT.PlayerState.ENDED ? 'ended'
                    : data === YT.PlayerState.CUED ? 'cued' : 'unstarted';
            bridge.dispatch({ type: 'state', state, videoId: bridge.currentVideoId });
            if (data === YT.PlayerState.CUED) {
              bridge.dispatch({ type: 'loaded', videoId: bridge.currentVideoId, duration: target.getDuration() });
            }
            onEventRef.current?.({ type: 'state', state, videoId: bridge.currentVideoId });
          },
          onError: ({ data }) => {
            bridge.dispatch({ type: 'state', state: 'paused', videoId: bridge.currentVideoId });
            bridge.dispatch({ type: 'error', code: data });
            onEventRef.current?.({ type: 'error', code: data, videoId: bridge.currentVideoId });
          },
        },
      });
      playerRef.current = player;
    }).catch((error) => onEventRef.current?.({ type: 'api_error', error }));

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      bridge.attach(null);
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try { player.stopVideo(); player.destroy(); } catch { /* iframe may not have completed construction */ }
      }
    };
  }, [bridge, hasTrack]);

  useEffect(() => {
    if (!active) bridge.pause();
  }, [active, bridge]);

  return <div className="winamp-youtube-frame"><div ref={hostRef} className="winamp-youtube-host" /></div>;
}
