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
