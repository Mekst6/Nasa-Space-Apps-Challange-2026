// Conversions between the lunar body-fixed frame used in ephemeris.js and the three.js scene.
// Body-fixed: x -> (0° N, 0° E), y -> (0° N, 90° E), z -> north pole.
// Scene (matches SphereGeometry UVs with a texture centered on 0° longitude):
// +X -> (0°, 0°), +Y -> north pole, -Z -> (0°, 90° E).
const DEG = Math.PI / 180;

export function fixedToScene([x, y, z]) {
  return [x, z, -y];
}

export function latLonToScene(latDeg, lonDeg, radius = 1) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return fixedToScene([
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
  ]);
}

// Scene point (any radius) -> selenographic latitude/longitude in degrees.
export function sceneToLatLon([sx, sy, sz]) {
  const r = Math.hypot(sx, sy, sz);
  return {
    lat: Math.asin(sy / r) / DEG,
    lon: Math.atan2(-sz, sx) / DEG,
  };
}

// ---- Local frame at a surface site (used by the terrain view) ----
// Body-fixed unit vectors pointing east, north and up at (lat, lon).
export function enuAxes(latDeg, lonDeg) {
  const sl = Math.sin(latDeg * DEG), cl = Math.cos(latDeg * DEG);
  const so = Math.sin(lonDeg * DEG), co = Math.cos(lonDeg * DEG);
  return { east: [-so, co, 0], north: [-sl * co, -sl * so, cl], up: [cl * co, cl * so, sl] };
}

// Body-fixed vector -> terrain scene axes (X = east, Y = up, Z = -north).
export function fixedToEnuScene(v, { east, north, up }) {
  const d = (a) => v[0] * a[0] + v[1] * a[1] + v[2] * a[2];
  return [d(east), d(up), -d(north)];
}

// South polar stereographic map coordinates (sphere R = 1737.4 km, x = rho·sin(lon), y = rho·cos(lon))
// -> latitude/longitude, as used by the LOLA polar DEMs.
const R_M = 1737400;
export function polarMapToLatLon(x, y) {
  return { lat: -90 + (2 * Math.atan(Math.hypot(x, y) / (2 * R_M))) / DEG, lon: Math.atan2(x, y) / DEG };
}

// Surface point (lat, lon, height above the 1737.4 km sphere in m) -> body-fixed meters.
export function surfacePointM(latDeg, lonDeg, heightM) {
  const r = R_M + heightM;
  const lat = latDeg * DEG, lon = lonDeg * DEG;
  return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
}
