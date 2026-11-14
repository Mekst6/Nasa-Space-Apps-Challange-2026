// Turns a LOLA 5 m/px south-polar DEM (NASA GSFC PGDA, product 78) into
//   public/terrain/<name>-heights.bin  Int16 heights (m), N x N, row 0 = top (max map y)
//   public/terrain/<name>.json         extent, site position, horizon profile, sources
// The DEM itself is not committed (41 MB). Download it first, e.g.:
//   curl -o /tmp/Site04_surf.tif https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site04/Site04_final_adj_5mpp_surf.tif
// Usage:
//   node scripts/build-terrain.mjs <dem.tif> <name> <lat> <lon> [N=512]
//   node scripts/build-terrain.mjs <dem.tif> <name> auto [N=512]
// "auto" picks the highest DEM point within 4 km of the tile center (candidate regions have no
// official landing point; high ground is where light and Earth visibility are best).
// Map coordinates: south polar stereographic, sphere R = 1737.4 km, x = rho·sin(lon), y = rho·cos(lon)
// (checked against the DEM: the Shackleton floor and rim land where they should).
import { fromFile } from 'geotiff';
import { writeFileSync, mkdirSync } from 'node:fs';

const R = 1737400;
const DEG = Math.PI / 180;
const OBSERVER_HEIGHT_M = 2; // solar panels / antenna roughly 2 m above the ground
const AZ_STEP = 0.5; // degrees
const RAY_STEP_M = 10;

const [, , demPath, name, ...rest] = process.argv;
const auto = rest[0] === 'auto';
if (!demPath || !name || (!auto && rest.length < 2)) {
  console.error('Usage: node scripts/build-terrain.mjs <dem.tif> <name> (<lat> <lon> | auto) [N]');
  process.exit(1);
}
const N = Number((auto ? rest[1] : rest[2]) ?? 512);
const AUTO_RADIUS_M = 4000;

const image = await (await fromFile(demPath)).getImage();
const W = image.getWidth(), H = image.getHeight();
const [res] = image.getResolution();
const [ox, oy] = image.getOrigin(); // top-left corner, map meters
const [dem] = await image.readRasters({ interleave: false });
const keys = image.getGeoKeys();
if (keys.ProjNatOriginLatGeoKey !== -90 || keys.GeogSemiMajorAxisGeoKey !== R) {
  throw new Error('Expected a south polar stereographic DEM on the 1737.4 km sphere');
}

const toMap = (lat, lon) => {
  const rho = 2 * R * Math.tan(((90 + lat) / 2) * DEG);
  return [rho * Math.sin(lon * DEG), rho * Math.cos(lon * DEG)];
};
const fromMap = (x, y) => {
  const rho = Math.hypot(x, y);
  return { lat: -90 + (2 * Math.atan(rho / (2 * R))) / DEG, lon: Math.atan2(x, y) / DEG };
};

// Bilinear height at map coordinates, null outside the DEM.
function heightAt(x, y) {
  const c = (x - ox) / res - 0.5, r = (oy - y) / res - 0.5;
  if (c < 0 || r < 0 || c > W - 1 || r > H - 1) return null;
  const c0 = Math.floor(c), r0 = Math.floor(r);
  const c1 = Math.min(c0 + 1, W - 1), r1 = Math.min(r0 + 1, H - 1);
  const fc = c - c0, fr = r - r0;
  const v = (rr, cc) => dem[rr * W + cc];
  return (v(r0, c0) * (1 - fc) + v(r0, c1) * fc) * (1 - fr) + (v(r1, c0) * (1 - fc) + v(r1, c1) * fc) * fr;
}

let siteLat, siteLon, siteChoice;
if (auto) {
  const cx = ox + (W * res) / 2, cy = oy - (H * res) / 2;
  let best = -Infinity, bx = cx, by = cy;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const x = ox + (c + 0.5) * res, y = oy - (r + 0.5) * res;
      if (Math.hypot(x - cx, y - cy) > AUTO_RADIUS_M) continue;
      const z = dem[r * W + c];
      if (z > best) { best = z; bx = x; by = y; }
    }
  }
  ({ lat: siteLat, lon: siteLon } = fromMap(bx, by));
  siteChoice = `highest point within ${AUTO_RADIUS_M / 1000} km of the DEM tile center`;
} else {
  siteLat = Number(rest[0]);
  siteLon = Number(rest[1]);
  siteChoice = 'given coordinates';
}

// ---- 1. Downsampled height grid (box filter) ----
const extent = [ox, oy - H * res, ox + W * res, oy]; // [xmin, ymin, xmax, ymax]
const heights = new Int16Array(N * N);
const block = W / N; // assumes a square DEM (true for the PGDA tiles)
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    let sum = 0, n = 0;
    for (let r = Math.floor(j * block); r < Math.min(H, Math.ceil((j + 1) * block)); r++) {
      for (let c = Math.floor(i * block); c < Math.min(W, Math.ceil((i + 1) * block)); c++) {
        sum += dem[r * W + c];
        n++;
      }
    }
    heights[j * N + i] = Math.round(sum / n);
  }
}

// ---- 2. Horizon profile at the site ----
// Local frame at the site in body-fixed coordinates (x -> 0°/0°, y -> 90° E, z -> north),
// same axes and azimuth convention (0 = north, 90 = east) as src/ephemeris.js.
const sl = Math.sin(siteLat * DEG), cl = Math.cos(siteLat * DEG);
const so = Math.sin(siteLon * DEG), co = Math.cos(siteLon * DEG);
const up = [cl * co, cl * so, sl];
const east = [-so, co, 0];
const north = [-sl * co, -sl * so, cl];
const [sx, sy] = toMap(siteLat, siteLon);
const ground = heightAt(sx, sy);
if (ground === null) throw new Error('Site is outside the DEM');
const h0 = ground + OBSERVER_HEIGHT_M;
const smoothDip = -Math.acos(R / (R + h0)) / DEG; // horizon of a bare sphere beyond the DEM

const angles = [], reach = [];
for (let az = 0; az < 360; az += AZ_STEP) {
  const u = [0, 1, 2].map((k) => north[k] * Math.cos(az * DEG) + east[k] * Math.sin(az * DEG));
  let best = -90, d = RAY_STEP_M;
  for (; ; d += RAY_STEP_M) {
    const a = d / R;
    const dir = [0, 1, 2].map((k) => up[k] * Math.cos(a) + u[k] * Math.sin(a));
    const lat = Math.asin(dir[2]) / DEG, lon = Math.atan2(dir[1], dir[0]) / DEG;
    const [mx, my] = toMap(lat, lon);
    const z = heightAt(mx, my);
    if (z === null) break;
    // Exact angle above the local horizontal: point on the sphere of radius R + z, seen from R + h0.
    const pUp = (R + z) * Math.cos(a) - (R + h0);
    const pAlong = (R + z) * Math.sin(a);
    best = Math.max(best, Math.atan2(pUp, pAlong) / DEG);
  }
  angles.push(+Math.max(best, smoothDip).toFixed(3));
  reach.push(Math.round(d - RAY_STEP_M));
}

// ---- 3. Write ----
mkdirSync('public/terrain', { recursive: true });
writeFileSync(`public/terrain/${name}-heights.bin`, Buffer.from(heights.buffer));
const meta = {
  name,
  source: 'NASA GSFC PGDA, High-Resolution LOLA Topography for Lunar South Pole Sites (5 m/px), M. K. Barker',
  sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
  demFile: demPath.split('/').pop(),
  projection: 'south polar stereographic, sphere R = 1737.4 km, x = rho·sin(lon), y = rho·cos(lon)',
  heightReference: 'meters relative to the 1737.4 km sphere',
  grid: { n: N, extent, cellM: (extent[2] - extent[0]) / N, file: `${name}-heights.bin`, rowOrder: 'top (max y) first' },
  site: {
    lat: +siteLat.toFixed(5), lon: +siteLon.toFixed(5), x: sx, y: sy,
    groundM: +ground.toFixed(1), observerHeightM: OBSERVER_HEIGHT_M, choice: siteChoice,
  },
  horizon: {
    azimuthStepDeg: AZ_STEP,
    anglesDeg: angles,
    rayReachM: reach,
    note: 'Max elevation angle of terrain inside the DEM; never below the bare-sphere horizon (dip) of the observer height.',
  },
};
writeFileSync(`public/terrain/${name}.json`, JSON.stringify(meta));
const min = Math.min(...angles), max = Math.max(...angles);
console.log(`${name}: ground ${ground.toFixed(0)} m, horizon ${min.toFixed(2)}° .. ${max.toFixed(2)}°, sphere dip ${smoothDip.toFixed(2)}°, reach ${Math.min(...reach)}–${Math.max(...reach)} m`);
console.log('site map position', sx.toFixed(0), sy.toFixed(0), '| check fromMap', JSON.stringify(fromMap(sx, sy)));
