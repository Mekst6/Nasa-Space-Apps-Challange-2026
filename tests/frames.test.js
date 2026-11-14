// Scene-frame checks for M3. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moonFixedDirections, directionToLatLon } from '../src/ephemeris.js';
import { fixedToScene, latLonToScene } from '../src/frames.js';

const DAY_MS = 864e5;

test('light direction and site markers use the same scene axes', () => {
  for (let day = 0; day < 60; day += 7) {
    const dirs = moonFixedDirections(new Date(Date.UTC(2026, 10, 1) + day * DAY_MS));
    const sub = directionToLatLon(dirs.sun);
    const a = fixedToScene(dirs.sun);
    const b = latLonToScene(sub.lat, sub.lon);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) < 1e-12);
  }
  // Texture/UV convention from M1: 0°/0° on +X, north on +Y, 90° E on -Z.
  const near = (v, expected) => v.every((x, i) => Math.abs(x - expected[i]) < 1e-12);
  assert.ok(near(latLonToScene(0, 0), [1, 0, 0]));
  assert.ok(near(latLonToScene(90, 0), [0, 1, 0]));
  assert.ok(near(latLonToScene(0, 90), [0, 0, -1]));
});

test('terminator sweeps once around the moon (westward) in one synodic month', () => {
  const start = Date.UTC(2026, 10, 14);
  const steps = 300;
  const span = 29.53 * DAY_MS;
  let prev = directionToLatLon(moonFixedDirections(new Date(start)).sun).lon;
  let total = 0;
  for (let i = 1; i <= steps; i++) {
    const lon = directionToLatLon(moonFixedDirections(new Date(start + (span * i) / steps)).sun).lon;
    total += ((lon - prev + 540) % 360) - 180;
    prev = lon;
  }
  // Libration lets the sub-solar longitude wobble a few degrees around the mean motion.
  assert.ok(Math.abs(total + 360) < 15, `sub-solar longitude moved ${total.toFixed(1)}°`);
});

test('terrain view frame: sun elevation/azimuth match the site-local sky', async () => {
  const { enuAxes, fixedToEnuScene, polarMapToLatLon, surfacePointM } = await import('../src/frames.js');
  const { horizontal } = await import('../src/ephemeris.js');
  for (const [lat, lon] of [[-89.684, -163.261], [-85.98111, 0.68028], [-85.40462, 31.70732]]) {
    const axes = enuAxes(lat, lon);
    const dirs = moonFixedDirections(new Date('2026-11-14T19:28:00Z'));
    const [e, u, mn] = fixedToEnuScene(dirs.sun, axes);
    const h = horizontal(dirs.sun, lat, lon);
    assert.ok(Math.abs((Math.asin(u) * 180) / Math.PI - h.elevation) < 1e-9);
    let az = (Math.atan2(e, -mn) * 180) / Math.PI;
    if (az < 0) az += 360;
    assert.ok(Math.abs(az - h.azimuth) < 1e-9);

    // The site itself is the origin of the frame and lies at height 0 in "up".
    const site = surfacePointM(lat, lon, 0);
    const up = fixedToEnuScene(site, axes)[1];
    assert.ok(Math.abs(up - 1737400) < 1e-6);
  }
  // Map round trip at a known point: x = rho·sin(lon), y = rho·cos(lon).
  const p = polarMapToLatLon(-2760, -9176);
  assert.ok(Math.abs(p.lat + 89.684) < 1e-3 && Math.abs(p.lon + 163.26) < 0.02, JSON.stringify(p));
});
