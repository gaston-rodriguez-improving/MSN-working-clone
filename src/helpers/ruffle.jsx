import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef(null);
  const playRequestRef = useRef(0);

  const playSWF = async (path, duration) => {
    const requestId = ++playRequestRef.current;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      const ruffleInstance = await loadRuffle();
      if (requestId !== playRequestRef.current || !containerRef.current) return;
      containerRef.current.innerHTML = '';

      const player = ruffleInstance.createPlayer();
      player.config = {
        autoplay: true,
        quality: 'high',
        wmode: 'transparent',
        splashScreen: false,
      };
      player.style.width = '900px';
      player.style.height = '700px';
      containerRef.current.appendChild(player);
      player.load(path);
      timeoutRef.current = setTimeout(() => {
        if (requestId !== playRequestRef.current || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        setIsPlaying(false);
      }, duration * 1000);
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play wink:', error.message);
    }
  };

  useImperativeHandle(ref, () => ({
    play: (path, duration) => playSWF(path, duration),
  }));

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute top-0 left-0 flex w-full h-full justify-center items-center pointer-events-none">
      <div ref={containerRef} />
    </div>
  );
});

export default Ruffle;
