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

export function horizonSvg({ sun, earth }) {
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
      <rect x="${PAD.left}" y="${yOf(0)}" width="${W - PAD.left - PAD.right}" height="${yOf(-MAX) - yOf(0)}" class="hz-ground" />
      <rect x="${PAD.left}" y="${yOf(THRESHOLDS.green)}" width="${W - PAD.left - PAD.right}"
        height="${yOf(0) - yOf(THRESHOLDS.green)}" class="hz-grazing" />
      ${tickLines}
      ${compass}
      ${body(earth, 'hz-earth', 'Earth')}
      ${body(sun, 'hz-sun', 'Sun')}
    </svg>`;
}
