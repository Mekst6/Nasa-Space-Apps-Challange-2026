import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { fixedToScene, latLonToScene } from './frames.js';

export const MOON_RADIUS = 1; // scene units; 1 unit = 1737.4 km

// Selenographic coordinates -> scene vector (see frames.js for the axis convention).
export function latLonToVector3(latDeg, lonDeg, radius = MOON_RADIUS) {
  return new THREE.Vector3(...latLonToScene(latDeg, lonDeg, radius));
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
  controls.maxDistance = 9;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;

  // Sunlight comes from the real sun direction (setSunDirection). The faint ambient term stands in
  // for earthshine so the night side stays readable.
  const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
  sunLight.position.set(10, 0, 0);
  scene.add(sunLight, new THREE.AmbientLight(0x8fa6c8, 0.12));

  // Earth marker: right direction, not to scale (the real Earth is ~220 lunar radii away).
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x4f8fe0 }),
  );
  const EARTH_DISTANCE = 3.4;
  const earthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0x4f8fe0, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.6 }),
  );
  scene.add(earth, earthLine);

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

  // Directions are unit vectors in the lunar body-fixed frame (ephemeris.js).
  function setSunDirection(fixedDir) {
    sunLight.position.set(...fixedToScene(fixedDir)).multiplyScalar(10);
  }

  function setEarthDirection(fixedDir) {
    const dir = new THREE.Vector3(...fixedToScene(fixedDir));
    earth.position.copy(dir).multiplyScalar(EARTH_DISTANCE);
    const positions = earthLine.geometry.attributes.position;
    positions.setXYZ(0, dir.x * 1.02, dir.y * 1.02, dir.z * 1.02);
    positions.setXYZ(1, earth.position.x, earth.position.y, earth.position.z);
    positions.needsUpdate = true;
    earthLine.computeLineDistances();
  }

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener('resize', onResize);

  const frameCallbacks = [];
  let lastFrame = null;
  renderer.setAnimationLoop((now) => {
    const dtSeconds = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    controls.update();
    for (const cb of frameCallbacks) cb(dtSeconds);
    renderer.render(scene, camera);
  });

  return {
    scene, camera, renderer, controls, moon, markers, earth,
    lookAtLatLon, setSunDirection, setEarthDirection,
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
