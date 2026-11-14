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

**Limitation:** surrounding terrain (crater rims, mountains) is not modelled. Values are an
approximation for an unobstructed site, not a terrain analysis.

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
| Apollo 11 site coordinates | NASA NSSDCA (to be cross-checked in LROC Quickmap) |
| Reference ephemerides | NASA JPL Horizons (validation only) |

## Status

- [x] M1 — 3D moon with LRO texture, orbit controls, Apollo 11 test marker
- [x] M2 — Sun / Earth elevation and azimuth, verified against JPL Horizons
- [ ] M3 — Timeline and real sun lighting
- [ ] M4 — Landing sites and sidebar
- [ ] M5 — Comparison view

## Use of AI

Planning and code were developed with the help of Claude / Claude Code (Anthropic).
