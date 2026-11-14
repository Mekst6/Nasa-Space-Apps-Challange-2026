// Compare src/ephemeris.js against JPL Horizons (PLAN.md section 6, "Referenz").
// Usage: node scripts/horizons-check.mjs   (needs internet; not used by the web app because of CORS)
// Writes scripts/horizons-check-results.json and prints a summary table.
import { writeFileSync } from 'node:fs';
import { siteSky } from '../src/ephemeris.js';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// Test points for the comparison. These are not the app's site list (see src/sites.js).
const POINTS = [
  { name: 'Apollo 11 (near side, equator)', lat: 0.674, lon: 23.473 },
  { name: 'IM-1 area (south polar, 80° S)', lat: -80.13, lon: 1.44 },
  { name: "Chang'e 4 area (far side)", lat: -45.44, lon: 177.6 },
  { name: 'Near south pole (89.5° S)', lat: -89.5, lon: 0 },
];
const BODIES = [
  { name: 'Sun', command: '10', key: 'sun' },
  { name: 'Earth', command: '399', key: 'earth' },
];
// 5 epochs, 15 days apart, starting at the event date.
const START = '2026-11-14 00:00';
const STOP = '2027-01-13 00:00';
const STEP = '15 d';

async function queryHorizons(point, body) {
  const q = (v) => `'${v}'`; // Horizons expects quoted values
  const params = new URLSearchParams({
    format: 'json',
    COMMAND: q(body.command),
    OBJ_DATA: q('NO'),
    MAKE_EPHEM: q('YES'),
    EPHEM_TYPE: q('OBSERVER'),
    CENTER: q('coord@301'),
    COORD_TYPE: q('GEODETIC'),
    SITE_COORD: q(`${point.lon},${point.lat},0`),
    START_TIME: q(START),
    STOP_TIME: q(STOP),
    STEP_SIZE: q(STEP),
    TIME_TYPE: q('UT'),
    QUANTITIES: q('4'),
    ANG_FORMAT: q('DEG'),
    CSV_FORMAT: q('YES'),
    EXTRA_PREC: q('YES'),
  });
  const res = await fetch(`${API}?${params}`);
  if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
  const { result, error } = await res.json();
  if (error) throw new Error(`Horizons: ${error}`);

  const block = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block) throw new Error(`Unexpected Horizons output:\n${result.slice(0, 2000)}`);
  // CSV row: date, solar-presence flag, lunar-presence flag, azimuth, elevation, ...
  return block.trim().split('\n').map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    return { time: cols[0], azimuth: Number(cols[3]), elevation: Number(cols[4]) };
  });
}

function parseHorizonsTime(t) {
  // e.g. "2026-Nov-14 00:00:00.000"
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const [, y, mon, d, hh, mm, ss] = t.match(/(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2}):?([\d.]*)/);
  return new Date(Date.UTC(+y, months[mon], +d, +hh, +mm, Number(ss || 0)));
}

const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;

const rows = [];
for (const point of POINTS) {
  for (const body of BODIES) {
    const reference = await queryHorizons(point, body);
    for (const ref of reference) {
      const date = parseHorizonsTime(ref.time);
      const ours = siteSky(point, date)[body.key];
      rows.push({
        point: point.name, body: body.name, time: date.toISOString(),
        horizons: { elevation: ref.elevation, azimuth: ref.azimuth },
        ours: { elevation: ours.elevation, azimuth: ours.azimuth },
        dElevation: ours.elevation - ref.elevation,
        // Azimuth is ill-conditioned close to the pole and when the body is near the zenith.
        dAzimuth: Math.abs(point.lat) < 89 && Math.abs(ref.elevation) < 80
          ? angleDiff(ours.azimuth, ref.azimuth) : null,
      });
    }
  }
}

const maxAbs = (xs) => Math.max(...xs.filter((x) => x !== null).map(Math.abs));
for (const r of rows) {
  console.log(
    `${r.point.padEnd(32)} ${r.body.padEnd(5)} ${r.time.slice(0, 16)}  `
    + `elev H ${r.horizons.elevation.toFixed(3).padStart(8)} ours ${r.ours.elevation.toFixed(3).padStart(8)}  `
    + `Δelev ${r.dElevation.toFixed(4).padStart(8)}  Δaz ${r.dAzimuth === null ? '   n/a' : r.dAzimuth.toFixed(4).padStart(8)}`,
  );
}
const summary = {
  comparisons: rows.length,
  maxAbsElevationErrorDeg: maxAbs(rows.map((r) => r.dElevation)),
  maxAbsAzimuthErrorDeg: maxAbs(rows.map((r) => r.dAzimuth)),
  generated: new Date().toISOString(),
  horizons: { center: 'coord@301', coordType: 'GEODETIC', quantities: '4', timeType: 'UT' },
};
console.log('\nSummary:', summary);
writeFileSync(new URL('./horizons-check-results.json', import.meta.url), JSON.stringify({ summary, rows }, null, 2));
if (summary.maxAbsElevationErrorDeg >= 0.5) {
  console.error('FAIL: elevation error >= 0.5°');
  process.exit(1);
}
