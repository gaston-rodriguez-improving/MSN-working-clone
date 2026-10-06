const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function parseYouTubeVideoId(input) {
  if (typeof input !== 'string' || input.length > 2048) return null;
  let url;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = null;
  if (host === 'youtu.be') {
    const match = url.pathname.match(/^\/([^/]+)\/?$/);
    if (match) id = match[1];
  }
  else if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/);
      if (match) id = match[1];
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

module.exports = { parseYouTubeVideoId };
