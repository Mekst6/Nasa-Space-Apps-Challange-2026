// "Look around" strip: azimuth left to right (N E S W N), elevation up/down on an asinh scale
// so the few degrees that matter near the poles stay readable next to a high Earth.
import { THRESHOLDS } from '../windows.js';

const W = 300, H = 160;
const PAD = { left: 30, right: 8, top: 8, bottom: 18 };
const MAX = 90;
const scale = (e) => Math.asinh(Math.max(-MAX, Math.min(MAX, e)) / 0.5);
const yOf = (e) => {
  const top = scale(MAX), bottom = scale(-MAX);
  return PAD.top + ((top - scale(e)) / (top - bottom)) * (H - PAD.top - PAD.bottom);
};
const xOf = (az) => PAD.left + (az / 360) * (W - PAD.left - PAD.right);

// Horizon line: terrain profile if available, otherwise the flat horizon lowered by the dip.
function skyline(horizon, dip, offset) {
  if (!horizon) return [[0, -dip + offset], [360, -dip + offset]];
  const { azimuthStepDeg: step, anglesDeg: a } = horizon;
  return [...a.map((v, i) => [i * step, v + offset]), [360, a[0] + offset]];
}
const ridgeLine = (horizon, dip) =>
  skyline(horizon, dip, 0).map(([az, e], i) => `${i ? 'L' : 'M'}${xOf(az).toFixed(1)},${yOf(e).toFixed(1)}`).join('');
// Filled area below the skyline (+ offset), down to the bottom of the chart.
const ridge = (horizon, dip, offset) =>
  `${skyline(horizon, dip, offset).map(([az, e], i) => `${i ? 'L' : 'M'}${xOf(az).toFixed(1)},${yOf(e).toFixed(1)}`).join('')}`
  + `L${xOf(360)},${yOf(-MAX)}L${xOf(0)},${yOf(-MAX)}Z`;

// Path over the coming days as polylines. Only the part that matters is drawn: from 10° below the
// horizon upward. Lines break where the azimuth jumps (wrap at 360°, or the fast swing near the
// zenith at low latitudes). Dots mark every day; for the Sun every 7th day gets a label.
const TRAIL_MIN_ELEVATION = -10;
const MAX_AZIMUTH_STEP = 30; // degrees between consecutive samples before the line breaks
function trail(points, stepHours, cls, labelWeeks) {
  if (!points?.length) return '';
  const perDay = Math.round(24 / stepHours);
  const visible = (p) => p.elevation >= TRAIL_MIN_ELEVATION;
  const segments = [];
  let current = [];
  points.forEach((p, i) => {
    const jump = i > 0 && Math.abs(p.azimuth - points[i - 1].azimuth) > MAX_AZIMUTH_STEP;
    if (!visible(p) || jump) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (visible(p)) current.push(p);
  });
  if (current.length) segments.push(current);
  const path = segments.filter((seg) => seg.length > 1)
    .map((seg) => seg.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.azimuth).toFixed(1)},${yOf(p.elevation).toFixed(1)}`).join(''))
    .join('');
  const dots = points.map((p, i) => ({ p, day: i / perDay }))
    .filter(({ p, day }) => day > 0 && Number.isInteger(day) && visible(p))
    .map(({ p, day }) => {
      const week = labelWeeks && day % 7 === 0;
      const x = xOf(p.azimuth).toFixed(1), y = yOf(p.elevation);
      return `<circle cx="${x}" cy="${y.toFixed(1)}" r="${week ? 2.2 : 1.3}" />`
        + (week ? `<text x="${x}" y="${Math.max(9, y - 4).toFixed(1)}" text-anchor="middle">${day}d</text>` : '');
    }).join('');
  return `<g class="hz-trail ${cls}"><path d="${path}" />${dots}</g>`;
}

// sun / earth: { elevation (geometric), azimuth }. horizon: terrain profile or null; dip: degrees.
// track: optional skyTrack() result, drawn as the path over the coming days.
export function horizonSvg({ sun, earth, horizon = null, dip = 0, track = null }) {
  const ticks = [90, 10, 2, 0, -2, -10, -90];
  const tickLines = ticks.map((t) => `
    <line x1="${PAD.left}" x2="${W - PAD.right}" y1="${yOf(t)}" y2="${yOf(t)}" class="hz-grid${t === 0 ? ' hz-zero' : ''}" />
    <text x="${PAD.left - 4}" y="${yOf(t) + 3}" class="hz-tick" text-anchor="end">${t}°</text>`).join('');
  const compass = ['N', 'E', 'S', 'W', 'N'].map((label, i) =>
    `<text x="${xOf(i * 90)}" y="${H - 4}" class="hz-tick" text-anchor="middle">${label}</text>`).join('');
  const body = (b, cls, label) => `
    <g class="${cls}">
      <circle cx="${xOf(b.azimuth)}" cy="${yOf(b.elevation)}" r="6" />
      <text x="${xOf(b.azimuth) + (b.azimuth > 300 ? -9 : 9)}" y="${yOf(b.elevation) + 4}"
        text-anchor="${b.azimuth > 300 ? 'end' : 'start'}">${label}</text>
    </g>`;
  return `
    <svg viewBox="0 0 ${W} ${H}" class="horizon-svg" role="img"
      aria-label="Sun at ${sun.elevation.toFixed(1)}° and Earth at ${earth.elevation.toFixed(1)}° elevation">
      ${tickLines}
      <path d="${ridge(horizon, dip, THRESHOLDS.green)}" class="hz-grazing" />
      <path d="${ridge(horizon, dip, 0)}" class="hz-ground" />
      <path d="${ridgeLine(horizon, dip)}" class="hz-skyline" />
      ${track ? trail(track.earth, track.stepHours, 'hz-trail-earth', false) : ''}
      ${track ? trail(track.sun, track.stepHours, 'hz-trail-sun', true) : ''}
      ${compass}
      ${body(earth, 'hz-earth', 'Earth')}
      ${body(sun, 'hz-sun', 'Sun')}
    </svg>`;
}
