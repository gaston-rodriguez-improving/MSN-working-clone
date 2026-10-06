import { youtubeTrackUrl } from './YouTubeMediaAdapter';

export const toWebampTrack = (track) => ({
  url: youtubeTrackUrl(track.videoId),
  defaultName: track.title || `YouTube ${track.videoId}`,
  duration: 0,
  metaData: { title: track.title || `YouTube ${track.videoId}`, artist: track.artist || track.contributor?.username || 'MSN Music' },
});
