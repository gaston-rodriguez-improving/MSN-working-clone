import test from 'node:test';
import assert from 'node:assert/strict';
import { toWebampTrack } from './tracks.js';

test('an omitted artist stays empty regardless of the contributor display name', () => {
  const track = { videoId: 'abcdefghijk', title: 'My song', contributor: { username: '<font color="#FF0000">G</font><font color="#FF1400">á</font>' } };
  assert.deepEqual(toWebampTrack(track).metaData, { title: 'My song', artist: '' });
  assert.ok(track.contributor.username.includes('<font'));
});

test('playlist metadata uses plain titles and artists and decodes text entities', () => {
  const track = { videoId: 'abcdefghijk', title: '<b>Rock &amp; Roll</b>', artist: '<i>The Band</i>', contributor: { username: 'Uploader' } };
  assert.equal(toWebampTrack(track).defaultName, 'Rock & Roll');
  assert.deepEqual(toWebampTrack(track).metaData, { title: 'Rock & Roll', artist: 'The Band' });
});
