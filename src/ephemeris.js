// Sun and Earth relative to the local horizon of a point on the Moon.
// Method: PLAN.md section 6. All positions come from astronomy-engine (J2000 equatorial, EQJ);
// the lunar body-fixed frame comes from the IAU rotation model (RotationAxis).
import { Body, GeoMoon, GeoVector, RotationAxis, MakeTime, KM_PER_AU, SiderealTime } from 'astronomy-engine';

export const MOON_RADIUS_KM = 1737.4;

const DEG = Math.PI / 180;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (a) => {
  const len = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / len, a[1] / len, a[2] / len];
};
const vec = (v) => [v.x, v.y, v.z];

// Body-fixed axes of the Moon in EQJ at the given time.
// x points to (0° N, 0° E), z to the north pole, y = z × x (90° E).
export function moonFrame(time) {
  const axis = RotationAxis(Body.Moon, time);
  const z = vec(axis.north);
  const raDeg = axis.ra * 15; // astronomy-engine returns ra in sidereal hours
  const node = [Math.cos((raDeg + 90) * DEG), Math.sin((raDeg + 90) * DEG), 0];
  const w = axis.spin * DEG;
  const zxNode = cross(z, node);
  const x = normalize([
    node[0] * Math.cos(w) + zxNode[0] * Math.sin(w),
    node[1] * Math.cos(w) + zxNode[1] * Math.sin(w),
    node[2] * Math.cos(w) + zxNode[2] * Math.sin(w),
  ]);
  const y = cross(z, x);
  return { x, y, z };
}

// Sun and Earth seen from the Moon's center, in the lunar body-fixed frame:
// `sun` / `earth` are unit directions (sub-solar / sub-Earth point, scene lighting),
// `sunKm` / `earthKm` the full vectors, needed for the topocentric view of a site.
export function moonFixedDirections(date) {
  const time = MakeTime(date);
  const moon = vec(GeoMoon(time));
  const sun = vec(GeoVector(Body.Sun, time, true));
  const { x, y, z } = moonFrame(time);
  const toFixedKm = (v) => [dot(v, x) * KM_PER_AU, dot(v, y) * KM_PER_AU, dot(v, z) * KM_PER_AU];
  const sunKm = toFixedKm([sun[0] - moon[0], sun[1] - moon[1], sun[2] - moon[2]]);
  const earthKm = toFixedKm([-moon[0], -moon[1], -moon[2]]);
  return { sun: normalize(sunKm), earth: normalize(earthKm), sunKm, earthKm };
}

// Direction from a point on the surface (not the Moon's center) to a body. For the Earth this
// parallax is up to ~0.26° near the horizon; for the Sun it is negligible but handled the same way.
function topocentric(targetKm, latDeg, lonDeg, heightKm) {
  const r = MOON_RADIUS_KM + heightKm;
  const lat = latDeg * DEG, lon = lonDeg * DEG;
  return normalize([
    targetKm[0] - r * Math.cos(lat) * Math.cos(lon),
    targetKm[1] - r * Math.cos(lat) * Math.sin(lon),
    targetKm[2] - r * Math.sin(lat),
  ]);
}

// Selenographic latitude/longitude (degrees, east positive, -180..180) of a body-fixed direction,
// e.g. the sub-solar or sub-Earth point.
export function directionToLatLon(d) {
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, d[2]))) / DEG,
    lon: Math.atan2(d[1], d[0]) / DEG,
  };
}

// Depression of the apparent horizon for an observer h km above the reference sphere.
export function horizonDip(heightKm) {
  if (!(heightKm > 0)) return 0;
  return Math.acos(MOON_RADIUS_KM / (MOON_RADIUS_KM + heightKm)) / DEG;
}

// Geometric elevation and azimuth (degrees; azimuth 0 = north, 90 = east) of a body-fixed
// direction, seen from a site. At the poles the local "north" is taken along the meridian
// of the given longitude, so azimuth there is relative to that meridian.
export function horizontal(d, latDeg, lonDeg) {
  const sinLat = Math.sin(latDeg * DEG), cosLat = Math.cos(latDeg * DEG);
  const sinLon = Math.sin(lonDeg * DEG), cosLon = Math.cos(lonDeg * DEG);
  const up = [cosLat * cosLon, cosLat * sinLon, sinLat];
  const east = [-sinLon, cosLon, 0];
  const north = [-sinLat * cosLon, -sinLat * sinLon, cosLat];
  const elevation = Math.asin(Math.max(-1, Math.min(1, dot(d, up)))) / DEG;
  let azimuth = Math.atan2(dot(d, east), dot(d, north)) / DEG;
  if (azimuth < 0) azimuth += 360;
  return { elevation, azimuth };
}

// Elevation of the terrain horizon (degrees) in a given azimuth, linearly interpolated.
// profile = { azimuthStepDeg, anglesDeg } as produced by scripts/build-terrain.mjs.
export function horizonAt(profile, azimuth) {
  const { azimuthStepDeg: step, anglesDeg: angles } = profile;
  const pos = (((azimuth % 360) + 360) % 360) / step;
  const i = Math.floor(pos) % angles.length;
  const f = pos - Math.floor(pos);
  return angles[i] * (1 - f) + angles[(i + 1) % angles.length] * f;
}

// Sun and Earth as seen from one site. `elevation` is geometric (smooth sphere),
// `apparentElevation` is relative to the horizon actually seen from the site:
//   - with a terrain profile (site.horizon): elevation minus the terrain horizon in that azimuth,
//   - otherwise: elevation plus the horizon dip of the site's height.
export function siteSky({ lat, lon, heightKm = 0, horizon = null }, date, directions = moonFixedDirections(date)) {
  const dip = horizonDip(heightKm);
  const look = (targetKm) => {
    const h = horizontal(topocentric(targetKm, lat, lon, heightKm), lat, lon);
    const horizonElevation = horizon ? horizonAt(horizon, h.azimuth) : -dip;
    return { ...h, horizonElevation, apparentElevation: h.elevation - horizonElevation };
  };
  return { sun: look(directions.sunKm), earth: look(directions.earthKm), dip };
}

// ---- The Earth as seen from the Moon ----

// Fraction of the Earth's disk that is sunlit, seen from the Moon (0 = "new Earth", 1 = "full Earth").
// It is roughly the opposite of the Moon's phase seen from the Earth.
export function earthLitFraction(directions) {
  const { sunKm, earthKm } = directions;
  const toSun = [sunKm[0] - earthKm[0], sunKm[1] - earthKm[1], sunKm[2] - earthKm[2]];
  const toMoon = [-earthKm[0], -earthKm[1], -earthKm[2]];
  const cosPhase = dot(normalize(toSun), normalize(toMoon));
  return (1 + cosPhase) / 2;
}

export function earthPhase(date) {
  const fraction = earthLitFraction(moonFixedDirections(date));
  const later = earthLitFraction(moonFixedDirections(new Date(date.getTime() + 3600e3)));
  const waxing = later > fraction;
  let name;
  if (fraction < 0.03) name = 'new Earth';
  else if (fraction > 0.97) name = 'full Earth';
  else if (Math.abs(fraction - 0.5) < 0.06) name = waxing ? 'first quarter' : 'last quarter';
  else name = `${waxing ? 'waxing' : 'waning'} ${fraction < 0.5 ? 'crescent' : 'gibbous'}`;
  return { fraction, waxing, name };
}

// Earth's north pole and the direction of the Greenwich meridian (0° longitude on the equator),
// in the lunar body-fixed frame. Uses the J2000 equator and apparent sidereal time; the
// precession since 2000 (~0.4°) is ignored, which is fine for drawing the globe.
export function earthOrientation(date) {
  const time = MakeTime(date);
  const theta = SiderealTime(time) * 15 * DEG;
  const north = [0, 0, 1];
  const greenwich = [Math.cos(theta), Math.sin(theta), 0];
  const { x, y, z } = moonFrame(time);
  const toFixed = (v) => [dot(v, x), dot(v, y), dot(v, z)];
  return { north: toFixed(north), greenwich: toFixed(greenwich) };
}
