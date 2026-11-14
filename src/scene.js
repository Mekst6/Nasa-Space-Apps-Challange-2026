import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const MOON_RADIUS = 1; // scene units; 1 unit = 1737.4 km

const DEG = Math.PI / 180;

// Selenographic coordinates -> scene vector, matching the UV layout of
// THREE.SphereGeometry with an equirectangular texture centered on 0° longitude:
// +Y = north pole, +X = (0°, 0°), -Z = (0°, 90° E).
export function latLonToVector3(latDeg, lonDeg, radius = MOON_RADIUS) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon),
  );
}

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);

  const camera = new THREE.PerspectiveCamera(
    40, container.clientWidth / container.clientHeight, 0.01, 100,
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.15;
  controls.maxDistance = 8;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;

  // Placeholder lighting until the real sun direction arrives in M3.
  scene.add(new THREE.AmbientLight(0xffffff, 2.5));

  const texture = new THREE.TextureLoader().load(
    `${import.meta.env.BASE_URL}textures/moon_color_4k.jpg`,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(MOON_RADIUS, 256, 128),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }),
  );
  scene.add(moon);

  const markers = new THREE.Group();
  moon.add(markers);

  function lookAtLatLon(latDeg, lonDeg, distance = 3) {
    camera.position.copy(latLonToVector3(latDeg, lonDeg, distance));
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  const frameCallbacks = [];
  renderer.setAnimationLoop(() => {
    controls.update();
    for (const cb of frameCallbacks) cb();
    renderer.render(scene, camera);
  });

  return {
    scene, camera, renderer, controls, moon, markers,
    lookAtLatLon,
    onFrame: (cb) => frameCallbacks.push(cb),
  };
}

// Small pin standing on the surface: a dot plus a short stem along the normal.
export function createMarker(latDeg, lonDeg, color = 0xff5a3c) {
  const group = new THREE.Group();
  const normal = latLonToVector3(latDeg, lonDeg, 1);
  const stemLength = 0.04;

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0015, 0.0015, stemLength, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  stem.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + stemLength / 2));
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 16, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  head.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + stemLength));

  const base = new THREE.Mesh(
    new THREE.RingGeometry(0.004, 0.007, 24),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
  );
  base.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + 0.0005));
  base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  group.add(stem, head, base);
  group.userData.anchor = head.position.clone();
  return group;
}
