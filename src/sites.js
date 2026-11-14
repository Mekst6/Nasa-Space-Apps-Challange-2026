// Landing sites. Latitude north positive, longitude east positive (-180..180), degrees.
// heightKm: elevation relative to the 1737.4 km reference sphere; only set where a source gives it.
// Heights drive the horizon dip (PLAN.md section 6), so missing south-pole heights mean the
// smooth-sphere horizon is used there. Look them up in LROC Quickmap (LOLA) and fill them in.
// `terrain` names a preprocessed DEM in public/terrain/; its horizon profile then replaces the dip.
export const CATEGORIES = ['Apollo', 'CLPS', 'International', 'Candidate'];

export const SITES = [
  {
    id: 'apollo11', name: 'Mare Tranquillitatis', mission: 'Apollo 11', year: 1969,
    lat: 0.67408, lon: 23.47297, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (IAU Mean Earth/Polar Axis)',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html',
  },
  {
    id: 'apollo17', name: 'Taurus-Littrow', mission: 'Apollo 17', year: 1972,
    lat: 20.1908, lon: 30.77168, heightKm: null, category: 'Apollo', southPole: false,
    source: 'NASA NSSDCA, Apollo Landing Site Coordinates (Lunar Module)',
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
    id: 'shackleton', name: 'Shackleton rim / de Gerlache ridge', mission: 'Artemis candidate region', year: null,
    lat: -89.684, lon: -163.261, heightKm: 1.727, category: 'Candidate', southPole: true,
    source: 'LROC, Traversing the Shackleton–de Gerlache Ridge (89.684° S, 196.739° E); height and terrain: LOLA 5 m DEM Site04 (NASA GSFC PGDA)',
    sourceUrl: 'https://www.lroc.asu.edu/images/1247',
    terrain: 'shackleton', // public/terrain/shackleton.json (scripts/build-terrain.mjs)
  },
];
