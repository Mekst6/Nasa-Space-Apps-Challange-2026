import * as THREE from 'three';
import { createScene, createMarker } from './scene.js';
import { moonFixedDirections } from './ephemeris.js';
import { siteWindows, siteStatus } from './windows.js';
import { createTimeline } from './ui/timeline.js';
import { createSidebar } from './ui/sidebar.js';
import { createCompare } from './ui/compare.js';
import { SITES, CATEGORIES } from './sites.js';

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
  return { site, marker, label: addLabel(site.mission, anchor) };
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
function updateLabels() {
  const { camera, renderer } = view;
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  camera.getWorldDirection(viewDir);
  for (const label of allLabels()) {
    const { el, object } = label;
    object.getWorldPosition(world);
    const behindCamera = toPoint.subVectors(world, camera.position).dot(viewDir) <= 0;
    const markerHidden = label !== earthLabel && !state.showMarkers;
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
  onView: (which) => {
    if (which === 'near') view.flyTo(10, 15, 2.8);
    if (which === 'far') view.flyTo(-10, 180, 2.8);
    if (which === 'south') view.flyTo(-87, 0, 2.2);
  },
});

view.onPick((lat, lon) => setCustom({ lat, lon, heightKm: null }));

// ---------- comparison ----------
const compare = createCompare(document.getElementById('compare'), {
  getSites: () => [...SITES, ...(customEntry ? [customEntry.site] : [])],
  onPickTime: (date) => timeline.setDate(date),
});

// Default partner: another south-pole site for south-pole sites, otherwise the Shackleton rim.
function openCompare(siteId) {
  const site = [...SITES, ...(customEntry ? [customEntry.site] : [])].find((s) => s.id === siteId);
  const partner = SITES.find((s) => s.id !== siteId && s.southPole && (site?.southPole ? s.id !== 'shackleton' || siteId !== 'im2' : true))
    ?? SITES.find((s) => s.id !== siteId);
  compare.setDate(state.date);
  compare.open(siteId, partner.id);
}
document.getElementById('compare-open').addEventListener('click', () => openCompare(state.selected.id));

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
function refreshDetails(force = false) {
  const now = performance.now();
  if (!force && now - lastDetails < DETAILS_REFRESH_MS) return;
  lastDetails = now;
  sidebar.showSite(state.selected, siteWindows(withHeight(state.selected), state.date), state.date);
}

function applyTime(date) {
  state.date = date;
  const dirs = moonFixedDirections(date);
  view.setSunDirection(dirs.sun);
  view.setEarthDirection(dirs.earth);
  updateMarkerColors(dirs);
  refreshDetails();
  if (typeof compare !== 'undefined') refreshCompare();
}

const timeline = createTimeline(document.getElementById('timeline'), { onChange: applyTime });

view.onFrame((dt) => {
  timeline.tick(dt);
  updateLabels();
});

// Start looking at the near side, slightly zoomed onto Apollo 11.
view.lookAtLatLon(10, 15, 2.6);
select(SITES[0], { fly: false });
