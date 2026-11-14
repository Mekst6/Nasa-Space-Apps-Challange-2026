// Rise/set times, visibility hours and traffic-light rating (PLAN.md section 6, "Fenster und Bewertung").
// All values use the apparent elevation (smooth horizon + horizon dip) of the disk center.
import { moonFixedDirections, siteSky } from './ephemeris.js';

export const THRESHOLDS = {
  green: 2, // > 2°: clearly above the horizon
  red: 0, // < 0°: below the horizon; 0..2° is grazing (yellow), uncertain in real terrain
};
export const LOOKAHEAD_DAYS = 30;
export const HOURS_WINDOW_DAYS = 14;

const MINUTE_MS = 60e3;
const HOUR_MS = 3600e3;

// Sun/Earth directions on a full-hour grid, shared by every site. Bounded so long playback
// sessions don't grow it forever.
const gridCache = new Map();
function gridDirections(hourIndex) {
  let dirs = gridCache.get(hourIndex);
  if (!dirs) {
    if (gridCache.size > 6000) gridCache.clear();
    dirs = moonFixedDirections(new Date(hourIndex * HOUR_MS));
    gridCache.set(hourIndex, dirs);
  }
  return dirs;
}

const elevationAt = (site, body, ms, dirs = moonFixedDirections(new Date(ms))) =>
  siteSky(site, new Date(ms), dirs)[body].apparentElevation;

export function rate(elevation) {
  if (elevation > THRESHOLDS.green) return 'green';
  if (elevation >= THRESHOLDS.red) return 'yellow';
  return 'red';
}

const RANK = { green: 0, yellow: 1, red: 2 };
export const worse = (a, b) => (RANK[a] >= RANK[b] ? a : b);

// Sample points from `startMs` on: the exact start, then every full hour.
function samples(site, body, startMs, hours) {
  const first = Math.ceil(startMs / HOUR_MS);
  const points = [{ ms: startMs, elev: elevationAt(site, body, startMs) }];
  for (let h = first; h <= first + hours; h++) {
    const ms = h * HOUR_MS;
    if (ms > startMs) points.push({ ms, elev: elevationAt(site, body, ms, gridDirections(h)) });
  }
  return points;
}

// Refine a sign change between a and b to one minute.
function bisect(site, body, a, b) {
  let lo = a.ms, hi = b.ms;
  const loAbove = a.elev > 0;
  while (hi - lo > MINUTE_MS) {
    const mid = (lo + hi) / 2;
    if ((elevationAt(site, body, mid) > 0) === loAbove) lo = mid; else hi = mid;
  }
  return new Date(hi);
}

function bodyWindows(site, body, startMs) {
  const points = samples(site, body, startMs, LOOKAHEAD_DAYS * 24);
  const now = points[0].elev;
  const above = now > 0;

  let next = null;
  for (let i = 1; i < points.length; i++) {
    if ((points[i].elev > 0) !== above) {
      next = { type: above ? 'set' : 'rise', at: bisect(site, body, points[i - 1], points[i]) };
      break;
    }
  }

  // Hours above the horizon in the next 14 days, linear interpolation inside each step.
  const endMs = startMs + HOURS_WINDOW_DAYS * 24 * HOUR_MS;
  let aboveMs = 0;
  for (let i = 1; i < points.length && points[i - 1].ms < endMs; i++) {
    const a = points[i - 1], b = points[i];
    const span = Math.min(b.ms, endMs) - a.ms;
    if (a.elev > 0 && b.elev > 0) aboveMs += span;
    else if (a.elev > 0 || b.elev > 0) {
      const crossing = a.elev / (a.elev - b.elev); // fraction of the step where it crosses 0
      const fractionAbove = a.elev > 0 ? crossing : 1 - crossing;
      aboveMs += span * fractionAbove;
    }
  }

  return {
    elevation: now,
    status: rate(now),
    next, // null: no rise/set within LOOKAHEAD_DAYS
    hoursAbove: aboveMs / HOUR_MS,
  };
}

// Full metrics for the sidebar. `date` is the current simulation time.
export function siteWindows(site, date) {
  const startMs = date.getTime();
  const sky = siteSky(site, date);
  const power = { ...bodyWindows(site, 'sun', startMs), azimuth: sky.sun.azimuth };
  const comms = { ...bodyWindows(site, 'earth', startMs), azimuth: sky.earth.azimuth };
  return { power, comms, overall: worse(power.status, comms.status), dip: sky.dip };
}

// Cheap rating for map markers: only the current elevations.
export function siteStatus(site, date, directions) {
  const sky = siteSky(site, date, directions);
  const power = rate(sky.sun.apparentElevation);
  const comms = rate(sky.earth.apparentElevation);
  return { power, comms, overall: worse(power, comms) };
}
