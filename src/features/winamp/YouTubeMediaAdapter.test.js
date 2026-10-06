import test from 'node:test';
import assert from 'node:assert/strict';
import { YouTubeMediaAdapter, videoIdFromUrl } from './YouTubeMediaAdapter.js';
import { createYouTubeBridge } from './youtubeBridge.js';

test('parses only supported YouTube video URL forms', () => {
  assert.equal(videoIdFromUrl('https://youtu.be/abcdefghijk?t=25'), 'abcdefghijk');
  assert.equal(videoIdFromUrl('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(videoIdFromUrl('https://youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.equal(videoIdFromUrl('https://example.com/watch?v=abcdefghijk'), null);
  assert.equal(videoIdFromUrl('https://youtube.com/watch?v=short'), null);
});

test('maps Webamp media commands and YouTube events through the adapter', async () => {
  const calls = [];
  const subscribers = new Set();
  const bridge = {
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
    loadTrack: (id, autoPlay) => calls.push(['load', id, autoPlay]),
    play: () => calls.push(['play']),
    pause: () => calls.push(['pause']),
    stop: () => calls.push(['stop']),
    seekTo: (seconds) => calls.push(['seek', seconds]),
    setVolume: (volume) => calls.push(['volume', volume]),
  };
  const media = new YouTubeMediaAdapter(bridge);
  const events = [];
  media.on('fileLoaded', () => events.push('fileLoaded'));
  media.on('playing', () => events.push('playing'));
  media.on('timeupdate', () => events.push('timeupdate'));
  await media.loadFromUrl('https://youtu.be/abcdefghijk', false);
  media.setVolume(140);
  await media.play();
  [...subscribers][0]({ type: 'loaded', videoId: 'abcdefghijk', duration: 120 });
  media.seekToPercentComplete(50);
  [...subscribers][0]({ type: 'time', currentTime: 30, duration: 120 });
  [...subscribers][0]({ type: 'state', state: 'playing' });

  assert.deepEqual(calls, [
    ['load', 'abcdefghijk', false], ['volume', 100], ['play'], ['seek', 60],
  ]);
  assert.equal(media.duration(), 120);
  assert.equal(media.timeElapsed(), 30);
  assert.deepEqual(events, ['fileLoaded', 'timeupdate', 'timeupdate', 'playing']);
  media.dispose();
  assert.equal(subscribers.size, 0);
});

test('bridge ignores stale YouTube state after a track switch and queues cue until ready', () => {
  const bridge = createYouTubeBridge();
  const received = [];
  bridge.subscribe((event) => received.push(event));
  bridge.loadTrack('abcdefghijk');
  bridge.dispatch({ type: 'state', state: 'playing', videoId: 'zyxwvutsrqp' });
  bridge.dispatch({ type: 'loaded', videoId: 'zyxwvutsrqp', duration: 10 });
  bridge.dispatch({ type: 'time', videoId: 'zyxwvutsrqp', currentTime: 9 });
  assert.deepEqual(received.map(({ type }) => type), ['load_requested']);
  const calls = [];
  bridge.attach({ cueVideoById: ({ videoId }) => calls.push(['cue', videoId]), playVideo: () => calls.push(['play']) });
  assert.deepEqual(calls, [['cue', 'abcdefghijk']]);
  bridge.dispatch({ type: 'loaded', videoId: 'abcdefghijk', duration: 60 });
  assert.deepEqual(received.map(({ type }) => type), ['load_requested', 'loaded']);
});

test('bridge waits for the selected video cue before honoring Webamp play', () => {
  const bridge = createYouTubeBridge();
  const calls = [];
  bridge.loadTrack('abcdefghijk');
  bridge.attach({ cueVideoById: ({ videoId }) => calls.push(['cue', videoId]), playVideo: () => calls.push(['play']) });
  bridge.play();
  assert.deepEqual(calls, [['cue', 'abcdefghijk']]);
  bridge.dispatch({ type: 'loaded', videoId: 'abcdefghijk', duration: 120 });
  assert.deepEqual(calls, [['cue', 'abcdefghijk'], ['play']]);
});
