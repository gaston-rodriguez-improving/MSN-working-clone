import { youtubeTrackUrl } from './YouTubeMediaAdapter.js';
import { stripHtml } from '../../helpers/stripHtml.js';

export const toWebampTrack = (track) => {
  const title = stripHtml(track.title) || `YouTube ${track.videoId}`;
  const artist = stripHtml(track.artist);
  return {
    url: youtubeTrackUrl(track.videoId),
    defaultName: title,
    duration: 0,
    metaData: { title, artist },
  };
};
