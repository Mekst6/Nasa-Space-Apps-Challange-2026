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

// sun / earth: { elevation (geometric), azimuth }. horizon: terrain profile or null; dip: degrees.
export function horizonSvg({ sun, earth, horizon = null, dip = 0 }) {
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
      ${compass}
      ${body(earth, 'hz-earth', 'Earth')}
      ${body(sun, 'hz-sun', 'Sun')}
    </svg>`;
}
