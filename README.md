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
```

## Data sources

| Data | Source |
|---|---|
| Lunar color texture | NASA SVS CGI Moon Kit (https://svs.nasa.gov/4720), `lroc_color_poles_4k.tif`, based on LRO / LROC WAC data, converted to JPEG |
| Apollo 11 site coordinates | NASA NSSDCA (to be cross-checked in LROC Quickmap) |

## Status

- [x] M1 — 3D moon with LRO texture, orbit controls, Apollo 11 test marker
- [ ] M2 — Sun / Earth elevation and azimuth, verified against JPL Horizons
- [ ] M3 — Timeline and real sun lighting
- [ ] M4 — Landing sites and sidebar
- [ ] M5 — Comparison view

## Use of AI

Planning and code were developed with the help of Claude / Claude Code (Anthropic).
