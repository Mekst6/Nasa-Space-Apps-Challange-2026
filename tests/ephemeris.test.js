// Plausibility checks from PLAN.md section 6. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Libration, SearchMoonPhase, MakeTime } from 'astronomy-engine';
import {
  moonFixedDirections, directionToLatLon, horizonDip, horizontal, siteSky,
} from '../src/ephemeris.js';

const HOUR_MS = 3600e3;
const START = Date.UTC(2026, 0, 1);

// Smallest signed difference between two angles in degrees.
const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;

test('sub-Earth point stays near (0°, 0°) and matches astronomy-engine libration', () => {
  for (let day = 0; day < 365; day += 3) {
    const date = new Date(START + day * 24 * HOUR_MS);
    const subEarth = directionToLatLon(moonFixedDirections(date).earth);
    assert.ok(Math.abs(subEarth.lat) < 8, `lat ${subEarth.lat} on day ${day}`);
    assert.ok(Math.abs(subEarth.lon) < 9, `lon ${subEarth.lon} on day ${day}`);

    // Libration() is Meeus' optical libration; our IAU frame also contains physical libration,
    // which is at most a few hundredths of a degree, plus small model differences.
    const lib = Libration(date);
    assert.ok(Math.abs(subEarth.lat - lib.elat) < 0.3, `lat ${subEarth.lat} vs ${lib.elat}`);
    assert.ok(Math.abs(angleDiff(subEarth.lon, lib.elon)) < 0.3, `lon ${subEarth.lon} vs ${lib.elon}`);
  }
});

test('sun is overhead near (0°, 0°) at full moon and near (0°, 180°) at new moon', () => {
  let time = MakeTime(new Date(START));
  for (let i = 0; i < 12; i++) {
    const full = SearchMoonPhase(180, time, 40);
    const subSolarFull = directionToLatLon(moonFixedDirections(full).sun);
    assert.ok(Math.abs(subSolarFull.lat) < 2, `full moon lat ${subSolarFull.lat}`);
    assert.ok(Math.abs(subSolarFull.lon) < 12, `full moon lon ${subSolarFull.lon}`);

    const fresh = SearchMoonPhase(0, full, 40);
    const subSolarNew = directionToLatLon(moonFixedDirections(fresh).sun);
    assert.ok(Math.abs(subSolarNew.lat) < 2, `new moon lat ${subSolarNew.lat}`);
    assert.ok(Math.abs(angleDiff(subSolarNew.lon, 180)) < 12, `new moon lon ${subSolarNew.lon}`);

    time = fresh;
  }
});

test('sun elevation at the south pole stays within about ±1.7°', () => {
  // Lunar equator vs. ecliptic: 1.54°. The Moon's offset from the ecliptic (up to ~5°, i.e.
  // ~33,000 km at 1 AU) shifts the sun direction by up to ~0.15° more, so the bound is ~1.7°.
  let min = Infinity, max = -Infinity;
  for (let h = 0; h < 2 * 365 * 24; h += 6) {
    const date = new Date(START + h * HOUR_MS);
    const { elevation } = horizontal(moonFixedDirections(date).sun, -90, 0);
    min = Math.min(min, elevation);
    max = Math.max(max, elevation);
  }
  assert.ok(min > -1.75 && max < 1.75, `range ${min.toFixed(3)} .. ${max.toFixed(3)}`);
  assert.ok(min < -1.3 && max > 1.3, `range suspiciously small: ${min} .. ${max}`);
});

test('topocentric parallax of the Earth is ~0.26° near the horizon', () => {
  // Point where the Earth is close to the horizon: 90° away from the sub-Earth point.
  const date = new Date('2026-11-14T00:00:00Z');
  const dirs = moonFixedDirections(date);
  const sub = directionToLatLon(dirs.earth);
  const site = { lat: 0, lon: sub.lon + 90 };
  const fromCenter = horizontal(dirs.earth, site.lat, site.lon).elevation;
  const fromSurface = siteSky(site, date, dirs).earth.elevation;
  const parallax = fromCenter - fromSurface;
  assert.ok(parallax > 0.2 && parallax < 0.3, `parallax ${parallax}`);
});

test('horizon dip', () => {
  assert.equal(horizonDip(0), 0);
  assert.equal(horizonDip(-1), 0);
  assert.ok(Math.abs(horizonDip(2) - 2.75) < 0.02, `dip(2 km) = ${horizonDip(2)}`);
  assert.ok(Math.abs(horizonDip(5) - 4.35) < 0.05, `dip(5 km) = ${horizonDip(5)}`);
});

test('apparent elevation adds the dip; azimuth convention is north = 0°, east = 90°', () => {
  const date = new Date('2026-11-14T15:00:00Z');
  const flat = siteSky({ lat: -85, lon: 30, heightKm: 0 }, date);
  const high = siteSky({ lat: -85, lon: 30, heightKm: 5 }, date);
  // Height only changes the geometric elevation through parallax (< 0.001° for 5 km).
  assert.ok(Math.abs(high.sun.elevation - flat.sun.elevation) < 1e-3);
  assert.ok(Math.abs(high.sun.apparentElevation - high.sun.elevation - horizonDip(5)) < 1e-12);

  // From (0°, 0°): a direction toward (0°, 90° E) lies on the eastern horizon,
  // a direction toward the north pole on the northern horizon.
  assert.ok(Math.abs(horizontal([0, 1, 0], 0, 0).azimuth - 90) < 1e-9);
  assert.ok(Math.abs(horizontal([0, 0, 1], 0, 0).azimuth) < 1e-9);
  assert.ok(Math.abs(horizontal([1, 0, 0], 0, 0).elevation - 90) < 1e-9);
});

test('terrain horizon profile replaces the dip', async () => {
  const { horizonAt } = await import('../src/ephemeris.js');
  const profile = { azimuthStepDeg: 90, anglesDeg: [0, 2, 4, 2] };
  assert.equal(horizonAt(profile, 0), 0);
  assert.equal(horizonAt(profile, 45), 1);
  assert.equal(horizonAt(profile, 315), 1); // wraps from 270° back to 0°
  assert.equal(horizonAt(profile, 360), 0);
  assert.equal(horizonAt(profile, -90), 2);

  const date = new Date('2026-11-14T15:00:00Z');
  const site = { lat: -85, lon: 30, heightKm: 2 };
  const withDip = siteSky(site, date);
  const flatProfile = { azimuthStepDeg: 1, anglesDeg: new Array(360).fill(-horizonDip(2)) };
  const withProfile = siteSky({ ...site, horizon: flatProfile }, date);
  assert.ok(Math.abs(withProfile.sun.apparentElevation - withDip.sun.apparentElevation) < 1e-9);

  const blocked = siteSky({ ...site, horizon: { azimuthStepDeg: 1, anglesDeg: new Array(360).fill(30) } }, date);
  assert.ok(Math.abs(blocked.sun.apparentElevation - (blocked.sun.elevation - 30)) < 1e-9);
});

test('Earth phase seen from the Moon is opposite to the Moon phase', async () => {
  const { earthPhase, earthOrientation } = await import('../src/ephemeris.js');
  const full = SearchMoonPhase(180, MakeTime(new Date('2026-11-01T00:00:00Z')), 40);
  const fresh = SearchMoonPhase(0, MakeTime(new Date('2026-11-01T00:00:00Z')), 40);
  const atFull = earthPhase(full.date), atNew = earthPhase(fresh.date);
  assert.ok(atFull.fraction < 0.03, `full Moon -> new Earth, got ${atFull.fraction}`);
  assert.ok(atNew.fraction > 0.97, `new Moon -> full Earth, got ${atNew.fraction}`);
  assert.equal(atFull.name, 'new Earth');

  // Orientation: orthonormal, and the Earth's axis is ~23° away from the Moon's.
  const { north, greenwich } = earthOrientation(new Date('2026-11-15T12:00:00Z'));
  const dotp = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  assert.ok(Math.abs(dotp(north, greenwich)) < 1e-9);
  assert.ok(Math.abs(dotp(north, north) - 1) < 1e-9 && Math.abs(dotp(greenwich, greenwich) - 1) < 1e-9);
  const tilt = (Math.acos(north[2]) * 180) / Math.PI;
  assert.ok(tilt > 21 && tilt < 26, `tilt ${tilt}`);
});
