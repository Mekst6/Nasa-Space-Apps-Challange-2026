// Window and rating checks. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteSky } from '../src/ephemeris.js';
import { siteWindows, rate, worse } from '../src/windows.js';

const site = { lat: 0.674, lon: 23.473, heightKm: 0 };
const farSide = { lat: -45.4561, lon: 177.5885, heightKm: 0 };
const start = new Date('2026-11-14T00:00:00Z');

test('rating thresholds and combination', () => {
  assert.equal(rate(5), 'green');
  assert.equal(rate(1), 'yellow');
  assert.equal(rate(-0.1), 'red');
  assert.equal(worse('green', 'yellow'), 'yellow');
  assert.equal(worse('red', 'yellow'), 'red');
});

test('next sunrise/sunset is a real horizon crossing, accurate to a minute', () => {
  const w = siteWindows(site, start);
  assert.ok(w.power.next, 'equatorial site must have a sun event within 30 days');
  const at = w.power.next.at.getTime();
  const before = siteSky(site, new Date(at - 60e3)).sun.apparentElevation;
  const after = siteSky(site, new Date(at + 60e3)).sun.apparentElevation;
  assert.ok(Math.sign(before) !== Math.sign(after), `${before} -> ${after}`);
  assert.equal(w.power.next.type, w.power.elevation > 0 ? 'set' : 'rise');
});

test('sun hours match the time until sunset; far side never sees the Earth', () => {
  // Blue Ghost M1 site on 2026-11-14 15:00 UTC: sun up, sets within the 14-day window.
  const blueGhost = { lat: 18.56, lon: 61.81, heightKm: 0 };
  const now = new Date('2026-11-14T15:00:00Z');
  const w = siteWindows(blueGhost, now);
  assert.equal(w.power.next.type, 'set');
  const hoursToSet = (w.power.next.at - now) / 3600e3;
  assert.ok(hoursToSet < 14 * 24);
  assert.ok(Math.abs(w.power.hoursAbove - hoursToSet) < 0.5, `${w.power.hoursAbove} vs ${hoursToSet}`);
  assert.ok(Math.abs(w.comms.hoursAbove - 14 * 24) < 1e-6, 'near side sees Earth all the time');

  const far = siteWindows(farSide, start);
  assert.equal(far.comms.hoursAbove, 0);
  assert.equal(far.comms.next, null);
  assert.equal(far.comms.status, 'red');
});

test('series stats: interpolated hours above and longest run below', async () => {
  const { seriesStats, bothAboveHours, elevationSeries } = await import('../src/windows.js');
  // +1, +1, -1, -1, -1, +1: above 1 h fully + 0.5 h + 0.5 h; 3 samples below in a row.
  const s = seriesStats([1, 1, -1, -1, -1, 1]);
  assert.ok(Math.abs(s.hoursAbove - 2) < 1e-9, `${s.hoursAbove}`);
  assert.equal(s.longestBelow, 3);
  assert.equal(s.runOpen, false);
  assert.equal(seriesStats([-1, -1, 1]).runOpen, true);
  assert.equal(bothAboveHours([1, 1, 1, -1], [1, 1, -1, -1]), 1);

  const series = elevationSeries({ lat: 0.674, lon: 23.473, heightKm: 0 }, Date.UTC(2026, 10, 14), 720);
  assert.equal(series.sun.length, 720);
  const sunHours = seriesStats(series.sun).hoursAbove;
  // One synodic month is 708.7 h, so 719 h hold a little more than one full lunar day (~354 h).
  assert.ok(sunHours > 330 && sunHours < 400, `${sunHours}`);
});
