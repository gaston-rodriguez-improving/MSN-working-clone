import { videoIdFromUrl } from './YouTubeMediaAdapter.js';

/**
 * Plan a non-disruptive Webamp playlist reconciliation. Shared catalog rows are
 * appended once; removed rows are pruned after they stop being the current
 * playing/paused track. Unrecognized local rows are left alone.
 */
export function planSharedPlaylistSync({
  catalogTracks = [],
  playlistTracks = [],
  knownTracksByVideoId = new Map(),
  pendingVideoIds = new Set(),
  currentTrackId = null,
  mediaStatus = 'STOPPED',
}) {
  const catalogByVideoId = new Map();
  for (const track of catalogTracks) {
    if (track?.videoId && !catalogByVideoId.has(track.videoId)) catalogByVideoId.set(track.videoId, track);
  }

  const playlistByVideoId = new Map();
  for (const track of playlistTracks) {
    const videoId = videoIdFromUrl(track?.url || '');
    if (!videoId) continue;
    const entries = playlistByVideoId.get(videoId) || [];
    entries.push(track);
    playlistByVideoId.set(videoId, entries);
  }

  const additions = [];
  for (const [videoId, track] of catalogByVideoId) {
    if (!playlistByVideoId.has(videoId) && !pendingVideoIds.has(videoId)) additions.push(track);
  }

  const preserveCurrent = mediaStatus === 'PLAYING' || mediaStatus === 'PAUSED';
  const removeIds = [];
  for (const [videoId, entries] of playlistByVideoId) {
    if (!knownTracksByVideoId.has(videoId) || catalogByVideoId.has(videoId) || pendingVideoIds.has(videoId)) continue;
    for (const entry of entries) {
      if (preserveCurrent && Number(entry.id) === Number(currentTrackId)) continue;
      removeIds.push(entry.id);
    }
  }

  return { additions, removeIds };
}

export function selectedSharedTracksForRemoval({
  action,
  playlistTracks = [],
  selectedTrackIds = [],
  knownTracksByVideoId = new Map(),
}) {
  const allIds = playlistTracks.map((track) => Number(track.id));
  const selected = new Set(selectedTrackIds.map(Number));
  let requestedIds;
  if (action === 'remove-all') requestedIds = allIds;
  else if (action === 'crop') requestedIds = allIds.filter((id) => !selected.has(id));
  else requestedIds = allIds.filter((id) => selected.has(id));

  const tracksById = new Map(playlistTracks.map((track) => [Number(track.id), track]));
  const resolved = new Map();
  for (const id of requestedIds) {
    const videoId = videoIdFromUrl(tracksById.get(id)?.url || '');
    const sharedTrack = videoId ? knownTracksByVideoId.get(videoId) : null;
    if (!sharedTrack?.canRemove) return { tracks: [], blocked: true };
    resolved.set(sharedTrack.id, sharedTrack);
  }
  return { tracks: [...resolved.values()], blocked: false };
}
