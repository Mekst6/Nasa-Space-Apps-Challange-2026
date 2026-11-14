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
