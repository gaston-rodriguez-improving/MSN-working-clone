const test = require('node:test');
const assert = require('node:assert/strict');
const { parseYouTubeVideoId } = require('./music');

test('accepts supported YouTube URL forms and ignores extra query parameters', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=20',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://youtube.com/embed/dQw4w9WgXcQ',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ'
  ]) assert.equal(parseYouTubeVideoId(url), 'dQw4w9WgXcQ');
});

test('rejects unsupported hosts, malformed IDs, and non-URLs', () => {
  for (const url of [
    'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://evil.test/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=not-an-id',
    'https://youtu.be/dQw4w9WgXcQ/extra',
    'javascript:alert(1)',
    '',
    'nope'
  ]) assert.equal(parseYouTubeVideoId(url), null, url);
});
