import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { makeProgram } from './materials.js';
import { cosmeticMaterialEngine } from '../armory/CosmeticMaterialEngine.js';

export const renderer = typeof document !== 'undefined' ? new THREE.WebGLRenderer({ antialias: true }) : null;
if (renderer) {
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, state.isTouchDevice ? 1.5 : 2));
  renderer.setSize(typeof innerWidth !== 'undefined' ? innerWidth : 800, typeof innerHeight !== 'undefined' ? innerHeight : 600);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  if (typeof document !== 'undefined' && document.body && !renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }
}

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060a);
scene.fog = new THREE.Fog(0x02090f, 55, 170);

if (typeof window !== 'undefined') {
  window.__tronScene = scene;
}

export const camera = new THREE.PerspectiveCamera(
  70,
  typeof innerWidth !== 'undefined' && innerHeight ? innerWidth / innerHeight : 1,
  0.1,
  400
);

// Lights
scene.add(new THREE.HemisphereLight(0x3f9ab5, 0x061820, 0.95));
export const key = new THREE.DirectionalLight(0x9ff0ff, 0.8);
key.position.set(30, 60, 20);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
export const d = config.ARENA + 10;
key.shadow.camera.left = -d;
key.shadow.camera.right = d;
key.shadow.camera.top = d;
key.shadow.camera.bottom = -d;
scene.add(key);

// Floor plane & decorative grid/rings
export const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(config.ARENA * 2, config.ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.visible = false;
scene.add(floor);

export const grid = new THREE.GridHelper(config.ARENA * 2, 46, config.CYAN, 0x1f9fb8);
grid.material.transparent = true;
grid.material.opacity = .8;
grid.material.blending = THREE.AdditiveBlending;
grid.material.depthWrite = false;
grid.position.y = 0.03;
grid.renderOrder = 1;
grid.visible = false;
scene.add(grid);

export const ring = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.5, 96),
  new THREE.MeshBasicMaterial({ color: config.CYAN, side: THREE.DoubleSide, transparent: true, opacity: .5 })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = .03;
scene.add(ring);

export function onResize() {
  if (typeof innerWidth === 'undefined' || typeof innerHeight === 'undefined') return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isTouchDevice ? 1.5 : 2));
  if (typeof window !== 'undefined' && window.__tronCheckOrientation) {
    window.__tronCheckOrientation();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  document.addEventListener('fullscreenchange', onResize);
  document.addEventListener('webkitfullscreenchange', onResize);
  document.addEventListener('mozfullscreenchange', onResize);
  document.addEventListener('MSFullscreenChange', onResize);
}

export function updateCamera(dt, snap = false) {
  const DIST = 9.0, HEIGHT = 4.3, SHOULDER = 1.7;
  const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const back = new THREE.Vector3(-fwd.x, 0, -fwd.z);

  const pivot = state.player.pos.clone();
  pivot.y += 1.8 + state.player.y * 0.85;

  const camOff = back.clone().multiplyScalar(DIST)
    .addScaledVector(right, SHOULDER)
    .setY(HEIGHT - 1.8 - state.player.pitch * 5.0);

  // Soft boundary compression along boom to prevent wall clipping and player pass-through
  const maxArena = config.ARENA - 2;
  let scale = 1.0;
  for (const axis of ['x', 'z']) {
    const rawVal = pivot[axis] + camOff[axis];
    if (rawVal > maxArena && camOff[axis] > 1e-4) {
      const s = (maxArena - pivot[axis]) / camOff[axis];
      if (s < scale) scale = s;
    } else if (rawVal < -maxArena && camOff[axis] < -1e-4) {
      const s = (-maxArena - pivot[axis]) / camOff[axis];
      if (s < scale) scale = s;
    }
  }
  scale = THREE.MathUtils.clamp(scale, 0.3, 1.0);

  const desired = pivot.clone().add(camOff.clone().multiplyScalar(scale));
  desired.y = Math.max(1.4, desired.y);
  desired.x = THREE.MathUtils.clamp(desired.x, -maxArena, maxArena);
  desired.z = THREE.MathUtils.clamp(desired.z, -maxArena, maxArena);

  if (snap) {
    camera.position.copy(desired);
  } else {
    camera.position.lerp(desired, 1 - Math.pow(.000000015, dt));
  }

  // Set rotation directly from pitch/yaw using Euler YXZ to eliminate gimbal lock and lookAt singularities
  camera.rotation.set(state.player.pitch, state.player.yaw, 0, 'YXZ');

  if (state.shakeAmt > 0) {
    camera.position.x += (Math.random() - .5) * state.shakeAmt;
    camera.position.y += (Math.random() - .5) * state.shakeAmt;
    camera.position.z += (Math.random() - .5) * state.shakeAmt;
    state.shakeAmt = Math.max(0, state.shakeAmt - dt * 2.2);
  }
}

export function snapCamera() {
  updateCamera(0, true);
}

export function initGraphics() {
  if (renderer && renderer.domElement && typeof document !== 'undefined' && document.body && !renderer.domElement.parentElement) {
    document.body.appendChild(renderer.domElement);
  }
  if (!state.player.obj) {
    state.player.obj = makeProgram(config.CYAN, { isPlayer: true, helmetType: 'flynn' });
    scene.add(state.player.obj);
    cosmeticMaterialEngine.init({ playerObj: state.player.obj });
  } else {
    cosmeticMaterialEngine.setPlayerRig(state.player.obj);
  }
  if (typeof window !== 'undefined' && window.__tronInitPhysicsVisuals) {
    window.__tronInitPhysicsVisuals(scene);
  }
  return renderer;
}
