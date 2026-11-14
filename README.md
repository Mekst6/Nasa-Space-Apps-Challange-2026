# Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 — challenge "Lunar Landing Site Navigator".

A browser tool to quickly compare lunar landing sites and dates: where are the Sun
(power) and the Earth (direct-to-Earth communication) relative to the local horizon,
and for how much longer?

> Work in progress. See `PLAN.md` (German) for the full plan and milestones.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm test         # plausibility tests (node:test, no extra dependencies)
node scripts/horizons-check.mjs   # compare against JPL Horizons (needs internet)
```

## How the geometry is computed

For a site at latitude φ, longitude λ (east positive) and height h, at time t (UTC):

1. Geocentric positions of the Moon and the Sun from
   [astronomy-engine](https://github.com/cosinekitty/astronomy) (J2000 equatorial frame).
2. The Moon's body-fixed frame (north pole, prime meridian) from the IAU 2015 rotation model
   (`RotationAxis`), which includes physical libration.
3. Sun and Earth vectors are transformed into that frame and taken **from the site itself**
   (topocentric), not from the Moon's center. For the Earth this parallax is up to ~0.26°
   near the horizon — exactly where it matters at the south pole.
4. Elevation and azimuth (0° = north, 90° = east) against the local horizon of a smooth sphere
   (R = 1737.4 km). An optional site height adds the horizon dip, `acos(R / (R + h))`.

**Limitation:** for most sites, surrounding terrain (crater rims, mountains) is not modelled.
Values are an approximation for an unobstructed site, not a terrain analysis.

### Real terrain at eleven south-pole sites

Eleven sites (marked **3D** in the app) use NASA's
[LOLA 5 m/px south pole elevation models](https://pgda.gsfc.nasa.gov/products/78):

| Site | DEM tile | Area | Site point |
|---|---|---|---|
| Shackleton rim (Shackleton–de Gerlache ridge) | Site04 | 16 × 16 km | LROC coordinates, 1727 m |
| Peak near Shackleton | Site07 | 16 × 16 km | highest point within 4 km of tile center, 1649 m |
| Connecting ridge | Site01 | 16 × 16 km | highest point within 4 km of tile center, 1960 m |
| Connecting ridge extension | SL3 | 20 × 20 km | highest point within 4 km of tile center, 1557 m |
| de Gerlache rim | Site11 | 16 × 16 km | highest point within 4 km of tile center, 1816 m |
| Haworth | Haworth | 30 × 30 km | highest point within 4 km of tile center, 1908 m |
| Malapert massif | Site23 | 21 × 21 km | highest point within 4 km of tile center, 5106 m |
| Leibnitz β plateau (Mons Mouton) | Site20v2 | 26 × 26 km | highest point within 4 km of tile center, 6464 m |
| Nobile rim 1 | Site06 | 20 × 20 km | highest point within 4 km of tile center, 6740 m |
| Nobile rim 2 | DM2 | 20 × 20 km | highest point within 4 km of tile center, 1470 m |
| Amundsen rim | DM1 | 20 × 20 km | highest point within 4 km of tile center, 678 m |

The candidate regions (NASA Artemis III candidate landing regions) have no official landing point,
so we use the highest terrain near the tile center and say so in the app.

- **Horizon profile:** for every 0.5° of azimuth we trace the terrain outward from the site
  (observer 2 m above ground, exact spherical geometry) and keep the highest elevation angle.
  Rise/set times, traffic lights and the comparison use this real skyline instead of a flat horizon.
  Terrain beyond the DEM edge (~6–25 km away) is not included.
- **3D terrain view:** the DEM resampled to 512 × 512 cells (31–51 m), placed exactly on the sphere
  in the site's local frame, with real-time sun shadows for the selected time (no vertical exaggeration).

Regenerate the data (the DEMs, 41–108 MB each, are not part of the repository):

```bash
B=https://pgda.gsfc.nasa.gov/data/LOLA_5mpp
curl -o /tmp/Site04.tif $B/Site04/Site04_final_adj_5mpp_surf.tif
node scripts/build-terrain.mjs /tmp/Site04.tif shackleton -89.684 -163.261 512
# candidate regions: same download for Site07, Site01, SL3, Site11, Haworth, Site23, Site20v2, Site06, DM2, DM1, then e.g.
node scripts/build-terrain.mjs /tmp/Site07.tif peak-near-shackleton auto 512
```

## Shareable links

The URL always reflects what you see: site (or custom point), time and open view, e.g.
`#site=shackleton&t=2026-11-23T20:00Z&view=terrain` or
`#site=im2&t=2026-12-01T06:00Z&view=compare&b=malapert-massif`.
Opening such a link restores that state; the **Share 🔗** button copies it.

## Sky around the site

The sidebar's horizon chart shows the site's skyline (terrain or smooth), the current Sun and Earth,
and their paths over the next 30 days (one dot per day, labels every 7 days). At the south pole the
Sun visibly circles the whole horizon once per lunar day and dips behind terrain; the Earth wobbles
in a small loop (libration).

## Best sites (ranking)

"Best sites ★" ranks every site for the 30 days from the selected time: share of time with Sun and
Earth both above 2° ("Good", same rule as the traffic lights), sunlight, Earth visibility and the
longest stretch of darkness. It follows the timeline live while playing. Columns are sortable, a south-pole filter is available, and clicking a
row selects the site.

## "When does everything fit?"

For the selected site the app searches up to 365 days ahead (hourly, refined to the minute) for the
next window in which **both** the Sun and the Earth are more than 2° above the site's horizon
(terrain skyline where available), shows when it opens and how long it lasts, and can jump the
timeline there. If there is none, it says why (e.g. the Earth never rises on the far side) and
falls back to the next window in which both are at least above the horizon.

## Accuracy check against JPL Horizons

`scripts/horizons-check.mjs` queries the [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
with an observer on the lunar surface (`CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`,
`QUANTITIES='4'`) and compares apparent elevation and azimuth of the Sun and the Earth.

Result (run on 2026-11-14): **40 comparisons** — 4 sites (Apollo 11, 80° S, far side, 89.5° S)
× 5 epochs (2026-11-14 to 2027-01-13, every 15 days) × Sun and Earth:

| | max. absolute difference |
|---|---|
| Elevation | **0.004°** |
| Azimuth (sites below 89° latitude) | **0.004°** |

Full table: `scripts/horizons-check-results.json`.

## Data sources

| Data | Source |
|---|---|
| Lunar color texture | NASA SVS CGI Moon Kit (https://svs.nasa.gov/4720), `lroc_color_poles_4k.tif`, based on LRO / LROC WAC data, converted to JPEG |
| Landing site coordinates | NASA NSSDCA (Apollo 11–17, LRO-based), LROC (ASU) and Wikipedia — one source per site in `src/sites.js` |
| Reference ephemerides | NASA JPL Horizons (validation only) |
| Terrain, 11 south-pole sites | NASA GSFC PGDA, High-Resolution LOLA Topography for Lunar South Pole Sites (5 m/px) |

## Status

- [x] M1 — 3D moon with LRO texture, orbit controls, Apollo 11 test marker
- [x] M2 — Sun / Earth elevation and azimuth, verified against JPL Horizons
- [x] M3 — Timeline and real sun lighting
- [x] M4 — Landing sites and sidebar
- [x] M5 — Comparison view
- [x] M6 (extra) — Real terrain horizon and 3D terrain view for eleven south-pole sites

## Use of AI

Planning and code were developed with the help of Claude / Claude Code (Anthropic).
