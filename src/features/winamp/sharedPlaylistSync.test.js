import test from 'node:test';
import assert from 'node:assert/strict';
import { planSharedPlaylistSync, selectedSharedTracksForRemoval } from './sharedPlaylistSync.js';

const url = (id) => `https://www.youtube.com/watch?v=${id}`;
const shared = (id, videoId = `video${id}12345`) => ({ id, videoId, title: `Track ${id}`, canRemove: true });

test('playlist sync appends only catalog videos absent from the queue and pending loads', () => {
  const a = shared(1, 'abcdefghijk');
  const b = shared(2, 'zyxwvutsrqp');
  const plan = planSharedPlaylistSync({
    catalogTracks: [a, b, b],
    playlistTracks: [{ id: 10, url: url(a.videoId) }],
    pendingVideoIds: new Set([b.videoId]),
  });
  assert.deepEqual(plan, { additions: [], removeIds: [] });
  const next = planSharedPlaylistSync({ catalogTracks: [a, b], playlistTracks: [{ id: 10, url: url(a.videoId) }] });
  assert.deepEqual(next.additions, [b]);
});

test('removed shared rows are pruned except for the current playing or paused track', () => {
  const removed = shared(9, 'abcdefghijk');
  const local = { id: 12, url: 'https://media.example/local.mp3' };
  const playlistTracks = [{ id: 9, url: url(removed.videoId) }, { id: 10, url: url(removed.videoId) }, local];
  const knownTracksByVideoId = new Map([[removed.videoId, removed]]);
  assert.deepEqual(planSharedPlaylistSync({ catalogTracks: [], playlistTracks, knownTracksByVideoId, currentTrackId: 9, mediaStatus: 'PLAYING' }).removeIds, [10]);
  assert.deepEqual(planSharedPlaylistSync({ catalogTracks: [], playlistTracks, knownTracksByVideoId, currentTrackId: 9, mediaStatus: 'PAUSED' }).removeIds, [10]);
  assert.deepEqual(planSharedPlaylistSync({ catalogTracks: [], playlistTracks, knownTracksByVideoId, currentTrackId: 9, mediaStatus: 'STOPPED' }).removeIds, [9, 10]);
});

test('REM resolves only selected shared rows and blocks unauthorized or local rows', () => {
  const owner = shared(1, 'abcdefghijk');
  const other = { ...shared(2, 'zyxwvutsrqp'), canRemove: false };
  const rows = [{ id: 20, url: url(owner.videoId) }, { id: 21, url: url(other.videoId) }];
  const knownTracksByVideoId = new Map([[owner.videoId, owner], [other.videoId, other]]);
  assert.deepEqual(selectedSharedTracksForRemoval({ action: 'remove-selected', playlistTracks: rows, selectedTrackIds: [20], knownTracksByVideoId }), { tracks: [owner], blocked: false });
  assert.deepEqual(selectedSharedTracksForRemoval({ action: 'remove-selected', playlistTracks: rows, selectedTrackIds: [21], knownTracksByVideoId }), { tracks: [], blocked: true });
  assert.deepEqual(selectedSharedTracksForRemoval({ action: 'remove-all', playlistTracks: [...rows, { id: 22, url: 'https://media.example/local.mp3' }], knownTracksByVideoId }), { tracks: [], blocked: true });
});
