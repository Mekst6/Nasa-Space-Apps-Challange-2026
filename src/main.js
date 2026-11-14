import * as THREE from 'three';
import { createScene, createMarker } from './scene.js';
import { moonFixedDirections } from './ephemeris.js';
import { createTimeline } from './ui/timeline.js';
import { SITES } from './sites.js';

const view = createScene(document.getElementById('viewport'));
const labelLayer = document.getElementById('labels');

function addLabel(text, object, className = '') {
  const el = document.createElement('div');
  el.className = `site-label ${className}`.trim();
  el.textContent = text;
  labelLayer.appendChild(el);
  return { el, object };
}

const labels = SITES.map((site) => {
  const marker = createMarker(site.lat, site.lon);
  view.markers.add(marker);
  const anchor = new THREE.Object3D();
  anchor.position.copy(marker.userData.anchor);
  marker.add(anchor);
  return addLabel(`${site.mission} · ${site.name}`, anchor);
});
labels.push(addLabel('Earth (direction, not to scale)', view.earth, 'earth-label'));

// Keep HTML labels glued to their objects; hide them when the moon is in the way.
const world = new THREE.Vector3();
const projected = new THREE.Vector3();
function hiddenByMoon(point, camera) {
  // Does the segment camera -> point pass through the moon (radius 1, slightly shrunk)?
  const c = camera.position;
  const d = new THREE.Vector3().subVectors(point, c);
  const t = Math.max(0, Math.min(1, -c.dot(d) / d.lengthSq()));
  return c.clone().addScaledVector(d, t).length() < 0.999;
}
const viewDir = new THREE.Vector3();
const toPoint = new THREE.Vector3();
function updateLabels() {
  const { camera, renderer } = view;
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  camera.getWorldDirection(viewDir);
  for (const { el, object } of labels) {
    object.getWorldPosition(world);
    const behindCamera = toPoint.subVectors(world, camera.position).dot(viewDir) <= 0;
    projected.copy(world).project(camera);
    el.classList.toggle('hidden', behindCamera || hiddenByMoon(world, camera));
    el.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
    el.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
  }
}

function applyTime(date) {
  const dirs = moonFixedDirections(date);
  view.setSunDirection(dirs.sun);
  view.setEarthDirection(dirs.earth);
}

const timeline = createTimeline(document.getElementById('timeline'), { onChange: applyTime });

view.onFrame((dt) => {
  timeline.tick(dt);
  updateLabels();
});

// Start looking at the near side, slightly zoomed onto Apollo 11.
view.lookAtLatLon(10, 15, 2.6);
