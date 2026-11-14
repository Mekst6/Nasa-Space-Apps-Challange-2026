// Shareable link round trips. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPermalink, parsePermalink } from '../src/permalink.js';

test('round trip: site, time, view and comparison partner', () => {
  const time = new Date('2026-11-23T20:00:00Z');
  const hash = buildPermalink({ siteId: 'shackleton', time, view: 'compare', compareB: 'im1' });
  assert.equal(hash, 'site=shackleton&t=2026-11-23T20:00Z&view=compare&b=im1');
  const back = parsePermalink(`#${hash}`);
  assert.equal(back.siteId, 'shackleton');
  assert.equal(back.time.getTime(), time.getTime());
  assert.equal(back.view, 'compare');
  assert.equal(back.compareB, 'im1');
});

test('round trip: custom point; time rounded to the minute', () => {
  const hash = buildPermalink({
    siteId: 'custom', time: new Date('2026-12-01T05:07:42Z'), view: 'terrain',
    custom: { lat: -85.123456, lon: 30.5, heightKm: 1.2 },
  });
  const back = parsePermalink(hash);
  assert.deepEqual(back.custom, { lat: -85.1235, lon: 30.5, heightKm: 1.2 });
  assert.equal(back.time.toISOString(), '2026-12-01T05:07:00.000Z');
  assert.equal(back.compareB, undefined); // only meaningful with view=compare
});

test('malformed input is ignored, not trusted', () => {
  const back = parsePermalink('#site=<script>&t=yesterday&view=admin&lat=200&lon=5&b=x');
  assert.deepEqual(back, {});
  assert.equal(parsePermalink('#lat=-10&lon=350').custom.lon, -10); // 350° E = 10° W
});
