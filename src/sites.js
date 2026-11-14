// Landing sites. Latitude north positive, longitude east positive (-180..180), degrees.
// heightKm: elevation relative to the 1737.4 km reference sphere; only set where a source gives it.
// Heights drive the horizon dip (PLAN.md section 6), so missing south-pole heights mean the
// smooth-sphere horizon is used there. Look them up in LROC Quickmap (LOLA) and fill them in.
// `terrain` names a preprocessed DEM in public/terrain/; its horizon profile then replaces the dip.
export const CATEGORIES = ['Apollo', 'CLPS', 'International', 'Candidate'];

export const SITES = [
  {
    id: 'apollo11', name: 'Mare Tranquillitatis', mission: 'Apollo 11', year: 1969,
    lat: 0.67416, lon: 23.47314, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo12', name: 'Oceanus Procellarum', mission: 'Apollo 12', year: 1969,
    lat: -3.0128, lon: -23.4219, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo14', name: 'Fra Mauro', mission: 'Apollo 14', year: 1971,
    lat: -3.64589, lon: -17.47194, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo15', name: 'Hadley-Apennine', mission: 'Apollo 15', year: 1971,
    lat: 26.13239, lon: 3.6333, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo16', name: 'Descartes Highlands', mission: 'Apollo 16', year: 1972,
    lat: -8.9734, lon: 15.5011, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo17', name: 'Taurus-Littrow', mission: 'Apollo 17', year: 1972,
    lat: 20.1911, lon: 30.7723, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (LM; Mean Earth/Polar Axis, from LRO images)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'blueghost1', name: 'Mare Crisium (Mons Latreille)', mission: 'Blue Ghost M1', year: 2025,
    lat: 18.56, lon: 61.81, heightKm: null, category: 'CLPS', southPole: false,
    source: 'LROC, Firefly Blue Ghost Landing Region',
    sourceUrl: 'https://www.lroc.asu.edu/images/1400',
  },
  {
    id: 'im1', name: 'Malapert A', mission: 'IM-1 Odysseus', year: 2024,
    lat: -80.13, lon: 1.44, heightKm: null, category: 'CLPS', southPole: true,
    source: 'Wikipedia, IM-1 (to be cross-checked in LROC Quickmap)',
    sourceUrl: 'https://en.wikipedia.org/wiki/IM-1',
  },
  {
    id: 'im2', name: 'Mons Mouton', mission: 'IM-2 Athena', year: 2025,
    lat: -84.7906, lon: 29.1957, heightKm: null, category: 'CLPS', southPole: true,
    source: 'Wikipedia, IM-2 (LROC target: 84.78° S, 29.13° E)',
    sourceUrl: 'https://en.wikipedia.org/wiki/IM-2',
  },
  {
    id: 'chandrayaan3', name: 'Statio Shiv Shakti', mission: 'Chandrayaan-3', year: 2023,
    lat: -69.373, lon: 32.319, heightKm: null, category: 'International', southPole: false,
    source: 'Wikipedia, Chandrayaan-3 (to be cross-checked in LROC Quickmap)',
    sourceUrl: 'https://en.wikipedia.org/wiki/Chandrayaan-3',
  },
  {
    id: 'slim', name: 'Shioli crater', mission: 'SLIM', year: 2024,
    lat: -13.316, lon: 25.251, heightKm: -0.912, category: 'International', southPole: false,
    source: 'LROC, JAXA SLIM Landing (position and elevation)',
    sourceUrl: 'https://www.lroc.asu.edu/posts/1358',
  },
  {
    id: 'change4', name: 'Von Kármán crater (far side)', mission: "Chang'e 4", year: 2019,
    lat: -45.4561, lon: 177.5885, heightKm: -5.927, category: 'International', southPole: false,
    source: "LROC, Chang'e 4 Lander Coordinates (stereo DTM)",
    sourceUrl: 'https://www.lroc.asu.edu/images/1087',
  },
  {
    id: 'change3', name: 'Mare Imbrium', mission: "Chang'e 3", year: 2013,
    lat: 44.1214, lon: -19.5116, heightKm: -2.64, category: 'International', southPole: false,
    source: "LROC, Chang'e 3 Lander and Rover From Above (44.1214° N, 340.4884° E, -2640 m)",
    sourceUrl: 'https://lroc.im-ldi.com/images/637',
  },
  {
    id: 'change5', name: 'Oceanus Procellarum (Mons Rümker)', mission: "Chang'e 5", year: 2020,
    lat: 43.0576, lon: -51.9161, heightKm: -2.57, category: 'International', southPole: false,
    source: "LROC, First Look: Chang'e 5 (43.0576° N, 308.0839° E, -2570 m)",
    sourceUrl: 'https://www.lroc.im-ldi.com/images/1172',
  },
  {
    id: 'change6', name: 'Apollo basin (far side)', mission: "Chang'e 6", year: 2024,
    lat: -41.6385, lon: -153.9852, heightKm: -5.256, category: 'International', southPole: false,
    source: "LROC, First Look: Chang'e 6 (41.6385° S, 206.0148° E, -5256 m)",
    sourceUrl: 'https://lroc.im-ldi.com/images/1374',
  },
  {
    id: 'shackleton', name: 'Shackleton–de Gerlache ridge', mission: 'Shackleton rim', year: null,
    lat: -89.684, lon: -163.261, heightKm: 1.727, category: 'Candidate', southPole: true,
    source: 'LROC, Traversing the Shackleton–de Gerlache Ridge (89.684° S, 196.739° E); height and terrain: LOLA 5 m DEM Site04 (NASA GSFC PGDA)',
    sourceUrl: 'https://www.lroc.asu.edu/images/1247',
    terrain: 'shackleton', // public/terrain/shackleton.json (scripts/build-terrain.mjs)
  },
  {
    id: 'peak-near-shackleton', name: 'Artemis III candidate region', mission: 'Peak near Shackleton', year: null,
    lat: -88.80815, lon: 123.71755, heightKm: 1.649, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site07 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'peak-near-shackleton',
  },
  {
    id: 'connecting-ridge', name: 'Artemis III candidate region', mission: 'Connecting ridge', year: null,
    lat: -89.43891, lon: -137.14357, heightKm: 1.960, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site01 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'connecting-ridge',
  },
  {
    id: 'connecting-ridge-ext', name: 'Artemis III candidate region', mission: 'Connecting ridge extension', year: null,
    lat: -89.00518, lon: -96.42828, heightKm: 1.557, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM SL3 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'connecting-ridge-ext',
  },
  {
    id: 'de-gerlache-rim', name: 'Artemis III candidate region', mission: 'de Gerlache rim', year: null,
    lat: -88.66394, lon: -68.38832, heightKm: 1.816, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site11 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'de-gerlache-rim',
  },
  {
    id: 'haworth', name: 'Artemis III candidate region', mission: 'Haworth', year: null,
    lat: -86.76615, lon: -20.51349, heightKm: 1.908, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Haworth (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'haworth',
  },
  {
    id: 'malapert-massif', name: 'Artemis III candidate region', mission: 'Malapert massif', year: null,
    lat: -85.98026, lon: 1.63416, heightKm: 5.106, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site23 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'malapert-massif',
  },
  {
    id: 'leibnitz-beta', name: 'Artemis III candidate region', mission: 'Leibnitz β plateau (Mons Mouton)', year: null,
    lat: -85.40462, lon: 31.70732, heightKm: 6.464, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site20v2 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'leibnitz-beta',
  },
  {
    id: 'nobile-rim-1', name: 'Artemis III candidate region', mission: 'Nobile rim 1', year: null,
    lat: -85.30911, lon: 37.03797, heightKm: 6.740, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM Site06 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'nobile-rim-1',
  },
  {
    id: 'nobile-rim-2', name: 'Artemis III candidate region', mission: 'Nobile rim 2', year: null,
    lat: -84.06444, lon: 59.20206, heightKm: 1.470, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM DM2 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'nobile-rim-2',
  },
  {
    id: 'amundsen-rim', name: 'Artemis III candidate region', mission: 'Amundsen rim', year: null,
    lat: -84.3478, lon: 68.9282, heightKm: 0.678, category: 'Candidate', southPole: true,
    source: 'Region: NASA Artemis III candidate landing regions (2022). Point and height: highest terrain within 4 km of the center of LOLA 5 m DEM DM1 (NASA GSFC PGDA); not an official landing point',
    sourceUrl: 'https://pgda.gsfc.nasa.gov/products/78',
    terrain: 'amundsen-rim',
  },
];
