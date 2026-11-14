import * as THREE from 'three';
import { createScene, createMarker } from './scene.js';
import { SITES } from './sites.js';

const view = createScene(document.getElementById('viewport'));
const labelLayer = document.getElementById('labels');

const labels = SITES.map((site) => {
  const marker = createMarker(site.lat, site.lon);
  view.markers.add(marker);

  const el = document.createElement('div');
  el.className = 'site-label';
  el.textContent = `${site.mission} · ${site.name}`;
  labelLayer.appendChild(el);

  return { el, anchor: marker.userData.anchor };
});

// Keep HTML labels glued to their markers; hide them on the far side of the moon.
const projected = new THREE.Vector3();
const toCamera = new THREE.Vector3();
view.onFrame(() => {
  const { camera, renderer } = view;
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  for (const { el, anchor } of labels) {
    toCamera.copy(camera.position).sub(anchor);
    const facing = anchor.dot(toCamera) > 0;
    projected.copy(anchor).project(camera);
    el.classList.toggle('hidden', !facing);
    el.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
    el.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
  }
});

// Start looking at the near side, slightly zoomed onto Apollo 11.
view.lookAtLatLon(10, 15, 2.6);
