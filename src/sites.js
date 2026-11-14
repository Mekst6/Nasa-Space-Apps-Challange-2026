// Landing sites. Latitude north positive, longitude east positive, degrees.
// Every entry needs a source. Unverified values are flagged with verified: false.
// Full list follows in M4 (see PLAN.md section 7).
export const SITES = [
  {
    id: 'apollo11',
    name: 'Mare Tranquillitatis',
    mission: 'Apollo 11',
    year: 1969,
    lat: 0.674,
    lon: 23.473,
    heightKm: 0, // to be verified (PLAN.md section 7)
    category: 'Apollo',
    source: 'NASA NSSDCA Apollo 11 landing site (0.67408 N, 23.47297 E); to be cross-checked in LROC Quickmap',
    verified: false,
  },
];
