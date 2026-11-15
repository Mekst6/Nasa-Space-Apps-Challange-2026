import * as THREE from 'three';
import { createScene, createMarker } from './scene.js';
import { moonFixedDirections, earthOrientation, earthPhase } from './ephemeris.js';
import { siteWindows, siteStatus, nextGoodWindow, skyTrack, GOOD_SEARCH_DAYS } from './windows.js';
import { createTimeline } from './ui/timeline.js';
import { createSidebar } from './ui/sidebar.js';
import { createCompare } from './ui/compare.js';
import { createTerrainView } from './ui/terrain.js';
import { createRanking } from './ui/ranking.js';
import { SITES, CATEGORIES } from './sites.js';
import { buildPermalink, parsePermalink } from './permalink.js';
import { createTour } from './ui/tour.js';
import { createYearView } from './ui/year.js';

const STATUS_COLORS = { green: 0x3ccf6e, yellow: 0xf2c230, red: 0xff4d4d };
const NEUTRAL_COLOR = 0xff8a3c;
const CUSTOM_COLOR = 0xffffff;
// Sidebar metrics take ~1 ms per site; while playing, refresh them a few times per second.
const DETAILS_REFRESH_MS = 200;
// The comparison recomputes 2 x 720 hours; refresh it less often while playing.
const COMPARE_REFRESH_MS = 500;

const view = createScene(document.getElementById('viewport'));
const labelLayer = document.getElementById('labels');

const withHeight = (site) => ({ ...site, heightKm: site.heightKm ?? 0 });

// ---------- markers and labels ----------
const state = {
  date: new Date(),
  selected: SITES[0],
  custom: null,
  showMarkers: true,
  showColors: true,
};

function addLabel(text, object, className = '') {
  const el = document.createElement('div');
  el.className = `site-label ${className}`.trim();
  el.textContent = text;
  labelLayer.appendChild(el);
  return { el, object };
}

function makeSiteEntry(site, color) {
  const marker = createMarker(site.lat, site.lon, color);
  view.markers.add(marker);
  const anchor = new THREE.Object3D();
  anchor.position.copy(marker.userData.anchor);
  marker.add(anchor);
  const label = addLabel(site.mission, anchor);
  label.dense = site.category === 'Candidate';
  return { site, marker, label };
}

const entries = SITES.map((site) => makeSiteEntry(site, NEUTRAL_COLOR));
let customEntry = null;
const earthLabel = addLabel('Earth (direction, not to scale)', view.earth, 'earth-label');

const allLabels = () => [...entries, ...(customEntry ? [customEntry] : [])].map((e) => e.label).concat(earthLabel);

// Hide labels behind the camera or behind the moon.
const world = new THREE.Vector3();
const projected = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const toPoint = new THREE.Vector3();
function hiddenByMoon(point, camera) {
  // Does the segment camera -> point pass through the moon (radius 1, slightly shrunk)?
  const c = camera.position;
  const d = new THREE.Vector3().subVectors(point, c);
  const t = Math.max(0, Math.min(1, -c.dot(d) / d.lengthSq()));
  return c.clone().addScaledVector(d, t).length() < 0.999;
}
// The candidate regions cluster around the pole: label them only when selected or zoomed in.
function crowded(label, camera) {
  if (!label.dense || label.el.classList.contains('selected')) return false;
  return camera.position.length() > 1.9;
}
function updateLabels() {
  const { camera, renderer } = view;
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  camera.getWorldDirection(viewDir);
  for (const label of allLabels()) {
    const { el, object } = label;
    object.getWorldPosition(world);
    const behindCamera = toPoint.subVectors(world, camera.position).dot(viewDir) <= 0;
    const markerHidden = label !== earthLabel && (!state.showMarkers || crowded(label, camera));
    projected.copy(world).project(camera);
    el.classList.toggle('hidden', markerHidden || behindCamera || hiddenByMoon(world, camera));
    el.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
    el.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
  }
}

// ---------- sidebar ----------
function select(site, { fly = true } = {}) {
  state.selected = site;
  sidebar.setSelected(site.id);
  for (const e of [...entries, ...(customEntry ? [customEntry] : [])]) {
    const selected = e.site === site;
    e.marker.setSelected(selected);
    e.label.el.classList.toggle('selected', selected);
  }
  if (fly) view.flyTo(site.lat, site.lon, site.southPole ? 2.2 : 2.6);
  refreshDetails(true);
  if (typeof yearView !== 'undefined' && yearView.isOpen && yearView.site !== site) yearView.open(site, state.date);
}

function setCustom({ lat, lon, heightKm }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90) return;
  if (customEntry) {
    view.markers.remove(customEntry.marker);
    customEntry.label.el.remove();
  }
  const site = {
    id: 'custom', name: 'Custom point', mission: 'Custom point', year: null,
    lat, lon, heightKm: Number.isFinite(heightKm) ? heightKm : null,
    category: 'Custom', southPole: lat < -75, source: 'Entered by user',
  };
  customEntry = makeSiteEntry(site, CUSTOM_COLOR);
  customEntry.marker.visible = state.showMarkers;
  select(site, { fly: false });
  compare.refreshSites();
}

const sidebar = createSidebar(document.getElementById('sidebar'), {
  sites: SITES,
  categories: CATEGORIES,
  onSelect: (site) => select(site),
  onCustom: (p) => {
    setCustom(p);
    view.flyTo(p.lat, p.lon);
  },
  onToggle: (name, value) => {
    if (name === 'markers') {
      state.showMarkers = value;
      view.markers.visible = value;
    }
    if (name === 'colors') {
      state.showColors = value;
      updateMarkerColors();
    }
  },
  onCompare: () => openCompare(state.selected.id),
  onYear: () => openYear(state.selected),
  onJump: (date) => timeline.setDate(date),
  onTerrain: () => openTerrain(state.selected),
  onView: (which) => {
    if (which === 'near') view.flyTo(10, 15, 2.8);
    if (which === 'far') view.flyTo(-10, 180, 2.8);
    if (which === 'south') view.flyTo(-87, 0, 2.2);
    if (which === 'earth') view.showEarthView();
  },
});

view.onPick((lat, lon) => setCustom({ lat, lon, heightKm: null }));

// ---------- terrain view ----------
const terrainView = createTerrainView(document.getElementById('terrain'));
function openTerrain(site) {
  const meta = terrainMeta[site.id];
  if (!meta) return;
  compare.close();
  ranking.close();
  yearView.close();
  terrainView.setDate(state.date);
  terrainView.open(site, meta);
}

// ---------- comparison ----------
const compare = createCompare(document.getElementById('compare'), {
  getSites: () => [...SITES, ...(customEntry ? [customEntry.site] : [])],
  onPickTime: (date) => timeline.setDate(date),
});

const allSites = () => [...SITES, ...(customEntry ? [customEntry.site] : [])];

// Default partner: another south-pole site for south-pole sites, otherwise the Shackleton rim.
function openCompare(siteId, partnerId = null) {
  yearView.close();
  const site = allSites().find((s) => s.id === siteId);
  const partner = allSites().find((s) => s.id === partnerId && s.id !== siteId)
    ?? SITES.find((s) => s.id !== siteId && s.southPole && (site?.southPole ? s.id !== 'shackleton' || siteId !== 'im2' : true))
    ?? SITES.find((s) => s.id !== siteId);
  compare.setDate(state.date);
  compare.open(siteId, partner.id);
}
document.getElementById('compare-open').addEventListener('click', () => {
  terrainView.close();
  ranking.close();
  yearView.close();
  openCompare(state.selected.id);
});

// ---------- year overview ----------
const yearView = createYearView(document.getElementById('year'), {
  onPickDay: (date) => timeline.setDate(new Date(date.getTime() + 12 * 3600e3)), // noon of that day
});
function openYear(site) {
  terrainView.close();
  compare.close();
  ranking.close();
  yearView.open(site, state.date);
}

// ---------- ranking ----------
const ranking = createRanking(document.getElementById('ranking'), {
  getSites: () => [...SITES, ...(customEntry ? [customEntry.site] : [])],
  onSelect: (site) => {
    ranking.close();
    select(site);
  },
});
document.getElementById('ranking-open').addEventListener('click', () => {
  terrainView.close();
  compare.close();
  yearView.close();
  ranking.setDate(state.date);
  ranking.open();
});

// ---------- time ----------
function updateMarkerColors(directions = moonFixedDirections(state.date)) {
  const statuses = {};
  for (const e of entries) {
    const status = siteStatus(withHeight(e.site), state.date, directions).overall;
    statuses[e.site.id] = status;
    e.marker.setColor(state.showColors ? STATUS_COLORS[status] : NEUTRAL_COLOR);
  }
  sidebar.setStatuses(state.showColors ? statuses : {});
}

let lastDetails = 0;
let lastCompare = 0;
function refreshCompare(force = false) {
  if (!compare.isOpen) return;
  const now = performance.now();
  if (!force && now - lastCompare < COMPARE_REFRESH_MS) return;
  lastCompare = now;
  compare.setDate(state.date);
}
// The window search can scan a whole year, so cache it until the time leaves the range in
// which the answer stays the same (before the window opens / until it closes).
let windowCache = null;
function nextWindows(site, date) {
  const t = date.getTime();
  const c = windowCache;
  if (c && c.site === site && t >= c.from && t < c.validUntil) return c;
  const site0 = withHeight(site);
  const good = nextGoodWindow(site0, date);
  const fallback = good ? null : nextGoodWindow(site0, date, { minElevation: 0 });
  const w = good ?? fallback;
  const searchEnd = t + GOOD_SEARCH_DAYS * 864e5;
  const validUntil = !w ? searchEnd : w.now ? (w.end?.getTime() ?? searchEnd) : w.start.getTime();
  windowCache = { site, from: t, validUntil, window: good, fallback };
  return windowCache;
}

function refreshDetails(force = false) {
  const now = performance.now();
  if (!force && now - lastDetails < DETAILS_REFRESH_MS) return;
  lastDetails = now;
  const windows = nextWindows(state.selected, state.date);
  // A window that was "upcoming" when cached is open once the time is past its start.
  const open = (w) => (w && !w.now && state.date >= w.start ? { ...w, now: true } : w);
  sidebar.showSite(state.selected, siteWindows(withHeight(state.selected), state.date), state.date, {
    window: open(windows.window), fallback: open(windows.fallback), searchDays: GOOD_SEARCH_DAYS,
    track: skyTrack(withHeight(state.selected), state.date),
    earthPhase: state.earthPhase ?? earthPhase(state.date),
  });
}

function applyTime(date) {
  state.date = date;
  const dirs = moonFixedDirections(date);
  view.setSunDirection(dirs.sun);
  view.setEarthDirection(dirs.earth);
  view.setEarthOrientation(earthOrientation(date));
  state.earthPhase = earthPhase(date);
  earthLabel.el.textContent = `Earth · ${Math.round(state.earthPhase.fraction * 100)}% lit (direction, not to scale)`;
  updateMarkerColors(dirs);
  refreshDetails();
  if (typeof compare !== 'undefined') refreshCompare();
  if (typeof terrainView !== 'undefined') terrainView.setDate(date);
  if (typeof ranking !== 'undefined') ranking.setDate(date);
  if (typeof yearView !== 'undefined') yearView.setDate(date);
}

const timeline = createTimeline(document.getElementById('timeline'), { onChange: applyTime });

view.onFrame((dt) => {
  timeline.tick(dt);
  updateLabels();
});

// ---------- terrain profiles ----------
// Sites with a preprocessed DEM get their horizon profile once it has loaded; until then
// (or if loading fails) they fall back to the smooth horizon with dip.
const terrainMeta = {};
const terrainReady = {}; // site id -> promise of its metadata (for links that open the 3D view)
for (const site of SITES.filter((s) => s.terrain)) {
  terrainReady[site.id] = fetch(`${import.meta.env.BASE_URL}terrain/${site.terrain}.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((meta) => {
      terrainMeta[site.id] = meta;
      site.horizon = meta.horizon;
      windowCache = null;
      updateMarkerColors();
      refreshDetails(true);
      refreshCompare(true);
      ranking.refresh();
      if (yearView.site === site) yearView.refresh();
      return meta;
    })
    .catch((err) => console.warn(`Terrain for ${site.id} not loaded:`, err));
}

// ---------- shareable links ----------
// The URL hash mirrors the app state (site, time, open view) and restores it on load.
const SYNC_MS = 500;
let linkReady = false, lastHash = null, lastSync = 0;

function currentView() {
  if (compare.isOpen) return 'compare';
  if (terrainView.isOpen) return 'terrain';
  if (ranking.isOpen) return 'ranking';
  if (yearView.isOpen) return 'year';
  return null;
}

function currentPermalink() {
  const v = currentView();
  const { a, b } = compare.pair;
  return buildPermalink({
    siteId: v === 'compare' ? a : state.selected.id,
    time: state.date,
    view: v,
    compareB: b,
    custom: customEntry ? customEntry.site : null,
  });
}

function syncLink(force = false) {
  const now = performance.now();
  if (!linkReady || (!force && now - lastSync < SYNC_MS)) return;
  lastSync = now;
  const hash = currentPermalink();
  if (hash !== lastHash) {
    history.replaceState(null, '', `#${hash}`);
    lastHash = hash;
  }
}

async function applyLink(link) {
  if (link.custom) setCustom(link.custom);
  if (link.time) timeline.setDate(link.time);
  const site = allSites().find((s) => s.id === link.siteId) ?? (link.custom ? customEntry.site : SITES[0]);
  select(site, { fly: false });
  view.lookAtLatLon(Math.max(-87, Math.min(87, site.lat)), site.lon, site.southPole ? 2.2 : 2.6);
  terrainView.close();
  compare.close();
  ranking.close();
  yearView.close();
  if (link.view === 'compare') openCompare(site.id, link.compareB);
  if (link.view === 'year') {
    if (terrainReady[site.id]) await terrainReady[site.id];
    openYear(site);
  }
  if (link.view === 'ranking') {
    ranking.setDate(state.date);
    ranking.open();
  }
  if (link.view === 'terrain' && terrainReady[site.id]) {
    await terrainReady[site.id];
    openTerrain(site);
  }
}

window.addEventListener('hashchange', () => {
  if (location.hash.replace(/^#/, '') !== lastHash) applyLink(parsePermalink(location.hash));
});

view.onFrame(() => syncLink());

// Share button: put the current state into the URL and copy it.
const toast = document.getElementById('toast');
let toastTimer = null;
function showToast(html, ms = 2500) {
  toast.innerHTML = html;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
}
document.getElementById('share').addEventListener('click', async () => {
  syncLink(true);
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('Link copied ✓ — it opens this site, time and view.');
  } catch {
    // Clipboard access can be blocked; show the link so it can be copied by hand.
    showToast(`Copy this link:<input class="toast-link" readonly value="${location.href.replace(/"/g, '&quot;')}" />`, 8000);
    toast.querySelector('.toast-link')?.select();
  }
});

// ---------- guided tour ----------
// Fixed dates so every run of the tour shows the same, explained situation.
const TOUR_STEPS = [
  {
    title: 'The Moon, lit by the real Sun',
    html: `This is the Moon at the time shown below. The light comes from the Sun's true direction,
      computed from NASA-grade ephemerides (checked against JPL Horizons to 0.004°).
      Each pin is a landing site; its color says whether <strong>power</strong> (sunlight) and
      <strong>comms</strong> (Earth in view) work right now.`,
    run: async () => {
      await applyLink({ siteId: 'apollo11', time: new Date('2026-11-20T00:00:00Z') });
      view.flyTo(10, 15, 2.8);
      timeline.setSpeed('1 day/s');
      timeline.setPlaying(true);
    },
    highlight: '#timeline',
  },
  {
    title: 'Power and comms at one site',
    html: `For Apollo 11 the panel shows how high the Sun and the Earth stand above the horizon,
      when they set or rise next, and how many hours of each the next 14 days bring.
      Near the equator a lunar day is two weeks of light followed by two weeks of night.`,
    run: async () => {
      timeline.setPlaying(false);
      await applyLink({ siteId: 'apollo11', time: new Date('2026-11-20T00:00:00Z') });
      view.flyTo(5, 23, 2.4);
    },
    highlight: '.sb-card',
  },
  {
    title: 'Why the south pole is hard',
    html: `At the Shackleton rim the Sun never climbs more than ~1.6°. The chart shows the real
      skyline from NASA's LOLA elevation data and the Sun's path for the next 30 days:
      it circles the whole horizon, skimming the crater rims. The Earth (blue) hides
      behind the far rim most of the time.`,
    run: async () => {
      await applyLink({ siteId: 'shackleton', time: new Date('2026-11-15T12:00:00Z') });
      view.flyTo(-87, -163, 2.1);
    },
    highlight: '.horizon-svg',
  },
  {
    title: 'Real terrain, real shadows',
    html: `This is the Shackleton rim in 3D, from 5 m/px laser altimetry, without vertical
      exaggeration. Watch the shadows move as time runs: a few hundred meters decide
      between light and darkness.`,
    run: async () => {
      await applyLink({ siteId: 'shackleton', time: new Date('2026-11-17T00:00:00Z'), view: 'terrain' });
      timeline.setSpeed('6 h/s');
      timeline.setPlaying(true);
    },
  },
  {
    title: 'Compare two candidate sites',
    html: `IM-2 (Mons Mouton) against the Malapert massif: Sun and Earth over 30 days.
      The table marks the better value per row. Click a chart to jump to that moment.`,
    run: async () => {
      timeline.setPlaying(false);
      await applyLink({ siteId: 'im2', time: new Date('2026-12-01T06:00:00Z'), view: 'compare', compareB: 'malapert-massif' });
    },
  },
  {
    title: 'Which site is best this month?',
    html: `All 26 sites ranked for the next 30 days. “Good” means Sun and Earth are both more than 2°
      above the horizon. South-pole sites can have no night at all, while equatorial sites
      sit in the dark for two weeks.`,
    run: async () => {
      await applyLink({ siteId: 'shackleton', time: new Date('2026-11-15T12:00:00Z'), view: 'ranking' });
    },
  },
  {
    title: 'When does everything fit?',
    html: `For any site the app searches up to a year ahead for the next window in which power and
      comms both work, and how long it lasts. “Jump there” sets the timeline to that moment.`,
    run: async () => {
      await applyLink({ siteId: 'im1', time: new Date('2026-11-15T00:00:00Z') });
      view.flyTo(-80, 1, 2.3);
    },
    highlight: '.sb-next',
  },
  {
    title: 'Now it is your turn',
    html: `Pick any site, enter coordinates or click on the Moon. Use the timeline to move through
      time. <strong>Share 🔗</strong> copies a link to exactly what you see.`,
    run: async () => {
      await applyLink({ siteId: 'shackleton', time: new Date('2026-11-15T12:00:00Z') });
    },
    highlight: '#share',
  },
];

const tour = createTour(document.getElementById('tour'), {
  steps: TOUR_STEPS,
  onEnd: () => timeline.setPlaying(false),
});
document.getElementById('tour-open').addEventListener('click', () => tour.start());

// First visit (no shared link): offer the tour once.
function offerTour() {
  let seen = false;
  try { seen = localStorage.getItem('tourOffered') === '1'; } catch { /* storage blocked: offer anyway */ }
  if (seen) return;
  try { localStorage.setItem('tourOffered', '1'); } catch { /* ignore */ }
  showToast('New here? <button type="button" class="toast-btn">Take the 1-minute tour ▶</button>', 9000);
  toast.querySelector('.toast-btn')?.addEventListener('click', () => {
    toast.hidden = true;
    tour.start();
  });
}

// Start: restore a shared link if there is one, otherwise look at the near side and Apollo 11.
const initialLink = parsePermalink(location.hash);
view.lookAtLatLon(10, 15, 2.6);
select(SITES[0], { fly: false });
applyLink(Object.keys(initialLink).length ? initialLink : { siteId: SITES[0].id })
  .finally(() => {
    if (!Object.keys(initialLink).length) view.lookAtLatLon(10, 15, 2.6);
    linkReady = true;
    syncLink(true);
    if (!Object.keys(initialLink).length) offerTour();
  });
