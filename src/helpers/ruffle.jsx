import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

let ruffleLoadPromise;

const loadRuffle = () => {
  if (window.RufflePlayer) return Promise.resolve(window.RufflePlayer.newest());
  if (!ruffleLoadPromise) {
    ruffleLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ruffle-rs/ruffle';
      script.async = true;
      script.onload = () => {
        const instance = window.RufflePlayer?.newest();
        if (instance) resolve(instance);
        else reject(new Error('RufflePlayer failed to initialize'));
      };
      script.onerror = () => reject(new Error('RufflePlayer failed to load'));
      document.body.appendChild(script);
    }).catch((error) => {
      ruffleLoadPromise = null;
      throw error;
    });
  }
  return ruffleLoadPromise;
};

const Ruffle = forwardRef((_, ref) => {
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const playerRef = useRef(null);
  const playRequestRef = useRef(0);

  const stopPlayer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const player = playerRef.current;
    if (player) {
      try {
        player.pause?.();
        player.ruffle?.().suspend?.();
      } catch {
        player.pause?.();
      }
      player.remove();
      playerRef.current = null;
    }
    containerRef.current?.replaceChildren();
  }, []);

  const playSWF = async (path, duration) => {
    const requestId = ++playRequestRef.current;
    stopPlayer();

    try {
      const ruffleInstance = await loadRuffle();
      if (requestId !== playRequestRef.current || !containerRef.current) return;
      const player = ruffleInstance.createPlayer();
      player.config = {
        autoplay: true,
        quality: 'high',
        wmode: 'transparent',
        splashScreen: false,
      };
      player.style.width = '900px';
      player.style.height = '700px';
      playerRef.current = player;
      containerRef.current.appendChild(player);
      await player.load(path);
      if (requestId !== playRequestRef.current || playerRef.current !== player) return;
      timeoutRef.current = setTimeout(() => {
        if (requestId !== playRequestRef.current) return;
        playRequestRef.current += 1;
        stopPlayer();
      }, duration * 1000);
    } catch (error) {
      if (requestId === playRequestRef.current) stopPlayer();
      console.error('Failed to play wink:', error.message);
    }
  };

  useImperativeHandle(ref, () => ({
    play: (path, duration) => playSWF(path, duration),
  }));

  useEffect(() => () => {
    playRequestRef.current += 1;
    stopPlayer();
  }, [stopPlayer]);

  return (
    <div className="absolute top-0 left-0 flex w-full h-full justify-center items-center pointer-events-none">
      <div ref={containerRef} />
    </div>
  );
});

export default Ruffle;
