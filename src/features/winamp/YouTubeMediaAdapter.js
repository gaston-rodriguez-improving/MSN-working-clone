const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function videoIdFromUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    return VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Webamp's documented IMedia surface (private __customMediaClass hook) backed
 * by the official YouTube IFrame API. The YouTube iframe does not expose audio
 * samples, so EQ, balance, preamp and analyser features intentionally do not
 * process or pretend to process the stream.
 */
export class YouTubeMediaAdapter {
  constructor(bridge) {
    this.bridge = bridge;
    this.listeners = new Map();
    this.position = 0;
    this.length = 0;
    this.volume = 100;
    this.currentVideoId = null;
    this.disposed = false;
    this.emit = this.emit.bind(this);
    this.unsubscribe = bridge.subscribe?.((event) => this.handleBridgeEvent(event));
  }

  on(event, callback) {
    const callbacks = this.listeners.get(event) || new Set();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
  }

  emit(event, value) {
    for (const callback of this.listeners.get(event) || []) callback(value);
  }

  handleBridgeEvent(event) {
    if (this.disposed || !event) return;
    if (event.type === 'loaded') {
      this.currentVideoId = event.videoId;
      this.length = Number(event.duration) || 0;
      this.position = 0;
      this.emit('fileLoaded');
      this.emit('timeupdate');
    } else if (event.type === 'state') {
      if (event.state === 'playing') {
        this.emit('stopWaiting');
        this.emit('playing');
      } else if (event.state === 'buffering') this.emit('waiting');
      else if (event.state === 'ended') this.emit('ended');
      else if (event.state === 'paused' || event.state === 'cued') this.emit('timeupdate');
    } else if (event.type === 'time') {
      this.position = Math.max(0, Number(event.currentTime) || 0);
      const duration = Number(event.duration);
      if (Number.isFinite(duration) && duration > 0 && duration !== this.length) {
        this.length = duration;
        this.emit('fileLoaded');
      }
      this.emit('timeupdate');
    } else if (event.type === 'error') {
      this.emit('stopWaiting');
      this.emit('paused');
      this.emit('error', event.code);
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, Number(volume) || 0));
    if (!this.bridge.suppressVolumeForward) this.bridge.setVolume?.(this.volume);
  }

  setBalance() {}
  setPreamp() {}
  setEqBand() {}
  disableEq() {}
  enableEq() {}
  getAnalyser() { return inertAnalyser; }

  timeElapsed() { return this.position; }
  duration() { return this.length; }

  async play() {
    if (this.disposed) return;
    await this.bridge.play?.();
  }

  pause() {
    if (!this.disposed) this.bridge.pause?.();
  }

  stop() {
    if (this.disposed) return;
    this.bridge.stop?.();
    this.position = 0;
    this.emit('timeupdate');
  }

  seekToPercentComplete(percent) {
    if (!this.disposed && this.length > 0) {
      this.bridge.seekTo?.(this.length * Math.max(0, Math.min(100, Number(percent) || 0)) / 100);
    }
  }

  async loadFromUrl(url, autoPlay = false) {
    const videoId = videoIdFromUrl(url);
    if (!videoId) throw new Error('Webamp track URL is not a supported YouTube video URL.');
    this.currentVideoId = videoId;
    this.position = 0;
    this.length = 0;
    await this.bridge.loadTrack?.(videoId, Boolean(autoPlay));
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe?.();
    this.listeners.clear();
  }
}

export function youtubeTrackUrl(videoId) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

// Webamp's canvas renderer assumes an AnalyserNode exists even when the custom
// media source cannot expose samples. A stable zero-data facade keeps the
// component safe; the canvas is hidden by scoped CSS and is never audio-reactive.
export const inertAnalyser = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  smoothingTimeConstant: 0,
  minDecibels: -100,
  maxDecibels: -30,
  context: null,
  getByteTimeDomainData(array) { array.fill(128); },
  getByteFrequencyData(array) { array.fill(0); },
  getFloatTimeDomainData(array) { array.fill(0); },
  getFloatFrequencyData(array) { array.fill(-100); },
};
