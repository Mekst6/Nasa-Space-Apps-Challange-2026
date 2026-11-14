import * as THREE from 'three';
import { createScene, createMarker } from './scene.js';
import { moonFixedDirections } from './ephemeris.js';
import { siteWindows, siteStatus, nextGoodWindow, skyTrack, GOOD_SEARCH_DAYS } from './windows.js';
import { createTimeline } from './ui/timeline.js';
import { createSidebar } from './ui/sidebar.js';
import { createCompare } from './ui/compare.js';
import { createTerrainView } from './ui/terrain.js';
import { createRanking } from './ui/ranking.js';
import { SITES, CATEGORIES } from './sites.js';
import { buildPermalink, parsePermalink } from './permalink.js';

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
  onJump: (date) => timeline.setDate(date),
  onTerrain: () => openTerrain(state.selected),
  onView: (which) => {
    if (which === 'near') view.flyTo(10, 15, 2.8);
    if (which === 'far') view.flyTo(-10, 180, 2.8);
    if (which === 'south') view.flyTo(-87, 0, 2.2);
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
  openCompare(state.selected.id);
});

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
  });
}

function applyTime(date) {
  state.date = date;
  const dirs = moonFixedDirections(date);
  view.setSunDirection(dirs.sun);
  view.setEarthDirection(dirs.earth);
  updateMarkerColors(dirs);
  refreshDetails();
  if (typeof compare !== 'undefined') refreshCompare();
  if (typeof terrainView !== 'undefined') terrainView.setDate(date);
  if (typeof ranking !== 'undefined') ranking.setDate(date);
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
  if (link.view === 'compare') openCompare(site.id, link.compareB);
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

// Start: restore a shared link if there is one, otherwise look at the near side and Apollo 11.
const initialLink = parsePermalink(location.hash);
view.lookAtLatLon(10, 15, 2.6);
select(SITES[0], { fly: false });
applyLink(Object.keys(initialLink).length ? initialLink : { siteId: SITES[0].id })
  .finally(() => {
    if (!Object.keys(initialLink).length) view.lookAtLatLon(10, 15, 2.6);
    linkReady = true;
    syncLink(true);
  });
