// 3D terrain view of a preprocessed LOLA DEM (scripts/build-terrain.mjs) with real-time sun shadows.
// Scene frame: tangent plane at the south pole, 1 unit = 1 km.
//   X = map x, Z = -map y, Y = height (with the Moon's curvature drop relative to the pole).
// Map (polar stereographic) axes near the pole: map x ~ body-fixed y, map y ~ body-fixed x, up ~ -z.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { moonFixedDirections } from '../ephemeris.js';
import { escapeHtml } from './format.js';

const R_M = 1737400;
const toScene = (x, y, hM) => new THREE.Vector3(x / 1000, (hM - (x * x + y * y) / (2 * R_M)) / 1000, -y / 1000);
const fixedToTerrain = ([dx, dy, dz]) => new THREE.Vector3(dy, -dz, -dx).normalize();

export function createTerrainView(container) {
  container.innerHTML = `
    <div class="tr-canvas"></div>
    <div class="tr-head">
      <div>
        <h2 class="tr-title"></h2>
        <p class="tr-sub muted"></p>
      </div>
      <button type="button" class="tr-close" aria-label="Close terrain view">✕</button>
    </div>
    <div class="tr-legend">
      <span><span class="tr-key tr-key-site"></span>Site</span>
      <span><span class="tr-key tr-key-sun"></span>Sun direction</span>
      <span><span class="tr-key tr-key-earth"></span>Earth direction</span>
      <span class="muted">Drag to orbit · scroll to zoom</span>
    </div>
    <p class="tr-note muted"></p>
  `;
  const $ = (sel) => container.querySelector(sel);
  container.hidden = true;

  let renderer = null, scene, camera, controls, sun, terrain = null, current = null, date = new Date();
  let siteMarker, sunArrow, earthArrow, poleLabel;
  const meshes = {};

  function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    $('.tr-canvas').appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020306);
    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 200);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.3;
    controls.maxDistance = 40;

    // Sunlight with shadows; faint bluish ambient stands in for earthshine.
    sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target, new THREE.AmbientLight(0x8fa6c8, 0.12));

    siteMarker = new THREE.Group();
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 8), new THREE.MeshBasicMaterial({ color: 0xff5a3c }));
    pin.position.y = 0.175;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 8), new THREE.MeshBasicMaterial({ color: 0xff5a3c }));
    head.position.y = 0.35;
    siteMarker.add(pin, head);
    sunArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0xffd84d, 0.25, 0.12);
    earthArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 2, 0x4f8fe0, 0.25, 0.12);
    scene.add(siteMarker, sunArrow, earthArrow);

    poleLabel = document.createElement('div');
    poleLabel.className = 'tr-label';
    poleLabel.textContent = 'South Pole';
    container.appendChild(poleLabel);

    window.addEventListener('resize', resize);
    $('.tr-close').addEventListener('click', () => api.close());
  }

  function resize() {
    if (!renderer || container.hidden) return;
    const el = $('.tr-canvas');
    renderer.setSize(el.clientWidth, el.clientHeight);
    camera.aspect = el.clientWidth / el.clientHeight;
    camera.updateProjectionMatrix();
  }

  async function loadMesh(meta) {
    if (meshes[meta.name]) return meshes[meta.name];
    const res = await fetch(`${import.meta.env.BASE_URL}terrain/${meta.grid.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const heights = new Int16Array(await res.arrayBuffer());
    const { n, extent, cellM } = meta.grid;
    const [xmin, , , ymax] = extent;
    const positions = new Float32Array(n * n * 3);
    let hMin = Infinity, hMax = -Infinity;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = xmin + (i + 0.5) * cellM, y = ymax - (j + 0.5) * cellM;
        const p = toScene(x, y, heights[j * n + i]);
        positions.set([p.x, p.y, p.z], (j * n + i) * 3);
        hMin = Math.min(hMin, p.y);
        hMax = Math.max(hMax, p.y);
      }
    }
    const index = [];
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xa8a8a8, roughness: 1, metalness: 0 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const bounds = new THREE.Box3(
      new THREE.Vector3(extent[0] / 1000, hMin, -extent[3] / 1000),
      new THREE.Vector3(extent[2] / 1000, hMax, -extent[1] / 1000),
    );
    meshes[meta.name] = { mesh, bounds };
    return meshes[meta.name];
  }

  // Fit the orthographic shadow camera tightly around the terrain as seen from the sun, so the
  // shadow map resolution goes where it matters even when the sun is only ~1° above the horizon.
  function fitShadowCamera(dir) {
    const { bounds } = terrain;
    const center = bounds.getCenter(new THREE.Vector3());
    const lightPos = center.clone().addScaledVector(dir, 60);
    sun.position.copy(lightPos);
    sun.target.position.copy(center);
    const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    const up = dir.clone().cross(right);
    let l = Infinity, r = -Infinity, b = Infinity, t = -Infinity, near = Infinity, far = -Infinity;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const v = new THREE.Vector3(x, y, z).sub(lightPos);
      const px = v.dot(right), py = v.dot(up), depth = -v.dot(dir);
      l = Math.min(l, px); r = Math.max(r, px); b = Math.min(b, py); t = Math.max(t, py);
      near = Math.min(near, depth); far = Math.max(far, depth);
    }
    Object.assign(sun.shadow.camera, { left: l, right: r, bottom: b, top: t, near: Math.max(0.01, near - 1), far: far + 1 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  function applyDate() {
    if (!terrain || !current) return;
    const dirs = moonFixedDirections(date);
    const sunDir = fixedToTerrain(dirs.sun);
    const earthDir = fixedToTerrain(dirs.earth);
    fitShadowCamera(sunDir);
    const base = siteMarker.position.clone().add(new THREE.Vector3(0, 0.4, 0));
    sunArrow.position.copy(base);
    sunArrow.setDirection(sunDir);
    earthArrow.position.copy(base);
    earthArrow.setDirection(earthDir);
    const elev = (d) => (Math.asin(d.y) * 180) / Math.PI;
    $('.tr-sub').textContent = `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC · `
      + `Sun ${elev(sunDir).toFixed(2)}°, Earth ${elev(earthDir).toFixed(2)}° above the polar plane`;
  }

  const labelPos = new THREE.Vector3();
  function updatePoleLabel() {
    labelPos.copy(toScene(0, 0, 0)).setY(terrain.bounds.max.y * 0.2);
    labelPos.project(camera);
    const el = $('.tr-canvas');
    poleLabel.style.left = `${(labelPos.x * 0.5 + 0.5) * el.clientWidth}px`;
    poleLabel.style.top = `${(-labelPos.y * 0.5 + 0.5) * el.clientHeight}px`;
    poleLabel.hidden = labelPos.z > 1;
  }

  const api = {
    async open(site, meta) {
      if (!renderer) initRenderer();
      container.hidden = false;
      current = site;
      $('.tr-title').textContent = `${site.mission} · terrain`;
      $('.tr-note').innerHTML = `LOLA 5 m/px DEM (<a href="${escapeHtml(meta.sourceUrl)}" target="_blank" rel="noopener">NASA GSFC PGDA</a>),
        ${((meta.grid.extent[2] - meta.grid.extent[0]) / 1000).toFixed(0)} × ${((meta.grid.extent[3] - meta.grid.extent[1]) / 1000).toFixed(0)} km,
        shown at ${meta.grid.cellM.toFixed(0)} m. No vertical exaggeration. Shadows come only from terrain inside this area.`;
      resize();
      try {
        const loaded = await loadMesh(meta);
        if (terrain) scene.remove(terrain.mesh);
        terrain = loaded;
        scene.add(terrain.mesh);
      } catch (err) {
        $('.tr-sub').textContent = `Could not load terrain: ${err.message}`;
        return;
      }
      siteMarker.position.copy(toScene(meta.site.x, meta.site.y, meta.site.groundM));
      // Look at the site from the north-west, across it toward the pole.
      controls.target.copy(siteMarker.position);
      camera.position.copy(siteMarker.position).add(new THREE.Vector3(-3.5, 2.2, 4.5));
      controls.update();
      applyDate();
      renderer.setAnimationLoop(() => {
        controls.update();
        updatePoleLabel();
        renderer.render(scene, camera);
      });
    },
    close() {
      container.hidden = true;
      current = null;
      renderer?.setAnimationLoop(null);
    },
    get isOpen() { return !container.hidden; },
    setDate(d) {
      date = d;
      if (!container.hidden) applyDate();
    },
  };
  return api;
}
