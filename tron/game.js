import * as THREE from './vendor/three.module.js';
window.THREE = THREE;

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ───────────────────────────── constants ─────────────────────────────
const ARENA = 46;              // half-extent of the square grid
const CYAN = 0x4ff2ff, ORANGE = 0xff6a10, WHITE = 0xffffff, PURPLE = 0xb026ff;
const PLAYER_R = 0.9, FOE_R = 0.95, DISC_R = 0.55;
const CURVE_ACCEL = 38.0;              // lateral Magnus acceleration m/s^2 (hooks around pillars)
const CURVE_LAMBDA = 0.45;             // exponential decay rate per second

// ───────────────────────────── touch & environment ───────────────────
let isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
if (isTouchDevice) document.body.classList.add('touch-device');

// ───────────────────────────── renderer ──────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060a);
scene.fog = new THREE.Fog(0x02090f, 55, 170);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);

let orientationPaused = false;
function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const orientOverlay = document.getElementById('orientationOverlay');
  if (isTouchDevice && isPortrait) {
    if (orientOverlay) orientOverlay.style.display = 'flex';
    if (running && !paused) {
      orientationPaused = true;
      pauseGame();
    }
  } else {
    if (orientOverlay) orientOverlay.style.display = 'none';
    if (orientationPaused) {
      orientationPaused = false;
      resumeGame();
    }
  }
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
  checkOrientation();
});
window.addEventListener('orientationchange', checkOrientation);

// ───────────────────────────── arena build ───────────────────────────
scene.add(new THREE.HemisphereLight(0x3f9ab5, 0x061820, 0.95));
const key = new THREE.DirectionalLight(0x9ff0ff, 0.8);
key.position.set(30, 60, 20); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
const d = ARENA + 10;
key.shadow.camera.left = -d; key.shadow.camera.right = d;
key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
scene.add(key);

// floor - modular destructible grid tiles
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA * 2, ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 })
);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.visible = false; scene.add(floor);

const grid = new THREE.GridHelper(ARENA * 2, 46, CYAN, 0x1f9fb8);
grid.material.transparent = true; grid.material.opacity = .8;
grid.material.blending = THREE.AdditiveBlending; grid.material.depthWrite = false;
grid.position.y = 0.03; grid.renderOrder = 1; grid.visible = false; scene.add(grid);

// reflective-ish sheen ring at centre
const ring = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.5, 96),
  new THREE.MeshBasicMaterial({ color: CYAN, side: THREE.DoubleSide, transparent: true, opacity: .5 })
);
ring.rotation.x = -Math.PI / 2; ring.position.y = .03; scene.add(ring);

// ──────────────────────── modular destructible floor ─────────────────────
const TILE_N = 24;
const TILE_W = (ARENA * 2) / TILE_N;
const TILE_WARN_DURATION = 0.75;
const TILE_REGEN_DELAY = 12.0;

const TILE_INTACT = 0;
const TILE_WARNING = 1;
const TILE_FALLEN = 2;
const TILE_REBUILDING = 3;

// Map: key `${ix}_${iz}` -> { mesh, slabMesh, edgeMesh, state, timer, origY, ix, iz, center, regenTimer, warningColor }
const tiles = new Map();

const tileGeo = new THREE.BoxGeometry(TILE_W - 0.08, 0.35, TILE_W - 0.08);
const tileEdgeGeo = new THREE.EdgesGeometry(tileGeo);
const tileMatIntact = new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 });
const tileEdgeMatIntact = new THREE.LineBasicMaterial({ color: 0x187588, transparent: true, opacity: .75, depthWrite: false });

const tileGroup = new THREE.Group();
scene.add(tileGroup);

for (let ix = 0; ix < TILE_N; ix++) {
  for (let iz = 0; iz < TILE_N; iz++) {
    const cx = -ARENA + (ix + 0.5) * TILE_W;
    const cz = -ARENA + (iz + 0.5) * TILE_W;
    const mesh = new THREE.Group();
    mesh.position.set(cx, 0, cz);

    const slabMesh = new THREE.Mesh(tileGeo, tileMatIntact);
    slabMesh.position.y = -0.175;
    slabMesh.receiveShadow = true;

    const edgeMesh = new THREE.LineSegments(tileEdgeGeo, tileEdgeMatIntact);
    edgeMesh.position.y = -0.175;

    mesh.add(slabMesh, edgeMesh);
    tileGroup.add(mesh);

    tiles.set(`${ix}_${iz}`, {
      mesh,
      slabMesh,
      edgeMesh,
      state: TILE_INTACT,
      timer: 0,
      origY: 0,
      ix,
      iz,
      center: new THREE.Vector3(cx, 0, cz),
      regenTimer: 0,
      warningColor: CYAN
    });
  }
}

function worldToTile(x, z) {
  const ix = Math.min(TILE_N - 1, Math.max(0, Math.floor((x + ARENA) / TILE_W)));
  const iz = Math.min(TILE_N - 1, Math.max(0, Math.floor((z + ARENA) / TILE_W)));
  return { ix, iz };
}

function tileToWorld(ix, iz) {
  return {
    x: -ARENA + (ix + 0.5) * TILE_W,
    z: -ARENA + (iz + 0.5) * TILE_W
  };
}

function getTileAt(x, z) {
  if (Math.abs(x) > ARENA || Math.abs(z) > ARENA) return null;
  const { ix, iz } = worldToTile(x, z);
  return tiles.get(`${ix}_${iz}`) || null;
}

function findNearestIntactTile(x, z) {
  const { ix: cix, iz: ciz } = worldToTile(x, z);
  let best = null;
  let bestDistSq = Infinity;
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = cix + dx, nz = ciz + dz;
        if (nx < 0 || nx >= TILE_N || nz < 0 || nz >= TILE_N) continue;
        const t = tiles.get(`${nx}_${nz}`);
        if (t && t.state === TILE_INTACT) {
          const w = tileToWorld(nx, nz);
          const d2 = (w.x - x) ** 2 + (w.z - z) ** 2;
          if (d2 < bestDistSq) {
            bestDistSq = d2;
            best = w;
          }
        }
      }
    }
    if (best) return best;
  }
  return { x: 0, z: 0 };
}

// walls: dark slab + glowing top edge
const wallMat = new THREE.MeshStandardMaterial({ color: 0x04141c, roughness: .4, metalness: .9 });
const glowMat = new THREE.MeshBasicMaterial({ color: CYAN });
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(ARENA * 2 + 2, 9, 1.4), wallMat);
  const g = new THREE.Mesh(new THREE.BoxGeometry(ARENA * 2 + 2, .22, 1.7), glowMat);
  const a = i * Math.PI / 2;
  const p = new THREE.Vector3(Math.sin(a) * ARENA, 4.5, Math.cos(a) * ARENA);
  w.position.copy(p); w.rotation.y = a; w.receiveShadow = true;
  g.position.set(p.x, 9.1, p.z); g.rotation.y = a;
  scene.add(w, g);
  // vertical light strips
  for (let k = -ARENA + 6; k < ARENA; k += 11) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(.18, 8.4, .1), glowMat);
    s.position.set(p.x + Math.cos(a) * k, 4.4, p.z - Math.sin(a) * k);
    s.rotation.y = a; scene.add(s);
  }
}

// pillars = cover + ricochet surfaces
const pillars = [];
const pillarSpots = [[-20,-20],[20,-20],[-20,20],[20,20],[0,-30],[0,30],[-31,0],[31,0]];
for (const [x, z] of pillarSpots) {
  const r = 2.1, h = 6.5;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), wallMat);
  m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const e = new THREE.Mesh(new THREE.CylinderGeometry(r + .05, r + .05, .2, 6), glowMat);
  e.position.set(x, h, z); scene.add(e);
  pillars.push({ x, z, r });
}

// ───────────────────────────── helpers ───────────────────────────────
const tmp = new THREE.Vector3();
const _discMat = new THREE.Matrix4();
const _fwd = new THREE.Vector3();
const _r0 = new THREE.Vector3();
const _u0 = new THREE.Vector3();
const _uBank = new THREE.Vector3();
const _rBank = new THREE.Vector3();
const _localX = new THREE.Vector3();
const _localY = new THREE.Vector3();

// duel AI reusable scratch vectors (zero heap allocations in hot loop)
const _duelToP = new THREE.Vector3();
const _duelSide = new THREE.Vector3();
const _duelWant = new THREE.Vector3();
const _duelSafe = new THREE.Vector3();
const _duelCoverDir = new THREE.Vector3();
const _duelLead = new THREE.Vector3();
const _duelAimDir = new THREE.Vector3();
const _duelOrigin = new THREE.Vector3();
const _duelEvade = new THREE.Vector3();

function makeProgram(color) {
  const g = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: .35, metalness: .9 });
  const lit = new THREE.MeshBasicMaterial({ color });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.55, 1.0, 6, 12), suit);
  torso.position.y = 1.5; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12), suit);
  head.position.y = 2.42; head.castShadow = true; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .1), lit);
  visor.position.set(0, 2.45, .33); g.add(visor);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .75, 4, 8), suit);
    leg.position.set(s * .26, .55, 0); leg.castShadow = true; g.add(leg);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .7, 4, 8), suit);
    arm.position.set(s * .72, 1.6, 0); arm.castShadow = true; g.add(arm);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.5, .06), lit);
    strip.position.set(s * .58, 1.5, .16); g.add(strip);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, .05), lit);
    shin.position.set(s * .26, .55, .2); g.add(shin);
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(.56, .045, 6, 24), lit);
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.0; g.add(belt);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .06), lit);
  chest.position.set(0, 1.85, .5); g.add(chest);
  // back-mounted disc
  const disc = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  disc.position.set(0, 1.8, -.45); disc.rotation.x = Math.PI / 2; g.add(disc);
  g.userData.backDisc = disc;
  const halo = new THREE.PointLight(color, 1.6, 9); halo.position.y = 1.5; g.add(halo);
  return g;
}

function discGeo() {
  const g = new THREE.TorusGeometry(DISC_R, .085, 8, 40);
  return g;
}

function makeDisc(color) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(DISC_R - .06, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, side: THREE.DoubleSide })
  );
  const hub = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 6, 20), new THREE.MeshBasicMaterial({ color: WHITE }));
  g.add(outer, face, hub);
  g.add(new THREE.PointLight(color, 2.4, 10));
  return g;
}

// particle burst pool
const sparks = [];
function burst(pos, color, n = 22, power = 10) {
  if (isTouchDevice) n = Math.max(1, Math.round(n * 0.5));
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = [];
  for (let i = 0; i < n; i++) {
    p[i*3] = pos.x; p[i*3+1] = pos.y; p[i*3+2] = pos.z;
    v.push(new THREE.Vector3(Math.random()-.5, Math.random()*.9, Math.random()-.5).normalize().multiplyScalar(power*(.4+Math.random())));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); sparks.push({ pts, v, life: 0.85, max: 0.85 });
}

function triggerTileWarning(tile, color = CYAN) {
  if (!tile || tile.state !== TILE_INTACT) return;
  tile.state = TILE_WARNING;
  tile.timer = TILE_WARN_DURATION;
  tile.warningColor = color;
  tile.slabMesh.material = new THREE.MeshStandardMaterial({
    color: 0x07202c,
    roughness: .28,
    metalness: .8,
    emissive: color,
    emissiveIntensity: 1.0,
    transparent: true
  });
  tile.edgeMesh.material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0
  });
  playWarningSound();
}

function spawnTileDeRezSparks(cx, cz) {
  const hw = (TILE_W - 0.08) * 0.5;
  const pts = [
    new THREE.Vector3(cx - hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz + hw),
    new THREE.Vector3(cx - hw, 0.1, cz + hw),
    new THREE.Vector3(cx, 0.1, cz)
  ];
  for (const p of pts) burst(p, CYAN, 12, 8);
  playTileDropSound();
  shake(0.12);
}

function updateTiles(dt) {
  for (const tile of tiles.values()) {
    if (tile.state === TILE_INTACT) continue;

    if (tile.state === TILE_WARNING) {
      tile.timer -= dt;
      const strobe = 0.5 + 0.5 * Math.sin(time * 40);
      const isWhite = Math.sin(time * 40) > 0;
      const col = isWhite ? 0xffffff : (tile.warningColor || CYAN);

      tile.slabMesh.material.emissive.setHex(col);
      tile.slabMesh.material.emissiveIntensity = 0.5 + strobe * 1.5;
      tile.edgeMesh.material.color.setHex(col);
      tile.edgeMesh.material.opacity = strobe;

      // Shake tile vertically by +-0.05m
      tile.mesh.position.y = tile.origY + Math.sin(time * 60) * 0.05;

      if (tile.timer <= 0) {
        tile.state = TILE_FALLEN;
        tile.regenTimer = 0;
        tile.mesh.position.y = tile.origY;
        spawnTileDeRezSparks(tile.center.x, tile.center.z);
      }
    } else if (tile.state === TILE_FALLEN) {
      // Animate falling downward: y_tile <- y_tile - 25 * dt
      tile.mesh.position.y -= 25 * dt;

      // After falling 15m, set mesh.visible = false
      if (tile.mesh.position.y <= tile.origY - 15) {
        tile.mesh.visible = false;
      }

      // Tile Regeneration after delay
      tile.regenTimer = (tile.regenTimer || 0) + dt;
      if (tile.regenTimer >= TILE_REGEN_DELAY) {
        tile.state = TILE_REBUILDING;
        tile.mesh.visible = true;
        tile.mesh.position.y = tile.origY - 15;
        tile.slabMesh.material.emissive.setHex(CYAN);
        tile.slabMesh.material.emissiveIntensity = 0.5;
        tile.edgeMesh.material.color.setHex(CYAN);
        playWarningSound();
      }
    } else if (tile.state === TILE_REBUILDING) {
      // Slowly re-compile from bottom upward with glowing hologram outline
      tile.mesh.position.y += 8.0 * dt;
      const holoPulse = 0.5 + 0.5 * Math.sin(time * 12);
      tile.slabMesh.material.emissiveIntensity = holoPulse;
      tile.edgeMesh.material.opacity = holoPulse;

      if (tile.mesh.position.y >= tile.origY) {
        tile.mesh.position.y = tile.origY;
        tile.state = TILE_INTACT;
        tile.timer = 0;
        tile.regenTimer = 0;
        if (tile.slabMesh.material !== tileMatIntact) {
          tile.slabMesh.material.dispose();
          tile.edgeMesh.material.dispose();
          tile.slabMesh.material = tileMatIntact;
          tile.edgeMesh.material = tileEdgeMatIntact;
        }
        burst(new THREE.Vector3(tile.center.x, 0.1, tile.center.z), CYAN, 16, 6);
      }
    }
  }
}

// ───────────────────────────── Web Audio synth ───────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playDeRezSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.85);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.85);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (_) {}
}

function playWarningSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1174, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

function playTileDropSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch (_) {}
}

window.derezAudioHook = playDeRezSound;


// ───────────────────────── trajectory preview ────────────────────────
// Runs the EXACT same integration the live disc uses, so the dotted arc is a
// real simulation of the throw (walls, pillars, bounce count, return curve),
// not a decorative straight line.
function simulatePath(origin, vel, maxBounces = 3, tMax = 1.5, step = 1 / 90, curve = 0) {
  const p = origin.clone(), v = vel.clone();
  const pts = [p.clone()], bounceAt = [];
  let bounces = 0, t = 0, hitFoe = null;
  let k = curve;
  const lim = ARENA - 1.5;

  while (t < tMax && bounces <= maxBounces) {
    t += step;

    if (k) {
      const vx = v.x, vy = v.y, vz = v.z;
      const speed = Math.hypot(vx, vy, vz);
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = k * CURVE_ACCEL * step;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newSpeed = Math.hypot(nvx, vy, nvz);
        if (newSpeed > 1e-4) {
          const s = speed / newSpeed;
          v.x = nvx * s;
          v.y = vy * s;
          v.z = nvz * s;
        }
      }
      k *= Math.exp(-CURVE_LAMBDA * step);
    }

    p.addScaledVector(v, step);
    if (p.y > DISC_R) {
      p.y += (1.7 - p.y) * Math.min(1, step * 2.2);        // same hover easing
    }

    // floor collision & void check
    const yFloor = DISC_R;
    if (p.y <= yFloor) {
      const tile = getTileAt(p.x, p.z);
      const isSolid = tile && tile.state !== TILE_FALLEN && tile.state !== TILE_REBUILDING;
      if (isSolid) {
        p.y = yFloor;
        if (v.y < 0) {
          const sig = Math.abs(v.y) >= 1.0;
          v.y = -v.y * 0.65;
          v.x *= 0.95;
          v.z *= 0.95;
          if (Math.abs(v.y) < 1.0) v.y = 0;
          if (sig) {
            bounces++;
            bounceAt.push(p.clone());
          }
        }
      } else {
        // Tile is FALLEN: do not reflect vertically; allow path to trace into void
        v.y -= 25 * step;
      }
    }

    let hit = false;
    if (p.x >  lim) { p.x =  lim; v.x *= -1; hit = true; }
    if (p.x < -lim) { p.x = -lim; v.x *= -1; hit = true; }
    if (p.z >  lim) { p.z =  lim; v.z *= -1; hit = true; }
    if (p.z < -lim) { p.z = -lim; v.z *= -1; hit = true; }
    for (const pl of pillars) {
      const dx = p.x - pl.x, dz = p.z - pl.z;
      const dd = Math.hypot(dx, dz), min = pl.r + DISC_R;
      if (dd < min && dd > 1e-4) {
        const nx = dx / dd, nz = dz / dd;
        p.x = pl.x + nx * min; p.z = pl.z + nz * min;
        const dot = v.x * nx + v.z * nz;
        v.x -= 2 * dot * nx; v.z -= 2 * dot * nz;
        hit = true;
      }
    }
    if (hit) {
      bounces++;
      bounceAt.push(p.clone());
      k = -k * 0.5;
    }

    // does it intercept a program?
    const simFoes = (gameMode === 'duel_multi' && duelOpponent) ? [duelOpponent] : foes;
    for (const f of simFoes) {
      if (p.distanceTo(tmp.copy(f.pos).setY(1.5 + (f.y || 0))) < FOE_R + DISC_R + .35) {
        hitFoe = { foe: f, point: p.clone(), bounces };
        pts.push(p.clone());
        return { pts, bounceAt, hitFoe };
      }
    }
    pts.push(p.clone());
  }
  return { pts, bounceAt, hitFoe };
}

// visuals: dotted line + bounce pips + impact reticle
const trajLine = new THREE.Line(
  new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(1500 * 3), 3)),
  new THREE.LineDashedMaterial({ color: CYAN, dashSize: .45, gapSize: .35, transparent: true, opacity: .55,
                                 blending: THREE.AdditiveBlending, depthWrite: false })
);
trajLine.frustumCulled = false; scene.add(trajLine);

const bouncePips = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(.35, .5, 20),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .8, side: THREE.DoubleSide,
                                  blending: THREE.AdditiveBlending, depthWrite: false })
  );
  m.visible = false; scene.add(m); bouncePips.push(m);
}
const impactMark = new THREE.Mesh(
  new THREE.RingGeometry(.55, .75, 24),
  new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: .9, side: THREE.DoubleSide,
                                blending: THREE.AdditiveBlending, depthWrite: false })
);
impactMark.visible = false; scene.add(impactMark);

// Incoming enemy discs get a faint predicted path too, so a ricochet coming at
// your back is readable and parryable instead of a cheap shot.
const threatLines = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)),
    new THREE.LineDashedMaterial({ color: ORANGE, dashSize: .3, gapSize: .5, transparent: true, opacity: .3,
                                   blending: THREE.AdditiveBlending, depthWrite: false })
  );
  l.frustumCulled = false; l.visible = false; scene.add(l); threatLines.push(l);
}
function updateThreatPaths() {
  let n = 0;
  for (const D of discs) {
    if (D.owner === 'player' || D.returning || n >= threatLines.length) continue;
    const L = threatLines[n++];
    const sim = simulatePath(D.pos.clone(), D.vel.clone(), 2, 0.8, 1 / 90, D.curve || 0);
    const arr = L.geometry.attributes.position.array;
    const c = Math.min(sim.pts.length, 400);
    for (let i = 0; i < c; i++) { arr[i*3] = sim.pts[i].x; arr[i*3+1] = sim.pts[i].y; arr[i*3+2] = sim.pts[i].z; }
    L.geometry.setDrawRange(0, c);
    L.geometry.attributes.position.needsUpdate = true;
    L.geometry.computeBoundingSphere();
    L.computeLineDistances();
    // brighten if this disc is currently tracking toward the player
    const toMe = tmp.copy(player.pos).setY(1.7).sub(D.pos).normalize();
    L.material.opacity = 0.18 + Math.max(0, D.vel.clone().normalize().dot(toMe)) * 0.5;
    L.visible = true;
  }
  for (let i = n; i < threatLines.length; i++) threatLines[i].visible = false;
}

function updateTrajectory(aim, dt) {
  const show = player.alive && player.hasDisc;
  trajLine.visible = show;
  impactMark.visible = false;
  for (const p of bouncePips) p.visible = false;
  if (!show) return null;

  const chest = player.pos.clone().setY(1.7 + player.y);
  const dir = aim.point.clone().sub(chest).normalize();
  const origin = chest.clone().addScaledVector(dir, 1.1);
  const curve = getPlayerCurveIntent();
  const sim = simulatePath(origin, dir.clone().multiplyScalar(38), 3, 1.5, 1 / 90, curve);

  // colour the arc by outcome: white-hot when the line actually connects
  const willHit = !!sim.hitFoe;
  const rearKill = willHit && (() => {
    const f = sim.hitFoe.foe;
    // Since visor is at +Z in local space:
    const fwd = new THREE.Vector3(
      Math.sin(f.obj.rotation.y),
      0,
      Math.cos(f.obj.rotation.y)
    ).normalize();

    // Approach 1 (Position relative to foe)
    const dRel = sim.hitFoe.point.clone().sub(f.pos).setY(0);
    if (dRel.lengthSq() > 1e-6) dRel.normalize();
    const posRear = dRel.dot(fwd) < 0.05;

    // Approach 2 (Velocity alignment)
    const seg = sim.pts[sim.pts.length - 1].clone().sub(sim.pts[Math.max(0, sim.pts.length - 4)]).setY(0);
    if (seg.lengthSq() > 1e-6) seg.normalize();
    const velRear = seg.dot(fwd) > 0.05;

    const rear = posRear || velRear;
    return rear && sim.hitFoe.bounces > 0;
  })();

  const isCurving = Math.abs(curve) > 0.05;
  trajLine.material.color.setHex(rearKill ? 0xffffff : willHit ? ORANGE : isCurving ? 0x7cf6ff : CYAN);
  trajLine.material.opacity = willHit ? .95 : isCurving ? .75 : .45;
  trajLine.material.dashSize = isCurving ? 0.28 : 0.45;
  trajLine.material.gapSize = isCurving ? 0.20 : 0.35;

  const arr = trajLine.geometry.attributes.position.array;
  const n = Math.min(sim.pts.length, 1500);
  for (let i = 0; i < n; i++) {
    arr[i*3] = sim.pts[i].x; arr[i*3+1] = sim.pts[i].y; arr[i*3+2] = sim.pts[i].z;
  }
  trajLine.geometry.setDrawRange(0, n);
  trajLine.geometry.attributes.position.needsUpdate = true;
  trajLine.geometry.computeBoundingSphere();
  trajLine.computeLineDistances();

  sim.bounceAt.slice(0, 4).forEach((b, i) => {
    const pip = bouncePips[i];
    pip.visible = true; pip.position.copy(b);
    pip.lookAt(camera.position);
    pip.material.color.setHex(willHit ? ORANGE : isCurving ? 0x7cf6ff : CYAN);
    pip.scale.setScalar(1 + Math.sin(time * 7 + i) * .12);
  });

  const end = sim.hitFoe ? sim.hitFoe.point : sim.pts[sim.pts.length - 1];
  impactMark.visible = true;
  impactMark.position.copy(end);
  impactMark.lookAt(camera.position);
  impactMark.material.color.setHex(rearKill ? 0xffffff : willHit ? ORANGE : isCurving ? 0x7cf6ff : CYAN);
  impactMark.scale.setScalar((willHit ? 1.3 : .9) + Math.sin(time * 9) * .1);

  return { willHit, rearKill, bounces: sim.bounceAt.length };
}

// ───────────────────────────── state ─────────────────────────────────
const player = {
  obj: makeProgram(CYAN), pos: new THREE.Vector3(0, 0, 14), vel: new THREE.Vector3(),
  yaw: Math.PI, pitch: -0.12, hp: 100, energy: 100, hasDisc: true, blocking: false,
  discCharge: 1, dashCd: 0, hurtFlash: 0, alive: true,
  y: 0, vy: 0, grounded: true, jumps: 0, jumpHeld: false
};
scene.add(player.obj);

let gameMode = 'swarm'; // 'duel', 'swarm', or 'duel_multi'
let duelTier = 1;
let foes = [], discs = [], wave = 1, score = 0, running = false, spawnTimer = 0, gameOverT = 0;

// ───────────────────────────── multiplayer networking ────────────────
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tron-disc-arena';
let db = null, auth = null, currentUser = null;

let currentRoomId = null;
let playerRole = null; // 'p1' (host) or 'p2' (guest)
let roomUnsubscribe = null;
let duelOpponent = null;
let lastProcessedThrowId = null;
let roomFallenTiles = [];
let netSyncTimer = 0;

// Mock peer network for multi-tab testing / offline fallback
let mockChannel = null;
const mockStore = new Map();
const mockListeners = new Map();

function initMockNetwork() {
  if (currentUser) return;
  const dummyUid = 'user_' + Math.random().toString(36).substring(2, 9);
  currentUser = { uid: dummyUid, isAnonymous: true };
  auth = { currentUser };
  db = { isMock: true };

  if (!mockChannel && typeof BroadcastChannel !== 'undefined') {
    mockChannel = new BroadcastChannel('tron_disc_arena_mock_net_' + appId);
    mockChannel.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.type === 'doc_set' || msg.type === 'doc_update') {
        mockStore.set(msg.path, msg.data);
        const set = mockListeners.get(msg.path);
        if (set) {
          const snap = {
            exists: () => true,
            data: () => JSON.parse(JSON.stringify(msg.data))
          };
          for (const cb of set) {
            try { cb(snap); } catch (err) { console.error(err); }
          }
        }
      } else if (msg.type === 'doc_query') {
        let stored = mockStore.get(msg.path);
        if (!stored && typeof localStorage !== 'undefined') {
          try {
            const item = localStorage.getItem('tron_doc_' + msg.path);
            if (item) stored = JSON.parse(item);
          } catch (_) {}
        }
        if (stored) {
          mockStore.set(msg.path, stored);
          mockChannel.postMessage({ type: 'doc_set', path: msg.path, data: stored });
        }
      }
    };
  }
}

function mockDocRef(path, id) {
  return { isMock: true, path, id };
}

function mockSetDoc(ref, data) {
  if (!currentUser) return Promise.resolve();
  const serialized = JSON.parse(JSON.stringify(data));
  mockStore.set(ref.path, serialized);
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('tron_doc_' + ref.path, JSON.stringify(serialized)); } catch (_) {}
  }
  if (mockChannel) {
    mockChannel.postMessage({ type: 'doc_set', path: ref.path, data: serialized });
  }
  const set = mockListeners.get(ref.path);
  if (set) {
    const snap = { exists: () => true, data: () => JSON.parse(JSON.stringify(serialized)) };
    for (const cb of set) {
      try { cb(snap); } catch (err) { console.error(err); }
    }
  }
  return Promise.resolve();
}

function mockGetDoc(ref) {
  let data = mockStore.get(ref.path);
  if (!data && typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem('tron_doc_' + ref.path);
      if (item) {
        data = JSON.parse(item);
        mockStore.set(ref.path, data);
      }
    } catch (_) {}
  }
  return Promise.resolve({
    exists: () => !!data,
    data: () => data ? JSON.parse(JSON.stringify(data)) : null
  });
}

function mockUpdateDoc(ref, patch) {
  if (!currentUser) return Promise.resolve();
  let existing = mockStore.get(ref.path);
  if (!existing && typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem('tron_doc_' + ref.path);
      if (item) existing = JSON.parse(item);
    } catch (_) {}
  }
  const merged = Object.assign({}, existing || {}, JSON.parse(JSON.stringify(patch)));
  if (patch.p1 && existing && existing.p1) merged.p1 = Object.assign({}, existing.p1, patch.p1);
  if (patch.p2 && existing && existing.p2) merged.p2 = Object.assign({}, existing.p2, patch.p2);

  mockStore.set(ref.path, merged);
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('tron_doc_' + ref.path, JSON.stringify(merged)); } catch (_) {}
  }
  if (mockChannel) {
    mockChannel.postMessage({ type: 'doc_update', path: ref.path, data: merged });
  }
  const set = mockListeners.get(ref.path);
  if (set) {
    const snap = { exists: () => true, data: () => JSON.parse(JSON.stringify(merged)) };
    for (const cb of set) {
      try { cb(snap); } catch (err) { console.error(err); }
    }
  }
  return Promise.resolve();
}

function mockOnSnapshot(ref, onUpdate, onError) {
  if (!mockListeners.has(ref.path)) {
    mockListeners.set(ref.path, new Set());
  }
  const set = mockListeners.get(ref.path);
  set.add(onUpdate);

  mockGetDoc(ref).then(snap => {
    if (snap.exists() && set.has(onUpdate)) {
      try { onUpdate(snap); } catch (err) { if (onError) onError(err); }
    } else if (mockChannel) {
      mockChannel.postMessage({ type: 'doc_query', path: ref.path });
    }
  });

  return () => {
    set.delete(onUpdate);
  };
}

async function initNetwork() {
  if (db) return;
  if (typeof __firebase_config === 'undefined' || !__firebase_config) {
    if (window.__useMockNetwork !== false && (typeof BroadcastChannel !== 'undefined' || typeof localStorage !== 'undefined')) {
      initMockNetwork();
      return;
    }
    console.warn("No Firebase configuration found; multiplayer offline.");
    return;
  }
  try {
    const firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
    currentUser = auth.currentUser;
  } catch (err) {
    console.warn("Firebase initialization error:", err);
    if (window.__useMockNetwork !== false && typeof BroadcastChannel !== 'undefined') {
      initMockNetwork();
    }
  }
}

function getRoomRef(roomCode) {
  if (db && db.isMock) {
    return mockDocRef(`artifacts/${appId}/public/data/rooms/${roomCode}`, roomCode);
  }
  return doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
}

function roomSetDoc(roomRef, data) {
  if (!currentUser) return Promise.resolve();
  if (roomRef && roomRef.isMock) {
    return mockSetDoc(roomRef, data);
  }
  return setDoc(roomRef, data);
}

function roomGetDoc(roomRef) {
  if (roomRef && roomRef.isMock) {
    return mockGetDoc(roomRef);
  }
  return getDoc(roomRef);
}

function roomUpdateDoc(roomRef, data) {
  if (!currentUser) return Promise.resolve();
  if (roomRef && roomRef.isMock) {
    return mockUpdateDoc(roomRef, data);
  }
  return updateDoc(roomRef, data);
}

function roomOnSnapshot(roomRef, onUpdate, onError) {
  if (roomRef && roomRef.isMock) {
    return mockOnSnapshot(roomRef, onUpdate, onError);
  }
  return onSnapshot(roomRef, onUpdate, onError);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function copyRoomCode(code) {
  try {
    const el = document.createElement('textarea');
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    message('ROOM CODE COPIED');
  } catch (err) {
    message('CODE: ' + code);
  }
}

function showHostWaitingModal(code) {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = 'DUEL ROOM';
  const rs = document.getElementById('roomSubtitle');
  if (rs) rs.textContent = 'SHARE THIS CODE WITH YOUR FRIEND';
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) {
    rcd.style.display = 'block';
    rcd.textContent = code;
  }
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'block';
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'none';
}

function showJoinInputModal() {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'flex';
  const rt = document.getElementById('roomTitle');
  if (rt) rt.textContent = 'JOIN DUEL';
  const rs = document.getElementById('roomSubtitle');
  if (rs) {
    rs.textContent = 'ENTER 4-DIGIT CODE';
    rs.style.color = '#a5f0fa';
  }
  const rcd = document.getElementById('roomCodeDisplay');
  if (rcd) rcd.style.display = 'none';
  const hwb = document.getElementById('hostWaitBlock');
  if (hwb) hwb.style.display = 'none';
  const jib = document.getElementById('joinInputBlock');
  if (jib) jib.style.display = 'block';
  const inp = document.getElementById('joinRoomInput');
  if (inp) {
    inp.value = '';
    setTimeout(() => inp.focus(), 50);
  }
}

async function onClickCreateRoom(e) {
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  try {
    await initNetwork();
    if (!currentUser) {
      message('MULTIPLAYER OFFLINE');
      return;
    }
    const code = generateRoomCode();
    currentRoomId = code;
    playerRole = 'p1';
    roomFallenTiles = [];

    const roomRef = getRoomRef(code);
    await roomSetDoc(roomRef, {
      code,
      createdAt: Date.now(),
      status: 'waiting',
      hostId: currentUser.uid,
      guestId: null,
      p1: {
        x: 0, y: 0, z: 18, yaw: 3.14, pitch: -0.1,
        hp: 100, blocking: false, hasDisc: true
      },
      p2: {
        x: 0, y: 0, z: -18, yaw: 0, pitch: -0.1,
        hp: 100, blocking: false, hasDisc: true
      },
      lastThrow: null,
      fallen: []
    });

    showHostWaitingModal(code);

    if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
    roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });
  } catch (err) {
    console.error("Create room error:", err);
    message('FAILED TO CREATE ROOM');
  }
}

async function onClickConfirmJoin(e) {
  if (e) {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }
  const inp = document.getElementById('joinRoomInput');
  const code = (inp ? inp.value.trim().toUpperCase() : '');
  if (code.length !== 4) {
    message('ENTER 4-CHAR CODE');
    return;
  }

  const btn = document.getElementById('btnConfirmJoin');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.textContent = 'CONNECTING...';
    btn.disabled = true;
  }
  if (inp) inp.disabled = true;

  try {
    await initNetwork();
    if (!currentUser) {
      throw new Error('OFFLINE - MULTIPLAYER REQUIRES DATA CONNECTION');
    }
    const roomRef = getRoomRef(code);
    const snap = await roomGetDoc(roomRef);
    if (!snap.exists()) {
      throw new Error('ROOM CODE NOT FOUND');
    }
    const data = snap.data();
    if (data.status !== 'waiting') {
      throw new Error('ROOM IN SESSION OR FULL');
    }
    currentRoomId = code;
    playerRole = 'p2';
    roomFallenTiles = data.fallen || [];

    await roomUpdateDoc(roomRef, {
      guestId: currentUser.uid,
      status: 'active'
    });

    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';

    if (roomUnsubscribe) { roomUnsubscribe(); roomUnsubscribe = null; }
    roomUnsubscribe = roomOnSnapshot(roomRef, (snap) => {
      onRoomSnapshot(snap);
    }, (err) => {
      console.warn("Room snapshot error:", err);
      message("CONNECTION ERROR");
    });

    startMultiplayerDuel('p2', code);
    message('CONNECTED TO ARENA — FIGHT!');
  } catch (err) {
    console.error("Join room error:", err);
    message('COULD NOT CONNECT');
    const rs = document.getElementById('roomSubtitle');
    if (rs) {
      rs.textContent = err.message || "CONNECTION FAILED";
      rs.style.color = '#ff3838';
    }
  } finally {
    if (btn) {
      btn.textContent = originalText;
      btn.disabled = false;
    }
    if (inp) inp.disabled = false;
  }
}

function startMultiplayerDuel(role, roomCode) {
  gameMode = 'duel_multi';
  playerRole = role;
  currentRoomId = roomCode;
  lastProcessedThrowId = null;
  netSyncTimer = 0;

  for (const f of foes) scene.remove(f.obj);
  for (const d of discs) scene.remove(d.obj);
  foes = []; discs = [];

  // Reset arena tiles
  for (const tile of tiles.values()) {
    tile.state = TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.visible = true;
    if (tile.slabMesh.material !== tileMatIntact) {
      tile.slabMesh.material.dispose();
      tile.edgeMesh.material.dispose();
      tile.slabMesh.material = tileMatIntact;
      tile.edgeMesh.material = tileEdgeMatIntact;
    }
  }

  // Setup player role kinematic state
  if (role === 'p1') {
    player.pos.set(0, 0, 18);
    player.yaw = Math.PI;
  } else {
    player.pos.set(0, 0, -18);
    player.yaw = 0;
  }
  player.pitch = -0.1;
  player.vel.set(0, 0, 0);
  player.y = 0;
  player.vy = 0;
  player.grounded = true;
  player.jumps = 0;
  player.hp = 100;
  player.energy = 100;
  player.hasDisc = true;
  player.alive = true;
  player.blocking = false;
  player.obj.visible = true;
  player.obj.position.copy(player.pos);
  player.obj.rotation.y = player.yaw;
  player.obj.userData.backDisc.visible = true;

  // Remote opponent model
  if (duelOpponent && duelOpponent.obj) {
    scene.remove(duelOpponent.obj);
  }
  const oppObj = makeProgram(PURPLE);
  scene.add(oppObj);
  const oppStartPos = role === 'p1' ? new THREE.Vector3(0, 0, -18) : new THREE.Vector3(0, 0, 18);
  const oppStartYaw = role === 'p1' ? 0 : Math.PI;
  oppObj.position.copy(oppStartPos);
  oppObj.rotation.y = oppStartYaw;
  duelOpponent = {
    obj: oppObj,
    pos: oppStartPos.clone(),
    targetPos: oppStartPos.clone(),
    y: 0,
    targetY: 0,
    yaw: oppStartYaw,
    targetYaw: oppStartYaw,
    hp: 100,
    blocking: false,
    hasDisc: true,
    alive: true
  };

  running = true;
  paused = false;
  justResumed = true;
  gameOverT = 0;
  gameOverReason = '';

  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const side = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const camOff = new THREE.Vector3()
    .addScaledVector(fwd, -4.2)
    .addScaledVector(side, 1.35)
    .setY(2.2 - player.pitch * 5.0);
  camera.position.copy(player.pos).add(camOff);
  const look = player.pos.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(side, 1.7).addScaledVector(fwd, 14);
  camera.lookAt(look);

  updateHUD();
  tryLock();
  focusGame();
}

function onRoomSnapshot(snap) {
  if (!snap.exists()) return;
  const data = snap.data();
  if (!data) return;

  if (playerRole === 'p1' && data.status === 'active' && gameMode !== 'duel_multi') {
    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';
    startMultiplayerDuel('p1', currentRoomId);
    message('CHALLENGER DETECTED — FIGHT!');
  }

  if (gameMode !== 'duel_multi') return;

  const oppRole = playerRole === 'p1' ? 'p2' : 'p1';
  const oppData = data[oppRole];
  if (oppData && duelOpponent) {
    duelOpponent.targetPos.set(oppData.x, 0, oppData.z);
    duelOpponent.targetY = oppData.y || 0;
    duelOpponent.targetYaw = oppData.yaw;
    if (oppData.hp !== undefined) duelOpponent.hp = oppData.hp;
    duelOpponent.blocking = !!oppData.blocking;
    if (oppData.hasDisc !== undefined) duelOpponent.hasDisc = oppData.hasDisc;

    if (oppData.hp <= 0 && duelOpponent.alive) {
      duelOpponent.alive = false;
      burst(duelOpponent.pos.clone().setY(duelOpponent.y + 1.4), PURPLE, 80, 15);
      duelOpponent.obj.visible = false;
    }
  }

  if (data.lastThrow && data.lastThrow.id !== lastProcessedThrowId && data.lastThrow.sender === oppRole) {
    lastProcessedThrowId = data.lastThrow.id;
    const t = data.lastThrow;
    const origin = new THREE.Vector3(t.x, t.y, t.z);
    const vel = new THREE.Vector3(t.vx, t.vy, t.vz);
    const oppDisc = spawnDisc(origin, vel, duelOpponent, PURPLE, t.curve || 0);
    oppDisc.remoteThrowId = t.id;
    if (duelOpponent) {
      duelOpponent.hasDisc = false;
      if (duelOpponent.obj && duelOpponent.obj.userData && duelOpponent.obj.userData.backDisc) {
        duelOpponent.obj.userData.backDisc.visible = false;
      }
    }
    shake(0.08);
  }

  if (playerRole === 'p2' && Array.isArray(data.fallen)) {
    for (const [ix, iz] of data.fallen) {
      const tileKey = `${ix}_${iz}`;
      const t = tiles.get(tileKey);
      if (t && t.state === TILE_INTACT) {
        triggerTileWarning(t, PURPLE);
      }
    }
  }

  if (data.status === 'finished') {
    if (data.winner === playerRole) {
      showMultiplayerVictory();
    }
  }
}

function syncNetworkState(dt) {
  if (!db || !currentRoomId || gameMode !== 'duel_multi') return;
  if (!currentUser) return;
  netSyncTimer -= dt;
  if (netSyncTimer > 0) return;
  netSyncTimer = 0.055; // ~18 Hz

  const roomRef = getRoomRef(currentRoomId);
  const myState = {
    x: +player.pos.x.toFixed(2),
    y: +player.y.toFixed(2),
    z: +player.pos.z.toFixed(2),
    yaw: +player.yaw.toFixed(2),
    pitch: +player.pitch.toFixed(2),
    hp: player.hp,
    blocking: player.blocking,
    hasDisc: player.hasDisc
  };

  const payload = {};
  payload[playerRole] = myState; // 'p1' or 'p2'
  roomUpdateDoc(roomRef, payload).catch(err => console.warn("Sync err:", err));
}

function onTileDestabilizedByHost(ix, iz) {
  if (gameMode !== 'duel_multi' || playerRole !== 'p1') return;
  if (!currentRoomId || !db || !currentUser) return;
  if (!roomFallenTiles.some(([x, z]) => x === ix && z === iz)) {
    roomFallenTiles.push([ix, iz]);
    const roomRef = getRoomRef(currentRoomId);
    roomUpdateDoc(roomRef, {
      fallen: roomFallenTiles
    }).catch(err => console.warn("Fallen tiles sync err:", err));
  }
}

function showMultiplayerVictory() {
  running = false;
  overlay.style.display = 'flex';
  overlay.innerHTML = `<div class="card" style="border-color:#b026ff;box-shadow:0 0 60px rgba(176,38,255,.3);">
    <h1 style="color:#d896ff;text-shadow:0 0 30px #b026ff">VICTORY</h1>
    <h2>CHALLENGER WAS DEREZZED — GRID SECURED</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ROOM <b style="color:#fff">${currentRoomId || '----'}</b> &nbsp;·&nbsp; ROLE <b style="color:#fff">${playerRole ? playerRole.toUpperCase() : ''}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      <button id="multiMenuBtn" class="btn purple">RETURN TO MENU</button>
    </div>
  </div>`;
  const btn = el('multiMenuBtn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    teardownMultiplayer();
    showModeSelectMenu();
  };
}

function showMultiplayerDefeat() {
  running = false;
  overlay.style.display = 'flex';
  const subtitle = gameOverReason || 'YOU WERE ELIMINATED IN THE ARENA';
  overlay.innerHTML = `<div class="card dead">
    <h1>DEREZZED</h1>
    <h2>${subtitle}</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ROOM <b style="color:#fff">${currentRoomId || '----'}</b> &nbsp;·&nbsp; ROLE <b style="color:#fff">${playerRole ? playerRole.toUpperCase() : ''}</b>
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      <button id="multiMenuBtn" class="btn" style="border-color:var(--orange);color:#ffb37a">RETURN TO MENU</button>
    </div>
  </div>`;
  const btn = el('multiMenuBtn');
  if (btn) btn.onclick = (e) => {
    e.stopPropagation();
    teardownMultiplayer();
    showModeSelectMenu();
  };
}

function teardownMultiplayer() {
  if (roomUnsubscribe) {
    roomUnsubscribe();
    roomUnsubscribe = null;
  }
  if (duelOpponent && duelOpponent.obj) {
    scene.remove(duelOpponent.obj);
    duelOpponent = null;
  }
  for (const d of discs) scene.remove(d.obj);
  discs = [];
  currentRoomId = null;
  playerRole = null;
  lastProcessedThrowId = null;
  roomFallenTiles = [];
  gameMode = 'swarm';
  running = false;
  paused = false;
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}

// ───────────────────────────── input & pause ─────────────────────────
let paused = false, lockFailed = false;
let lastPauseToggle = 0;
let justResumed = false;
const keys = {};
const EAT = ['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyP','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F1'];

function getPlayerCurveIntent() {
  const q = !!keys.KeyQ || touchCurveL;
  const e = !!keys.KeyE || touchCurveR;
  if (q && !e) return -1.0;
  if (e && !q) return 1.0;
  return 0.0;
}

function codeOf(e) {
  if (e.code) return e.code;
  const k = (e.key || '').toLowerCase();          // fallback for odd/synthetic events
  if (k === ' ' || k === 'spacebar' || k === 'space') return 'Space';
  if (k === 'escape' || k === 'esc') return 'Escape';
  if (k.length === 1 && k >= 'a' && k <= 'z') return 'Key' + k.toUpperCase();
  if (k === 'shift') return 'ShiftLeft';
  return '';
}
function onDown(e) {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
  const c = codeOf(e);
  if (!c) return;
  keys[c] = true;
  if (EAT.includes(c)) e.preventDefault();        // no page scroll / button re-trigger
  if (c === 'F1') { const m = document.getElementById('keymon'); if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
  if (c === 'KeyP' || c === 'Escape') {
    if (running) {
      const now = performance.now();
      if (now - lastPauseToggle > 180) {
        lastPauseToggle = now;
        if (paused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    }
  }
}
function onUp(e) { const c = codeOf(e); if (c) keys[c] = false; }
// Capture phase on window intercepts all keyboard events across the whole document
addEventListener('keydown', onDown, { passive: false, capture: true });
addEventListener('keyup', onUp, { capture: true });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (!touchBlocking) player.blocking = false; });  // no stuck keys

const canvas = renderer.domElement;
canvas.tabIndex = 0;                       // canvas can hold keyboard focus
canvas.style.outline = 'none';
canvas.addEventListener('mousedown', () => { if (!isTouchDevice) { focusGame(); if (lockFailed === false && document.pointerLockElement !== canvas && running && !paused) tryLock(); } });
const overlay = document.getElementById('overlay');

function startMode(mode) {
  gameMode = mode;
  if (overlay) overlay.style.display = 'none';
  resetGame();
  paused = false;
  justResumed = true;
  tryLock();
  focusGame();
}

function startGame() {
  startMode(gameMode || 'swarm');
}

function pauseGame() {
  if (!running || paused) return;
  paused = true;
  lastPauseToggle = performance.now();
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'flex';
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}

function resumeGame() {
  if (!running || !paused) return;
  paused = false;
  lastPauseToggle = performance.now();
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  justResumed = true;
  tryLock();
  focusGame();
  setCursor();
}

function restartMatch() {
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  resetGame();
  paused = false;
  justResumed = true;
  tryLock();
  focusGame();
  setCursor();
}

function showModeSelect() {
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  paused = false;
  running = false;
  teardownMultiplayer();
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
  showModeSelectMenu();
}

function getMainMenuHtml() {
  return `<div class="card">
  <h1>TRON</h1><h2>D I S C &nbsp; A R E N A</h2>
  <div class="keys desktop-keys">
    <b>W A S D</b><span>Move &amp; strafe across the grid</span>
    <b>Q / E</b><span>Apply curve spin — hook discs around pillars &amp; obstacles</span>
    <b>Mouse</b><span>Turn the camera freely — the crosshair is your aim point</span>
    <b>Wheel</b><span>Adjust look sensitivity</span>
    <b>Arc</b><span>A live dotted trajectory shows every bounce before you throw</span>
    <b>Left Click</b><span>Throw identity disc (it ricochets &amp; returns)</span>
    <b>Right Click</b><span>Raise disc shield — deflects incoming</span>
    <b>Space</b><span>Jump — tap twice to air-jump, hold for height</span>
    <b>Shift</b><span>Dash (costs energy)</span>
    <b>P / ESC</b><span>Pause simulation &amp; release cursor</span>
  </div>
  <div class="keys mobile-keys" style="display:none">
    <b>DRAG LEFT</b><span>Virtual Analog Stick — Move &amp; strafe</span>
    <b>DRAG RIGHT</b><span>Swipe anywhere to turn &amp; aim camera</span>
    <b>THROW</b><span>Launch identity disc (ricochets &amp; returns)</span>
    <b>L / R</b><span>Curve spin — hook disc around obstacles</span>
    <b>SHIELD</b><span>Raise disc shield — deflect incoming attacks</span>
    <b>JUMP</b><span>Tap to air-jump, hold for maximum height</span>
    <b>DASH</b><span>Instant directional sprint impulse</span>
    <b>PAUSE</b><span>Tap top right II button to suspend grid</span>
  </div>
  <div class="mode-select">
    <button id="duelBtn" class="mode-btn duel-btn">ENTER DUEL (1v1)</button>
    <button id="swarmBtn" class="mode-btn swarm-btn">ENTER SWARM (WAVES)</button>
    <button id="createRoomBtn" class="mode-btn multi-btn">CREATE DUEL ROOM (VS FRIEND)</button>
    <button id="joinRoomBtn" class="mode-btn multi-btn">JOIN DUEL ROOM</button>
  </div>
</div>`;
}

function showModeSelectMenu() {
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = getMainMenuHtml();
  bindMainMenuEvents();
}

function bindMainMenuEvents() {
  const db = document.getElementById('duelBtn');
  const sb = document.getElementById('swarmBtn');
  const cr = document.getElementById('createRoomBtn');
  const jr = document.getElementById('joinRoomBtn');

  const startDuel = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); startMode('duel'); };
  const startSwarm = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); startMode('swarm'); };
  const createRoom = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); onClickCreateRoom(e); };
  const joinRoom = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); showJoinInputModal(); };

  if (db) { db.onclick = startDuel; db.ontouchstart = startDuel; }
  if (sb) { sb.onclick = startSwarm; sb.ontouchstart = startSwarm; }
  if (cr) { cr.onclick = createRoom; cr.ontouchstart = createRoom; }
  if (jr) { jr.onclick = joinRoom; jr.ontouchstart = joinRoom; }
}

// Bind pause menu & HUD buttons
const pauseBtn = document.getElementById('pauseBtn');
const onPauseClick = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); pauseGame(); };
if (pauseBtn) { pauseBtn.onclick = onPauseClick; pauseBtn.ontouchstart = onPauseClick; }

const resumeBtn = document.getElementById('resumeBtn');
const onResumeClick = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); resumeGame(); };
if (resumeBtn) { resumeBtn.onclick = onResumeClick; resumeBtn.ontouchstart = onResumeClick; }

const restartBtn = document.getElementById('restartBtn');
const onRestartClick = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); restartMatch(); };
if (restartBtn) { restartBtn.onclick = onRestartClick; restartBtn.ontouchstart = onRestartClick; }

const modeSelectBtn = document.getElementById('modeSelectBtn');
const onModeSelectClick = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); showModeSelect(); };
if (modeSelectBtn) { modeSelectBtn.onclick = onModeSelectClick; modeSelectBtn.ontouchstart = onModeSelectClick; }
bindMainMenuEvents();

// Bind room modal buttons
const btnCopyCode = document.getElementById('btnCopyCode');
if (btnCopyCode) {
  btnCopyCode.onclick = (e) => {
    e.stopPropagation();
    if (currentRoomId) copyRoomCode(currentRoomId);
  };
}

const btnConfirmJoin = document.getElementById('btnConfirmJoin');
if (btnConfirmJoin) {
  btnConfirmJoin.onclick = (e) => {
    e.stopPropagation();
    onClickConfirmJoin(e);
  };
}

const btnCancelRoom = document.getElementById('btnCancelRoom');
if (btnCancelRoom) {
  btnCancelRoom.onclick = (e) => {
    e.stopPropagation();
    teardownMultiplayer();
    const rm = document.getElementById('roomModal');
    if (rm) rm.style.display = 'none';
    showModeSelectMenu();
  };
}

const joinRoomInput = document.getElementById('joinRoomInput');
if (joinRoomInput) {
  joinRoomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClickConfirmJoin(e);
    }
  });
  joinRoomInput.addEventListener('input', () => {
    joinRoomInput.value = joinRoomInput.value.toUpperCase();
  });
}

// Pointer lock can throw synchronously (SecurityError) inside sandboxed/permission-less
// iframes, and can also fail async. Both paths just enable the cursor-steering fallback.
function tryLock() {
  if (isTouchDevice) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => { lockFailed = true; });
  } catch (err) {
    lockFailed = true;
  }
  setTimeout(() => {
    if (document.pointerLockElement !== canvas) { lockFailed = true; }
  }, 400);
}

// keyboard events only arrive if this document actually has focus
function setCursor() {
  if (isTouchDevice) {
    document.body.style.cursor = 'default';
    return;
  }
  const locked = document.pointerLockElement === canvas;
  document.body.style.cursor = (running && !paused && locked) ? 'none' : 'default';
}

function focusGame() {
  try { window.focus(); } catch (e) {}
  canvas.focus();
}
document.addEventListener('pointerlockerror', () => { if (!isTouchDevice) lockFailed = true; });

document.addEventListener('pointerlockchange', () => {
  if (isTouchDevice) return;
  if (document.pointerLockElement !== canvas && running) {
    if (!paused && !lockFailed) {
      pauseGame();
    }
  }
  setCursor();
});

// ───────────────────────────── mouse look ───────────────────────────
let sens = 0.0023, invertY = false;
let steerX = 0, steerY = 0;                 // joystick steering (unlocked mode)
let cursorX = innerWidth / 2, cursorY = innerHeight / 2;
const isLocked = () => document.pointerLockElement === canvas;

function look(dx, dy) {
  player.yaw   -= dx * sens;
  player.pitch  = THREE.MathUtils.clamp(player.pitch - dy * sens * (invertY ? -1 : 1), -0.6, 0.55);
  if (player.yaw >  Math.PI) player.yaw -= Math.PI * 2;
  if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
}

addEventListener('mousemove', e => {
  if (isTouchDevice) return;
  cursorX = e.clientX; cursorY = e.clientY;
  if (!running || paused) return;

  if (isLocked()) {
    steerX = steerY = 0;
    look(e.movementX || 0, e.movementY || 0);
  } else {
    const nx = (e.clientX / innerWidth)  * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    const dz = 0.08;
    const curve = v => { const m = Math.abs(v); return m < dz ? 0 : Math.sign(v) * Math.pow((m - dz) / (1 - dz), 1.7); };
    steerX = curve(nx);
    steerY = 0;
    player.pitch = THREE.MathUtils.clamp(-ny * 0.5, -0.6, 0.55);
  }
});

canvas.addEventListener('click', () => { if (!isTouchDevice && running && !isLocked()) tryLock(); });

addEventListener('wheel', e => {
  if (!running) return;
  sens = THREE.MathUtils.clamp(sens * (e.deltaY > 0 ? 0.9 : 1.1), 0.0006, 0.012);
  showSens();
}, { passive: true });
function showSens() {
  const s = document.getElementById('sens');
  if (!s || isTouchDevice) return;
  s.textContent = 'SENSITIVITY ' + Math.round(sens / 0.0023 * 100) + '%';
  s.style.opacity = 1; clearTimeout(showSens._t);
  showSens._t = setTimeout(() => s.style.opacity = 0, 1200);
}

addEventListener('mousedown', e => {
  if (isTouchDevice || !running || paused) return;
  if (e.button === 0) throwDisc();
  if (e.button === 2) player.blocking = true;
});
addEventListener('mouseup', e => {
  if (isTouchDevice) return;
  if (e.button === 2 && !touchBlocking) player.blocking = false;
});
addEventListener('contextmenu', e => e.preventDefault());

// ───────────────────────────── mobile touch controls ─────────────────
let moveTouchId = null;
const moveStartPos = { x: 0, y: 0 };
const touchMove = { x: 0, y: 0 }; // normalized: x: [-1, 1], y: [-1, 1]

let lookTouchId = null;
const lookLastPos = { x: 0, y: 0 };

let touchJumpHeld = false;
let touchDashRequested = false;
let touchBlocking = false;
let touchCurveL = false;
let touchCurveR = false;

const joyBase = document.getElementById('joystickBase');
const joyThumb = document.getElementById('joystickThumb');
const R_STICK = 52; // radius in px

function showJoystick(x, y) {
  if (!joyBase) return;
  joyBase.style.left = `${x}px`;
  joyBase.style.top = `${y}px`;
  joyBase.style.opacity = '1';
  joyBase.style.transform = 'scale(1)';
  if (joyThumb) joyThumb.style.transform = 'translate3d(0, 0, 0)';
}

function updateJoystick(x, y) {
  const dx = x - moveStartPos.x;
  const dy = y - moveStartPos.y;
  const dist = Math.hypot(dx, dy);
  let cx = dx, cy = dy;
  if (dist > R_STICK) {
    cx = (dx / dist) * R_STICK;
    cy = (dy / dist) * R_STICK;
  }
  touchMove.x = cx / R_STICK;
  touchMove.y = cy / R_STICK;
  if (joyThumb) {
    joyThumb.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  }
}

function hideJoystick() {
  if (joyBase) {
    joyBase.style.opacity = '0';
    joyBase.style.transform = 'scale(0.85)';
  }
  if (joyThumb) {
    joyThumb.style.transform = 'translate3d(0, 0, 0)';
  }
  touchMove.x = 0;
  touchMove.y = 0;
}

function updateCurveButtons() {
  const btnCurveL = document.getElementById('btnCurveL');
  const btnCurveR = document.getElementById('btnCurveR');
  if (btnCurveL) btnCurveL.classList.toggle('active', touchCurveL);
  if (btnCurveR) btnCurveR.classList.toggle('active', touchCurveR);
}

function onTouchStart(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target.closest('.touch-btn, .hud-btn, .btn, .mode-btn')) continue;
    if (!running || paused) continue;

    if (t.clientX < window.innerWidth * 0.45 && moveTouchId === null) {
      moveTouchId = t.identifier;
      moveStartPos.x = t.clientX;
      moveStartPos.y = t.clientY;
      touchMove.x = 0;
      touchMove.y = 0;
      showJoystick(t.clientX, t.clientY);
      e.preventDefault();
    } else if (t.clientX >= window.innerWidth * 0.45 && lookTouchId === null) {
      lookTouchId = t.identifier;
      lookLastPos.x = t.clientX;
      lookLastPos.y = t.clientY;
      e.preventDefault();
    }
  }
}

function onTouchMove(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === moveTouchId) {
      e.preventDefault();
      updateJoystick(t.clientX, t.clientY);
    } else if (t.identifier === lookTouchId) {
      e.preventDefault();
      const dx = t.clientX - lookLastPos.x;
      const dy = t.clientY - lookLastPos.y;
      lookLastPos.x = t.clientX;
      lookLastPos.y = t.clientY;

      const touchSens = sens * 1.35;
      player.yaw -= dx * touchSens;
      player.pitch = THREE.MathUtils.clamp(
        player.pitch - dy * touchSens * (invertY ? -1 : 1),
        -0.6,
        0.55
      );
      if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
      if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
    }
  }
}

function onTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.identifier === moveTouchId) {
      moveTouchId = null;
      hideJoystick();
    } else if (t.identifier === lookTouchId) {
      lookTouchId = null;
    }
  }
}

window.addEventListener('touchstart', onTouchStart, { passive: false });
window.addEventListener('touchmove', onTouchMove, { passive: false });
window.addEventListener('touchend', onTouchEnd, { passive: false });
window.addEventListener('touchcancel', onTouchEnd, { passive: false });

function bindMobileButtons() {
  const btnThrow = document.getElementById('btnThrow');
  const btnJump = document.getElementById('btnJump');
  const btnDash = document.getElementById('btnDash');
  const btnBlock = document.getElementById('btnBlock');
  const btnCurveL = document.getElementById('btnCurveL');
  const btnCurveR = document.getElementById('btnCurveR');

  if (btnThrow) {
    const doThrow = (e) => {
      e.preventDefault(); e.stopPropagation();
      throwDisc();
      btnThrow.classList.add('pressed');
      setTimeout(() => btnThrow.classList.remove('pressed'), 120);
    };
    btnThrow.addEventListener('touchstart', doThrow, { passive: false });
    btnThrow.addEventListener('click', doThrow);
  }

  if (btnJump) {
    const startJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchJumpHeld = true;
      player.jumpBuf = 0.15;
      btnJump.classList.add('pressed');
    };
    const endJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchJumpHeld = false;
      btnJump.classList.remove('pressed');
    };
    btnJump.addEventListener('touchstart', startJump, { passive: false });
    btnJump.addEventListener('touchend', endJump, { passive: false });
    btnJump.addEventListener('touchcancel', endJump, { passive: false });
  }

  if (btnDash) {
    const doDash = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchDashRequested = true;
      btnDash.classList.add('pressed');
      setTimeout(() => btnDash.classList.remove('pressed'), 140);
    };
    btnDash.addEventListener('touchstart', doDash, { passive: false });
    btnDash.addEventListener('click', doDash);
  }

  if (btnBlock) {
    const startBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchBlocking = true;
      player.blocking = true;
      btnBlock.classList.add('pressed');
    };
    const endBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchBlocking = false;
      player.blocking = false;
      btnBlock.classList.remove('pressed');
    };
    btnBlock.addEventListener('touchstart', startBlock, { passive: false });
    btnBlock.addEventListener('touchend', endBlock, { passive: false });
    btnBlock.addEventListener('touchcancel', endBlock, { passive: false });
  }

  if (btnCurveL) {
    const doCurveL = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchCurveL = !touchCurveL;
      if (touchCurveL) touchCurveR = false;
      updateCurveButtons();
    };
    btnCurveL.addEventListener('touchstart', doCurveL, { passive: false });
    btnCurveL.addEventListener('click', doCurveL);
  }

  if (btnCurveR) {
    const doCurveR = (e) => {
      e.preventDefault(); e.stopPropagation();
      touchCurveR = !touchCurveR;
      if (touchCurveR) touchCurveL = false;
      updateCurveButtons();
    };
    btnCurveR.addEventListener('touchstart', doCurveR, { passive: false });
    btnCurveR.addEventListener('click', doCurveR);
  }
}
bindMobileButtons();

// ───────────────────────────── game logic ────────────────────────────
function updateHUD() {
  const hpb = el('hpbar');
  if (hpb && hpb.firstElementChild) hpb.firstElementChild.style.width = player.hp + '%';
  const db = el('discbar');
  if (db && db.firstElementChild) db.firstElementChild.style.width = (player.hasDisc ? 100 : 0) + '%';
  const eb = el('energybar');
  if (eb && eb.firstElementChild) eb.firstElementChild.style.width = player.energy + '%';

  if (gameMode === 'duel') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `DUEL TIER <span id="wave" class="big">${duelTier}</span>`;
    const boss = foes[0];
    const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVAL INTEGRITY <span id="rivalHp">${hpPct}%</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = hpPct + '%';
  } else if (gameMode === 'duel_multi') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `ROOM <span id="wave" class="big">${currentRoomId || '----'}</span>`;
    const oppHp = duelOpponent ? Math.max(0, Math.ceil(duelOpponent.hp)) : 100;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVAL HP <span id="foes">${oppHp}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = oppHp + '%';
  } else {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `CYCLE <span id="wave" class="big">${wave}</span>`;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `HOSTILES <span id="foes">${foes.length}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'none';
  }

  const sc = el('score');
  if (sc) sc.textContent = score;
}

function resetGame() {
  for (const f of foes) scene.remove(f.obj);
  for (const d of discs) scene.remove(d.obj);
  foes = []; discs = [];
  player.pos.set(0, 0, 14); player.vel.set(0, 0, 0);
  player.y = 0; player.vy = 0; player.grounded = true; player.jumps = 0;
  player.hp = 100; player.energy = 100; player.hasDisc = true; player.alive = true;
  player.yaw = Math.PI; player.pitch = -.12;
  score = 0; gameOverT = 0; running = true;
  spawnTimer = 0;
  gameOverReason = '';

  for (const tile of tiles.values()) {
    tile.state = TILE_INTACT;
    tile.timer = 0;
    tile.regenTimer = 0;
    tile.mesh.position.y = tile.origY;
    tile.mesh.visible = true;
    if (tile.slabMesh.material !== tileMatIntact) {
      tile.slabMesh.material.dispose();
      tile.edgeMesh.material.dispose();
      tile.slabMesh.material = tileMatIntact;
      tile.edgeMesh.material = tileEdgeMatIntact;
    }
  }

  if (gameMode === 'duel') {
    duelTier = 1;
    spawnDuelBoss(duelTier);
    message('DUEL TIER 1 — FIGHT');
  } else {
    wave = 1;
    spawnWave();
    message('CYCLE 1 — FIGHT');
  }
  updateHUD();
}

function spawnDuelBoss(tier = 1) {
  for (const f of foes) scene.remove(f.obj);
  foes = [];
  const obj = makeProgram(ORANGE);
  obj.scale.setScalar(1.15);
  const halo = new THREE.PointLight(ORANGE, 3.2, 14);
  halo.position.y = 1.6;
  obj.add(halo);
  scene.add(obj);

  const maxHp = Math.min(250 + (tier - 1) * 35, 350);
  const boss = {
    obj,
    pos: new THREE.Vector3(0, 0, -28),
    vel: new THREE.Vector3(),
    hp: maxHp,
    maxHp: maxHp,
    hasDisc: true,
    cd: 0.8 + Math.random() * 0.6,
    strafe: Math.random() < 0.5 ? 1 : -1,
    strafeT: 0.5 + Math.random() * 0.7,
    hurt: 0,
    skill: Math.min(0.88 + (tier - 1) * 0.03, 0.98),
    isBoss: true,
    speed: 10.5 + (tier - 1) * 0.5,
    y: 0,
    vy: 0,
    grounded: true,
    jumps: 0,
    dashCd: 0,
    didRecover: false,
    coverTarget: new THREE.Vector3(),
    coverPillar: null,
    state: 'ATTACK',
    aerialThrow: false,
    peekDir: Math.random() < 0.5 ? 1 : -1
  };
  foes.push(boss);
}

function spawnWave() {
  const n = Math.min(2 + Math.floor(wave * 0.8), 8);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 14;
    const obj = makeProgram(ORANGE); scene.add(obj);
    foes.push({
      obj, pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
      vel: new THREE.Vector3(), hp: 100 + wave * 12, hasDisc: true,
      cd: 1.4 + Math.random() * 2.2, strafe: Math.random() < .5 ? 1 : -1,
      strafeT: 1 + Math.random() * 2, hurt: 0, skill: Math.min(.3 + wave * .08, .95),
      y: 0, vy: 0, grounded: true, jumps: 0, dashCd: 0, didRecover: false
    });
  }
}

function throwDisc() {
  if (!player.hasDisc || !player.alive) return;
  player.hasDisc = false;
  player.obj.userData.backDisc.visible = false;
  const aim = aimTarget();
  const chest = player.pos.clone().add(new THREE.Vector3(0, 1.7 + player.y, 0));
  // aim from the chest at the exact point under the crosshair => reticle is truthful
  const dir = aim.point.clone().sub(chest).normalize();
  const origin = chest.clone().add(dir.clone().multiplyScalar(1.1));
  const curve = getPlayerCurveIntent();
  const vel = dir.clone().multiplyScalar(38);
  spawnDisc(origin, vel, 'player', CYAN, curve);
  window.__lastThrowDot = dir.clone().normalize().dot(aim.point.clone().sub(origin).normalize());
  shake(0.12);
  if (touchCurveL || touchCurveR) {
    touchCurveL = false;
    touchCurveR = false;
    updateCurveButtons();
  }

  // Network sync throw for multiplayer
  if (gameMode === 'duel_multi' && db && currentRoomId && currentUser) {
    const roomRef = getRoomRef(currentRoomId);
    roomUpdateDoc(roomRef, {
      lastThrow: {
        id: Math.random().toString(36).substring(2, 9),
        sender: playerRole,
        x: +origin.x.toFixed(2),
        y: +origin.y.toFixed(2),
        z: +origin.z.toFixed(2),
        vx: +vel.x.toFixed(2),
        vy: +vel.y.toFixed(2),
        vz: +vel.z.toFixed(2),
        curve: +curve.toFixed(2)
      }
    }).catch(err => console.warn("Throw sync err:", err));
  }
}

// Cast the camera's centre ray into the arena and return {point, foe, dist}.
// Everything the crosshair sits on is resolved analytically (floor, walls,
// pillars, programs) so the reticle is an honest prediction of the throw.
const _ro = new THREE.Vector3(), _rd = new THREE.Vector3();
function aimTarget() {
  _ro.copy(camera.position);
  camera.getWorldDirection(_rd);
  let best = 400, hitFoe = null;

  // floor
  if (_rd.y < -0.001) { const t = -_ro.y / _rd.y; if (t > 0.5 && t < best) { best = t; hitFoe = null; } }
  // walls
  const lim = ARENA - 1.5;
  for (const [axis, sign] of [['x',1],['x',-1],['z',1],['z',-1]]) {
    const denom = _rd[axis];
    if (Math.abs(denom) < 1e-4) continue;
    const t = (sign * lim - _ro[axis]) / denom;
    if (t > 0.5 && t < best) { best = t; hitFoe = null; }
  }
  // pillars (infinite cylinder, then height check)
  for (const p of pillars) {
    const ox = _ro.x - p.x, oz = _ro.z - p.z;
    const a = _rd.x * _rd.x + _rd.z * _rd.z;
    if (a < 1e-6) continue;
    const b = 2 * (ox * _rd.x + oz * _rd.z);
    const c = ox * ox + oz * oz - p.r * p.r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) continue;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t > 0.5 && t < best && _ro.y + _rd.y * t < 6.5) { best = t; hitFoe = null; }
  }
  // programs (sphere around the torso)
  const aimFoes = (gameMode === 'duel_multi' && duelOpponent) ? [duelOpponent] : foes;
  for (const f of aimFoes) {
    const cx = f.pos.x - _ro.x, cy = (1.5 + (f.y || 0)) - _ro.y, cz = f.pos.z - _ro.z;
    const proj = cx * _rd.x + cy * _rd.y + cz * _rd.z;
    if (proj < 0.5) continue;
    const d2 = (cx * cx + cy * cy + cz * cz) - proj * proj;
    const R = FOE_R + 0.5;
    if (d2 > R * R) continue;
    const t = proj - Math.sqrt(R * R - d2);
    if (t > 0.5 && t < best) { best = t; hitFoe = f; }
  }
  return { point: _ro.clone().addScaledVector(_rd, Math.min(best, 400)), foe: hitFoe, dist: best };
}

function aimDir() {
  return new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)).normalize();
}

function spawnDisc(pos, vel, owner, color, curve = 0) {
  const obj = makeDisc(color); obj.position.copy(pos); scene.add(obj);
  const d = {
    obj,
    pos: pos.clone(),
    vel: vel.clone(),
    owner,
    originalOwner: owner,
    color,
    bounces: 0,
    deflectBounces: 0,
    deflectTime: 0,
    isDeflected: false,
    t: 0,
    returning: false,
    spin: 0,
    curve,
    hitFoes: new Set()
  };
  discs.push(d);
  return d;
}

let gameOverReason = '';

function damagePlayer(amount, from) {
  if (!player.alive) return;
  player.hp -= amount; player.hurtFlash = 1;
  burst(player.pos.clone().setY(player.y + 1.6), CYAN, 18, 8);
  shake(0.35);
  if (player.hp <= 0) {
    player.hp = 0; player.alive = false; running = false; gameOverT = 0;
    burst(player.pos.clone().setY(player.y + 1.4), CYAN, 90, 16);
    player.obj.visible = false;
    if (gameMode === 'duel_multi') {
      if (db && currentRoomId && currentUser) {
        const oppRole = playerRole === 'p1' ? 'p2' : 'p1';
        const roomRef = getRoomRef(currentRoomId);
        const myState = {
          x: +player.pos.x.toFixed(2),
          y: +player.y.toFixed(2),
          z: +player.pos.z.toFixed(2),
          yaw: +player.yaw.toFixed(2),
          pitch: +player.pitch.toFixed(2),
          hp: 0,
          blocking: false,
          hasDisc: player.hasDisc
        };
        const payload = {
          status: 'finished',
          winner: oppRole
        };
        payload[playerRole] = myState;
        roomUpdateDoc(roomRef, payload).catch(err => console.warn("Game over sync err:", err));
      }
      setTimeout(showMultiplayerDefeat, 900);
    } else {
      setTimeout(showGameOver, 900);
    }
  }
}

function killFoe(f) {
  burst(f.pos.clone().setY(1.5 + (f.y || 0)), ORANGE, 70, 14);
  scene.remove(f.obj);
  foes = foes.filter(x => x !== f);
  if (gameMode === 'duel') {
    score += 500 + duelTier * 250;
    message('MATCH WON — TIER ' + duelTier + ' CLEARED');
    duelTier++;
    spawnTimer = 2.5;
  } else {
    score += 100 + wave * 10;
    if (foes.length === 0) {
      wave++;
      message('CYCLE ' + wave);
      spawnTimer = 2.2;
    }
  }
}

// ───────────────────────────── UI ────────────────────────────────────
const el = id => document.getElementById(id);
const msgEl = el('msg');
let msgT = 0;
function message(t) {
  msgEl.textContent = t;
  msgEl.style.opacity = 1;
  msgT = 2;
  if (t === 'SURFACE COLLAPSE — JUMP / DASH!') {
    msgEl.style.color = 'var(--orange)';
    msgEl.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'RIVAL CAUGHT DISC!' || t === 'RIVAL COUNTER-CATCH!') {
    msgEl.style.color = 'var(--orange)';
    msgEl.style.textShadow = '0 0 28px var(--orange), 0 0 10px #ffffff';
  } else if (t === 'DEFLECTED!') {
    msgEl.style.color = '#ffffff';
    msgEl.style.textShadow = '0 0 24px var(--cyan), 0 0 8px #ffffff';
  } else {
    msgEl.style.color = 'var(--cyan)';
    msgEl.style.textShadow = '0 0 22px var(--cyan)';
  }
}

function showGameOver() {
  overlay.style.display = 'flex';
  const title = gameMode === 'duel' ? 'DUEL ELIMINATED' : 'DEREZZED';
  const subtitle = gameOverReason || 'YOUR DISC WAS CLAIMED';
  const stats = gameMode === 'duel'
    ? `TIERS CLEARED <b style="color:#fff">${duelTier - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`
    : `CYCLES SURVIVED <b style="color:#fff">${wave - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`;
  overlay.innerHTML = `<div class="card dead">
    <h1>${title}</h1>
    <h2>${subtitle}</h2>
    <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
      ${stats}
    </div>
    <div class="menu-actions" style="max-width:320px;margin:0 auto">
      <button id="recompileBtn" class="btn">RE-COMPILE (${gameMode.toUpperCase()})</button>
      <button id="returnMenuBtn" class="btn" style="border-color:var(--orange);color:#ffb37a">MODE SELECT</button>
    </div>
  </div>`;
  const rc = el('recompileBtn');
  if (rc) rc.onclick = (e) => {
    e.stopPropagation();
    player.obj.visible = true;
    overlay.style.display = 'none';
    resetGame();
    paused = false;
    justResumed = true;
    tryLock();
    focusGame();
  };
  const rm = el('returnMenuBtn');
  if (rm) rm.onclick = (e) => {
    e.stopPropagation();
    player.obj.visible = true;
    showModeSelectMenu();
  };
  gameOverT = 1;
}

// camera shake
let shakeAmt = 0;
function shake(v) { shakeAmt = Math.min(shakeAmt + v, .8); }

// ───────────────────────────── collision util ────────────────────────
function resolveCircle(pos, radius, y = 0) {
  const lim = ARENA - 1.4 - radius;
  pos.x = THREE.MathUtils.clamp(pos.x, -lim, lim);
  pos.z = THREE.MathUtils.clamp(pos.z, -lim, lim);
  for (const p of pillars) {
    const dx = pos.x - p.x, dz = pos.z - p.z;
    const dist = Math.hypot(dx, dz), min = p.r + radius;
    if (dist < min && dist > 0.0001) {
      pos.x = p.x + dx / dist * min;
      pos.z = p.z + dz / dist * min;
    }
  }

  // Vertical edge colliders for intact tiles when entity is in falling zone (y < -0.2m)
  if (y < -0.2) {
    const minIX = Math.max(0, Math.floor((pos.x - radius + ARENA) / TILE_W));
    const maxIX = Math.min(TILE_N - 1, Math.floor((pos.x + radius + ARENA) / TILE_W));
    const minIZ = Math.max(0, Math.floor((pos.z - radius + ARENA) / TILE_W));
    const maxIZ = Math.min(TILE_N - 1, Math.floor((pos.z + radius + ARENA) / TILE_W));

    for (let ix = minIX; ix <= maxIX; ix++) {
      for (let iz = minIZ; iz <= maxIZ; iz++) {
        const t = tiles.get(`${ix}_${iz}`);
        if (!t || t.state === TILE_FALLEN || t.state === TILE_REBUILDING) continue;

        const tMinX = -ARENA + ix * TILE_W;
        const tMaxX = -ARENA + (ix + 1) * TILE_W;
        const tMinZ = -ARENA + iz * TILE_W;
        const tMaxZ = -ARENA + (iz + 1) * TILE_W;

        const cx = Math.max(tMinX, Math.min(pos.x, tMaxX));
        const cz = Math.max(tMinZ, Math.min(pos.z, tMaxZ));
        const dx = pos.x - cx;
        const dz = pos.z - cz;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          pos.x += (dx / dist) * push;
          pos.z += (dz / dist) * push;
        } else if (distSq <= 1e-6) {
          const dL = pos.x - tMinX;
          const dR = tMaxX - pos.x;
          const dB = pos.z - tMinZ;
          const dT = tMaxZ - pos.z;
          const minD = Math.min(dL, dR, dB, dT);
          if (minD === dL) pos.x = tMinX - radius;
          else if (minD === dR) pos.x = tMaxX + radius;
          else if (minD === dB) pos.z = tMinZ - radius;
          else pos.z = tMaxZ + radius;
        }
      }
    }
  }
}

function lineOfSight(a, b) {
  for (const p of pillars) {
    const ax = a.x - p.x, az = a.z - p.z, bx = b.x - p.x, bz = b.z - p.z;
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    let t = L ? -(ax * dx + az * dz) / L : 0;
    t = THREE.MathUtils.clamp(t, 0, 1);
    const cx = ax + dx * t, cz = az + dz * t;
    if (Math.hypot(cx, cz) < p.r + .5) return false;
  }
  return true;
}

// ───────────────────────────── duel AI helpers & logic ────────────────
function getPillarCoverPoint(pillar, playerPos, out) {
  const dx = pillar.x - playerPos.x;
  const dz = pillar.z - playerPos.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) {
    out.set(pillar.x, 0, pillar.z + pillar.r + 1.8);
  } else {
    const inv = 1 / len;
    out.set(pillar.x + dx * inv * (pillar.r + 1.8), 0, pillar.z + dz * inv * (pillar.r + 1.8));
  }
  return out;
}

function findBestCoverPillar(foePos, playerPos) {
  let bestPillar = pillars[0];
  let bestDist = Infinity;
  for (let i = 0; i < pillars.length; i++) {
    const pl = pillars[i];
    getPillarCoverPoint(pl, playerPos, _duelSafe);
    const dx = foePos.x - _duelSafe.x;
    const dz = foePos.z - _duelSafe.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestPillar = pl;
    }
  }
  return bestPillar;
}

function updateDuelFoe(f, dt) {
  // 1. Vertical Kinematics & Gravity (Gfoe = 30)
  const GRAV_FOE = 30;
  const prevY = f.y;
  const wasGrounded = f.grounded;
  f.vy -= GRAV_FOE * dt;
  f.y += f.vy * dt;

  const foeTile = getTileAt(f.pos.x, f.pos.z);
  const isFoeTileSolid = foeTile && foeTile.state !== TILE_FALLEN && foeTile.state !== TILE_REBUILDING;

  if (isFoeTileSolid) {
    if (f.y <= 0 && prevY >= -0.15) {
      f.y = 0;
      f.vy = 0;
      f.grounded = true;
      f.jumps = 0;
      f.aerialThrow = false;
      f.didRecover = false;
    } else if (f.y < -0.15) {
      f.grounded = false;
    }
  } else {
    // Tile is FALLEN (Open Void)
    if (wasGrounded) {
      f.vy = Math.min(f.vy, -3.5);
    }
    f.grounded = false;
  }

  // Failsafe Re-Arm Watchdog (Section 2.2)
  if (!f.hasDisc && !discs.some(d => d.owner === f)) {
    f.rearmTimer = (f.rearmTimer || 0) + dt;
    if (f.rearmTimer > 2.5) {
      f.hasDisc = true;
      f.rearmTimer = 0;
      if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
        f.obj.userData.backDisc.visible = true;
      }
    }
  } else {
    f.rearmTimer = 0;
  }

  // Bot Fall Recovery AI: Detect y < 0 and y > -3.0m
  if (f.y < 0 && f.y > -3.0 && !f.didRecover) {
    f.vy = 12.0;
    f.didRecover = true;
    f.grounded = false;
    f.jumps = 1;
    const safeTarget = findNearestIntactTile(f.pos.x, f.pos.z);
    if (safeTarget) {
      const dx = safeTarget.x - f.pos.x;
      const dz = safeTarget.z - f.pos.z;
      const dLen = Math.hypot(dx, dz);
      if (dLen > 0.01) {
        f.vel.x += (dx / dLen) * 32.0;
        f.vel.z += (dz / dLen) * 32.0;
      }
    }
    f.dashCd = 1.2;
    burst(tmp.copy(f.pos).setY(f.y + 0.3), ORANGE, 18, 6);
    shake(0.12);
  }

  // Void Death Threshold
  if (f.y < -18) {
    burst(f.pos.clone().setY(-18), ORANGE, 80, 16);
    score += 500;
    message('PIT ELIMINATION +500');
    killFoe(f);
    return;
  }

  f.dashCd -= dt;

  const toPx = player.pos.x - f.pos.x;
  const toPz = player.pos.z - f.pos.z;
  const pDist = Math.hypot(toPx, toPz);
  const see = lineOfSight(f.pos, player.pos) && player.alive;

  // 2. Threat Awareness & Ricochet Defense (Section 4)
  let deflectThreat = null;
  let deflectDist = Infinity;
  for (let i = 0; i < discs.length; i++) {
    const D = discs[i];
    if (D.isDeflected && D.owner === 'player' && !D.returning) {
      const dx = D.pos.x - f.pos.x;
      const dz = D.pos.z - f.pos.z;
      const dist = Math.hypot(dx, dz);
      const toFoeX = f.pos.x - D.pos.x;
      const toFoeZ = f.pos.z - D.pos.z;
      const movingToward = (D.vel.x * toFoeX + D.vel.z * toFoeZ) > 0;
      if (movingToward && dist < 35 && dist < deflectDist) {
        deflectDist = dist;
        deflectThreat = D;
      }
    }
  }

  let panicDisc = null;
  let panicDist = Infinity;
  for (let i = 0; i < discs.length; i++) {
    const D = discs[i];
    if (D.owner === 'player' && !D.returning && D.bounces > 0) {
      const dx = f.pos.x - D.pos.x;
      const dz = f.pos.z - D.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 24 && dist > 0.1) {
        const vSpd = Math.hypot(D.vel.x, D.vel.z);
        if (vSpd > 1e-3) {
          const dotHead = (D.vel.x * dx + D.vel.z * dz) / (vSpd * dist);
          if (dotHead > 0.35) {
            // Heading toward rival: check if in rear hemisphere
            // Foe visor is at +Z in local space: fwd = (sin(rotY), 0, cos(rotY))
            const fwdX = Math.sin(f.obj.rotation.y);
            const fwdZ = Math.cos(f.obj.rotation.y);
            const posRear = (dx * fwdX + dz * fwdZ) / dist > 0.05;
            const velRear = (D.vel.x * fwdX + D.vel.z * fwdZ) / vSpd > 0.05;
            if (posRear || velRear) {
              if (dist < panicDist) {
                panicDist = dist;
                panicDisc = D;
              }
            }
          }
        }
      }
    }
  }

  if (deflectThreat) {
    // Prioritize facing incoming deflected disc to prepare catch
    const faceAngle = Math.atan2(deflectThreat.pos.x - f.pos.x, deflectThreat.pos.z - f.pos.z);
    const faceDiff = ((faceAngle - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.obj.rotation.y += THREE.MathUtils.clamp(faceDiff, -24 * dt, 24 * dt);

    // Visual telegraph: orange flash around bot's hands/visor
    f.telegraphT = (f.telegraphT || 0) + dt;
    if (f.telegraphT > 0.1) {
      f.telegraphT = 0;
      burst(tmp.set(f.pos.x, 2.45 + f.y, f.pos.z), ORANGE, 4, 3);
      burst(tmp.set(f.pos.x + 0.7, 1.6 + f.y, f.pos.z), ORANGE, 3, 2);
      burst(tmp.set(f.pos.x - 0.7, 1.6 + f.y, f.pos.z), ORANGE, 3, 2);
    }
  } else if (panicDisc) {
    // Flag panic state: turn immediately to face incoming disc
    f.state = 'EVADE';
    const faceAngle = Math.atan2(panicDisc.pos.x - f.pos.x, panicDisc.pos.z - f.pos.z);
    const faceDiff = ((faceAngle - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.obj.rotation.y += THREE.MathUtils.clamp(faceDiff, -18 * dt, 18 * dt);

    // Attempt jump or dash to clear the bounce line
    if (f.dashCd <= 0) {
      const vSpd = Math.hypot(panicDisc.vel.x, panicDisc.vel.z);
      let perpX = -panicDisc.vel.z / vSpd;
      let perpZ = panicDisc.vel.x / vSpd;
      if ((f.pos.x + perpX * 4) * Math.sign(f.pos.x) > ARENA - 3 || (f.pos.z + perpZ * 4) * Math.sign(f.pos.z) > ARENA - 3) {
        perpX = -perpX;
        perpZ = -perpZ;
      }
      f.vel.x += perpX * 32;
      f.vel.z += perpZ * 32;
      f.dashCd = 1.8 + Math.random() * 0.8;
      burst(tmp.copy(f.pos).setY(f.y + 0.4), ORANGE, 16, 6);
      shake(0.12);
    } else if (f.grounded && f.jumps === 0) {
      f.vy = 11.5;
      f.grounded = false;
      f.jumps = 1;
      burst(tmp.copy(f.pos).setY(f.y + 0.2), ORANGE, 14, 5);
    }
  } else {
    // Normal smooth facing towards player
    const face = Math.atan2(toPx, toPz);
    const turnRate = 8 * dt;
    f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
  }

  // 3. Low Disc Jump Evasion (Section 1)
  if (f.grounded && f.jumps === 0) {
    for (let i = 0; i < discs.length; i++) {
      const D = discs[i];
      if (D.owner === 'player' && !D.returning) {
        const dx = f.pos.x - D.pos.x;
        const dz = f.pos.z - D.pos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 100) { // within 10 m
          const dot = D.vel.x * dx + D.vel.z * dz;
          if (dot > 0 && D.pos.y <= 1.8) {
            f.vy = 11.5;
            f.grounded = false;
            f.jumps = 1;
            burst(tmp.copy(f.pos).setY(f.y + 0.2), ORANGE, 14, 5);
            break;
          }
        }
      }
    }
  }

  // 4. Tactical Evasive Dash (Section 2)
  if (!panicDisc && f.dashCd <= 0) {
    let triggerDash = false;
    for (let i = 0; i < discs.length; i++) {
      const D = discs[i];
      if (D.owner === 'player' && !D.returning) {
        const dx = f.pos.x - D.pos.x;
        const dz = f.pos.z - D.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 14 && dist > 0.1) {
          const vSpd = Math.hypot(D.vel.x, D.vel.z);
          if (vSpd > 1e-3) {
            const dot = (D.vel.x * dx + D.vel.z * dz) / (vSpd * dist);
            if (dot > 0.25) {
              const isCurved = Math.abs(D.curve || 0) > 0.05;
              const isBanked = D.bounces > 0;
              const flank = pDist > 0.1 && Math.abs((D.vel.x / vSpd) * (toPz / pDist) - (D.vel.z / vSpd) * (toPx / pDist)) > 0.35;
              if (isCurved || isBanked || flank) {
                triggerDash = true;
                break;
              }
            }
          }
        }
      }
    }

    if (!triggerDash && see && player.hasDisc && (!f.hasDisc || f.hp < f.maxHp * 0.35)) {
      if (pDist < 16) {
        triggerDash = true;
      }
    }

    if (triggerDash && pDist > 0.1) {
      const normX = toPx / pDist;
      const normZ = toPz / pDist;
      const side = f.strafe || (Math.random() < 0.5 ? 1 : -1);
      let evadeX = -normZ * side - normX * 0.35;
      let evadeZ = normX * side - normZ * 0.35;
      const evLen = Math.hypot(evadeX, evadeZ);
      evadeX /= evLen;
      evadeZ /= evLen;

      if (Math.abs(f.pos.x + evadeX * 5) > ARENA - 2) evadeX = -evadeX;
      if (Math.abs(f.pos.z + evadeZ * 5) > ARENA - 2) evadeZ = -evadeZ;

      f.vel.x += evadeX * 32;
      f.vel.z += evadeZ * 32;
      f.dashCd = 1.8 + Math.random() * 0.8;
      burst(tmp.copy(f.pos).setY(f.y + 0.4), ORANGE, 16, 6);
      shake(0.12);
    }
  }

  // 5. Aerial Throw at Apex (Section 1)
  if (f.aerialThrow && f.hasDisc && f.vy <= 1.0) {
    const leadX = player.pos.x + player.vel.x * (0.28 * f.skill);
    const leadZ = player.pos.z + player.vel.z * (0.28 * f.skill);
    _duelLead.set(leadX, 1.7 + player.y, leadZ);
    _duelOrigin.copy(f.pos).setY(1.7 + f.y);
    _duelAimDir.copy(_duelLead).sub(_duelOrigin).normalize();
    _duelOrigin.addScaledVector(_duelAimDir, 1.2);

    const curvePower = (Math.random() < 0.6) ? (Math.random() < 0.5 ? 1.0 : -1.0) * (0.8 + Math.random() * 0.4) : 0;
    spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + duelTier * 2), f, ORANGE, curvePower);

    f.hasDisc = false;
    f.aerialThrow = false;
    f.state = 'SEEK_COVER';
    f.cd = 0.8 + Math.random() * 0.6;
    f.coverPillar = null;
    f.peekDir = -f.peekDir;
  }

  // 6. Combat State Machine & Movement (Section 3)
  if (!f.hasDisc) {
    if (f.state !== 'EVADE') f.state = 'SEEK_COVER';
  } else if (f.state === 'SEEK_COVER' || f.state === 'EVADE') {
    f.state = 'PEEK';
  }

  _duelWant.set(0, 0, 0);

  if (f.state === 'SEEK_COVER') {
    if (!f.coverPillar) {
      f.coverPillar = findBestCoverPillar(f.pos, player.pos);
    }
    getPillarCoverPoint(f.coverPillar, player.pos, f.coverTarget);
    const toCoverX = f.coverTarget.x - f.pos.x;
    const toCoverZ = f.coverTarget.z - f.pos.z;
    const coverDist = Math.hypot(toCoverX, toCoverZ);

    if (see) {
      // Trapped in open: weave between pillars
      if (coverDist > 0.2) {
        const dirX = toCoverX / coverDist;
        const dirZ = toCoverZ / coverDist;
        const weave = Math.sin(time * 6.0) * 0.45;
        _duelWant.set(dirX - dirZ * weave, 0, dirZ + dirX * weave).normalize();
      }
    } else {
      if (coverDist > 0.4) {
        _duelWant.set(toCoverX / coverDist, 0, toCoverZ / coverDist);
      }
    }
  } else if (f.state === 'PEEK') {
    if (see) {
      f.state = 'ATTACK';
    } else {
      const pl = f.coverPillar || findBestCoverPillar(f.pos, player.pos);
      const pdx = pl.x - player.pos.x;
      const pdz = pl.z - player.pos.z;
      const plen = Math.hypot(pdx, pdz);
      if (plen > 0.01) {
        const ndx = pdx / plen;
        const ndz = pdz / plen;
        _duelWant.set(-ndz * f.peekDir, 0, ndx * f.peekDir).normalize();
      }
    }
  }

  if (f.state === 'ATTACK') {
    if (!see) {
      f.state = 'PEEK';
    } else {
      const normX = pDist > 0.1 ? toPx / pDist : 0;
      const normZ = pDist > 0.1 ? toPz / pDist : 1;
      f.strafeT -= dt * 1.1;
      if (f.strafeT <= 0) { f.strafe *= -1; f.strafeT = 0.45 + Math.random() * 0.65; }
      const sideX = -normZ * f.strafe;
      const sideZ = normX * f.strafe;

      if (pDist > 19) _duelWant.add({ x: normX, y: 0, z: normZ });
      else if (pDist < 12) _duelWant.add({ x: -normX, y: 0, z: -normZ });
      _duelWant.add({ x: sideX * 1.1, y: 0, z: sideZ * 1.1 });
      if (_duelWant.lengthSq() > 0) _duelWant.normalize();

      f.cd -= dt;
      if (f.cd <= 0 && f.hasDisc && player.alive) {
        if (f.grounded && Math.random() < 0.35 && pDist >= 9) {
          // Leap throw
          f.vy = 11.5;
          f.grounded = false;
          f.jumps = 1;
          f.aerialThrow = true;
          burst(tmp.copy(f.pos).setY(f.y + 0.2), ORANGE, 14, 5);
        } else {
          // Ground throw with lead and curve bias
          const leadX = player.pos.x + player.vel.x * (0.28 * f.skill);
          const leadZ = player.pos.z + player.vel.z * (0.28 * f.skill);
          _duelAimDir.set(leadX - f.pos.x, 0, leadZ - f.pos.z);
          _duelAimDir.x += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.z += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.normalize();

          const curveDir = -f.peekDir;
          const curvePower = (Math.random() < 0.75) ? curveDir * (0.85 + Math.random() * 0.4) : 0;
          _duelOrigin.copy(f.pos).setY(1.7 + f.y).addScaledVector(_duelAimDir, 1.2);

          spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + duelTier * 2), f, ORANGE, curvePower);

          f.hasDisc = false;
          f.state = 'SEEK_COVER';
          f.cd = 0.8 + Math.random() * 0.6;
          f.coverPillar = null;
          f.peekDir = -f.peekDir;
        }
      }
    }
  }

  // 8. Movement simulation & resolve
  const moveSpeed = (f.state === 'SEEK_COVER')
    ? (f.speed || 10.5) * 1.35
    : (f.speed || 10.5);
  const inVoid = !isFoeTileSolid && f.y < 0;
  const lerpRate = inVoid ? 0 : (1 - Math.pow(.001, dt));
  f.vel.lerp(_duelWant.multiplyScalar(moveSpeed), lerpRate);
  f.pos.addScaledVector(f.vel, dt);
  resolveCircle(f.pos, FOE_R, f.y);

  // 9. Visual mesh updates
  f.obj.position.copy(f.pos);
  f.obj.position.y = f.y + (f.grounded ? Math.sin(time * 11) * 0.05 * Math.min(f.vel.length() / 8, 1) : 0);
  f.obj.rotation.x = THREE.MathUtils.clamp(-f.vy * 0.018, -0.22, 0.22);
  f.obj.userData.backDisc.visible = f.hasDisc;
  if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(time * 60) * 0.05; }
}

// ───────────────────────────── main loop ─────────────────────────────
const clock = new THREE.Clock();
let time = 0;

function update(dt) {
  time += dt;

  // ── update destructible tiles
  updateTiles(dt);

  // ── multiplayer network state broadcast
  syncNetworkState(dt);

  // ── player movement
  if (player.alive) {
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);   // +X when yaw=0; A/D were inverted
    const wish = new THREE.Vector3();
    if (keys.KeyW) wish.add(fwd);
    if (keys.KeyS) wish.sub(fwd);
    if (keys.KeyD) wish.add(right);
    if (keys.KeyA) wish.sub(right);

    if (touchMove.x !== 0 || touchMove.y !== 0) {
      wish.addScaledVector(fwd, -touchMove.y);
      wish.addScaledVector(right, touchMove.x);
    }

    const stickDeflection = Math.hypot(touchMove.x, touchMove.y);
    const hasKeys = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD;
    if (wish.lengthSq() > 0) wish.normalize();

    const prevY = player.y;
    const wasGrounded = player.grounded;
    const playerTile = getTileAt(player.pos.x, player.pos.z);
    const isTileSolid = playerTile && playerTile.state !== TILE_FALLEN && playerTile.state !== TILE_REBUILDING;

    if (!isTileSolid) {
      if (wasGrounded) {
        // Step off solid edge without jump -> immediate downward plunge impulse
        player.vy = Math.min(player.vy, -3.5);
      }
      player.grounded = false;
    }

    const inRecoveryZone = player.y < 0 && player.y > -3.5;
    if (inRecoveryZone && player.vy <= 0) {
      message('SURFACE COLLAPSE — JUMP / DASH!');
      msgT = Math.max(msgT, 0.4);
    }

    // ── vertical: jump / double-jump / gravity
    const GRAV = 30, JUMP_V = 11.5;
    if ((keys.Space || touchJumpHeld) && !player.jumpHeld) player.jumpBuf = 0.15;     // buffer the press
    player.jumpBuf = Math.max(0, (player.jumpBuf || 0) - dt);
    player.coyote = player.grounded ? 0.12 : Math.max(0, (player.coyote || 0) - dt);
    const canJump = player.jumps < 2 || player.coyote > 0;
    if (player.jumpBuf > 0 && canJump && player.jumps < 2) {
      player.jumpBuf = 0;
      if (inRecoveryZone) {
        player.vy = 12.0; // recovery jump upward velocity
        message('RECOVERY JUMP');
      } else {
        player.vy = player.jumps === 0 ? JUMP_V : JUMP_V * 0.88;
        if (player.jumps === 1) message('AIR JUMP');
      }
      player.jumps++; player.grounded = false;
      burst(player.pos.clone().setY(player.y + .2), CYAN, player.jumps === 1 ? 12 : 18, 5);
      shake(.08);
    }
    player.jumpHeld = !!keys.Space || touchJumpHeld;
    if ((keys.Space || touchJumpHeld) && player.vy > 0) player.vy -= GRAV * 0.55 * dt;   // hold for higher jump
    else player.vy -= GRAV * dt;
    player.y += player.vy * dt;

    if (isTileSolid) {
      // Step-up prevention: cannot land from below unless falling from above floor plane (prevY >= -0.15m)
      if (player.y <= 0 && prevY >= -0.15) {
        if (!player.grounded && player.vy < -6) { burst(player.pos.clone().setY(.15), CYAN, 10, 4); shake(.07); }
        player.y = 0; player.vy = 0; player.grounded = true; player.jumps = 0;
      } else if (player.y < -0.15) {
        player.grounded = false;
      }
    } else {
      player.grounded = false;
    }

    // Void Death Threshold
    if (player.y < -18 && player.alive) {
      gameOverReason = 'FALLEN INTO THE VOID';
      playDeRezSound();
      shake(0.6);
      damagePlayer(999);
    }

    let speed = (player.blocking || touchBlocking) ? 5.5 : 12;
    if (!hasKeys && stickDeflection > 0) {
      speed *= Math.min(1, Math.max(0.3, stickDeflection));
    }
    if (!player.grounded) speed *= 0.82;                  // reduced air control
    player.dashCd -= dt;
    const isDashTriggered = (keys.ShiftLeft || keys.ShiftRight || touchDashRequested);
    if (isDashTriggered && player.energy > 25 && player.dashCd <= 0) {
      let dashDir = wish.clone();
      if (dashDir.lengthSq() < 1e-4) {
        dashDir.copy(fwd);
      } else {
        dashDir.normalize();
      }
      const dashImpulse = inRecoveryZone ? 38 : 34;
      player.vel.add(dashDir.multiplyScalar(dashImpulse));
      if (inRecoveryZone && player.vy < 0) {
        player.vy = Math.max(player.vy, 4.0); // upward recovery pop
      }
      player.energy -= 25; player.dashCd = .45; shake(.18);
      burst(player.pos.clone().setY(player.y + .4), CYAN, 14, 5);
      if (inRecoveryZone) message('RECOVERY DASH');
    }
    touchDashRequested = false;
    player.energy = Math.min(100, player.energy + dt * 14);

    const target = wish.multiplyScalar(speed);
    // Disallow floor friction damping so lateral momentum is preserved in void
    const inVoid = !isTileSolid && player.y < 0;
    const lerpRate = inVoid
      ? (wish.lengthSq() > 0 ? (1 - Math.pow(0.5, dt)) : 0)
      : (player.grounded
          ? (1 - Math.pow(0.0009, dt))
          : (1 - Math.pow(0.005, dt)));
    player.vel.lerp(target, lerpRate);
    player.pos.addScaledVector(player.vel, dt);
    resolveCircle(player.pos, PLAYER_R, player.y);

    player.obj.position.copy(player.pos);
    player.obj.rotation.y = player.yaw;
    // bob on the ground, tuck-and-lean in the air
    player.obj.position.y = player.y + (player.grounded ? Math.sin(time * 11) * .05 * Math.min(player.vel.length() / 8, 1) : 0);
    player.obj.rotation.x = THREE.MathUtils.clamp(-player.vy * 0.018, -.22, .22);
    player.obj.userData.backDisc.visible = player.hasDisc;
    player.obj.userData.backDisc.rotation.z += dt * (player.hasDisc ? 3 : 0);
    if (player.blocking && player.hasDisc) {
      const d = player.obj.userData.backDisc;
      d.position.set(0, 1.75, .75); d.rotation.x = 0;
    } else {
      const d = player.obj.userData.backDisc;
      d.position.set(0, 1.8, -.45); d.rotation.x = Math.PI / 2;
    }
  }
  // ── remote opponent (multiplayer interpolation)
  if (gameMode === 'duel_multi' && duelOpponent && duelOpponent.obj) {
    duelOpponent.pos.lerp(duelOpponent.targetPos, dt * 16);
    duelOpponent.y = THREE.MathUtils.lerp(duelOpponent.y || 0, duelOpponent.targetY || 0, dt * 16);
    duelOpponent.obj.position.copy(duelOpponent.pos);
    duelOpponent.obj.position.y = duelOpponent.y;
    duelOpponent.yaw = THREE.MathUtils.lerp(
      duelOpponent.yaw !== undefined ? duelOpponent.yaw : duelOpponent.obj.rotation.y,
      duelOpponent.targetYaw,
      dt * 14
    );
    duelOpponent.obj.rotation.y = duelOpponent.yaw;
    if (duelOpponent.obj.userData && duelOpponent.obj.userData.backDisc) {
      duelOpponent.obj.userData.backDisc.visible = duelOpponent.hasDisc;
      if (duelOpponent.blocking && duelOpponent.hasDisc) {
        duelOpponent.obj.userData.backDisc.position.set(0, 1.75, .75);
        duelOpponent.obj.userData.backDisc.rotation.x = 0;
      } else {
        duelOpponent.obj.userData.backDisc.position.set(0, 1.8, -.45);
        duelOpponent.obj.userData.backDisc.rotation.x = Math.PI / 2;
      }
    }
  }

  // ── foes
  for (let fi = foes.length - 1; fi >= 0; fi--) {
    const f = foes[fi];
    if (gameMode === 'duel' && f.isBoss) {
      updateDuelFoe(f, dt);
      continue;
    }

    if (f.y === undefined) { f.y = 0; f.vy = 0; f.grounded = true; f.didRecover = false; }
    const prevY = f.y;
    const wasGrounded = f.grounded;
    f.vy -= 30 * dt;
    f.y += f.vy * dt;

    const sTile = getTileAt(f.pos.x, f.pos.z);
    const isSTileSolid = sTile && sTile.state !== TILE_FALLEN && sTile.state !== TILE_REBUILDING;

    if (isSTileSolid) {
      if (f.y <= 0 && prevY >= -0.15) {
        f.y = 0;
        f.vy = 0;
        f.grounded = true;
        f.didRecover = false;
      } else if (f.y < -0.15) {
        f.grounded = false;
      }
    } else {
      if (wasGrounded) {
        f.vy = Math.min(f.vy, -3.5);
      }
      f.grounded = false;
    }

    // Failsafe Re-Arm Watchdog (Section 2.2)
    if (!f.hasDisc && !discs.some(d => d.owner === f)) {
      f.rearmTimer = (f.rearmTimer || 0) + dt;
      if (f.rearmTimer > 2.5) {
        f.hasDisc = true;
        f.rearmTimer = 0;
        if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
          f.obj.userData.backDisc.visible = true;
        }
      }
    } else {
      f.rearmTimer = 0;
    }

    // Emergency recovery jump / dash for swarm foe
    if (f.y < 0 && f.y > -3.0 && !f.didRecover) {
      f.vy = 12.0;
      f.didRecover = true;
      f.grounded = false;
      const safeTarget = findNearestIntactTile(f.pos.x, f.pos.z);
      if (safeTarget) {
        const dx = safeTarget.x - f.pos.x;
        const dz = safeTarget.z - f.pos.z;
        const dLen = Math.hypot(dx, dz);
        if (dLen > 0.01) {
          f.vel.x += (dx / dLen) * 28.0;
          f.vel.z += (dz / dLen) * 28.0;
        }
      }
      burst(tmp.copy(f.pos).setY(f.y + 0.3), ORANGE, 14, 5);
    }

    // Void Death Threshold
    if (f.y < -18) {
      burst(f.pos.clone().setY(-18), ORANGE, 70, 16);
      score += 200;
      message('PIT ELIMINATION +200');
      killFoe(f);
      continue;
    }

    const toP = tmp.copy(player.pos).sub(f.pos); toP.y = 0;
    const dist = toP.length(); toP.normalize();
    const see = lineOfSight(f.pos, player.pos) && player.alive;

    f.strafeT -= dt;
    if (f.strafeT <= 0) { f.strafe *= -1; f.strafeT = .9 + Math.random() * 1.8; }
    const side = new THREE.Vector3(toP.z, 0, -toP.x).multiplyScalar(f.strafe);

    const want = new THREE.Vector3();
    const ideal = 15;
    if (dist > ideal + 3) want.add(toP);
    else if (dist < ideal - 5) want.sub(toP);
    want.addScaledVector(side, .85);
    if (!see) want.add(toP).multiplyScalar(1.2);

    // avoid other foes
    for (const o of foes) if (o !== f) {
      const dd = tmp.copy(f.pos).sub(o.pos); dd.y = 0;
      const L = dd.length();
      if (L < 4 && L > .01) want.addScaledVector(dd.normalize(), (4 - L) * .5);
    }
    if (want.lengthSq() > 0) want.normalize();

    const moveSpeed = 8.2 + wave * .25;
    const inVoid = !isSTileSolid && f.y < 0;
    const lerpRate = inVoid ? 0 : (1 - Math.pow(.002, dt));
    f.vel.lerp(want.multiplyScalar(moveSpeed), lerpRate);
    f.pos.addScaledVector(f.vel, dt);
    resolveCircle(f.pos, FOE_R, f.y);

    f.obj.position.copy(f.pos);
    f.obj.position.y = f.y + (f.grounded ? Math.sin(time * 11) * 0.05 * Math.min(f.vel.length() / 8, 1) : 0);
    f.obj.rotation.x = THREE.MathUtils.clamp(-f.vy * 0.018, -0.22, 0.22);

    // Deflected disc threat response or normal facing
    let deflectThreat = null;
    for (let i = 0; i < discs.length; i++) {
      const D = discs[i];
      if (D.isDeflected && D.owner === 'player' && !D.returning) {
        const toFoeX = f.pos.x - D.pos.x;
        const toFoeZ = f.pos.z - D.pos.z;
        if ((D.vel.x * toFoeX + D.vel.z * toFoeZ) > 0 && Math.hypot(toFoeX, toFoeZ) < 30) {
          deflectThreat = D;
          break;
        }
      }
    }
    if (deflectThreat) {
      const faceAngle = Math.atan2(deflectThreat.pos.x - f.pos.x, deflectThreat.pos.z - f.pos.z);
      const faceDiff = ((faceAngle - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      f.obj.rotation.y += THREE.MathUtils.clamp(faceDiff, -18 * dt, 18 * dt);
      f.telegraphT = (f.telegraphT || 0) + dt;
      if (f.telegraphT > 0.12) {
        f.telegraphT = 0;
        burst(tmp.set(f.pos.x, 2.45 + (f.y || 0), f.pos.z), ORANGE, 4, 2);
      }
    } else {
      const face = Math.atan2(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
      const turnRate = 6 * dt;
      f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
    }
    f.obj.userData.backDisc.visible = f.hasDisc;
    if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(time * 60) * .05; }

    // fire
    f.cd -= dt;
    if (f.cd <= 0 && f.hasDisc && see && player.alive) {
      f.hasDisc = false;
      f.cd = Math.max(1.1, 3.4 - wave * .18) + Math.random();
      const lead = player.pos.clone().addScaledVector(player.vel, 0.22 * f.skill);
      const dir = lead.sub(f.pos).setY(0).normalize();
      dir.x += (Math.random() - .5) * (1 - f.skill) * .45;
      dir.z += (Math.random() - .5) * (1 - f.skill) * .45;
      dir.normalize();
      const origin = f.pos.clone().setY(1.7 + (f.y || 0)).addScaledVector(dir, 1.2);
      spawnDisc(origin, dir.multiplyScalar(26 + wave), f, ORANGE);
    }
  }

  // ── discs
  for (let i = discs.length - 1; i >= 0; i--) {
    const D = discs[i];
    D.t += dt; D.spin += dt * 26;

    const holder = D.owner === 'player' ? player : D.owner;
    const holderAlive = D.owner === 'player' ? player.alive : (gameMode === 'duel_multi' ? (duelOpponent && duelOpponent.alive) : foes.includes(D.owner));

    if (!holderAlive) { scene.remove(D.obj); discs.splice(i, 1); continue; }

    // Deflection miss handling (Section 3.C)
    if (D.isDeflected) {
      D.deflectTime = (D.deflectTime || 0) + dt;
      if ((D.deflectTime >= 1.5 || (D.deflectBounces || 0) >= 2) && !D.returning) {
        D.isDeflected = false;
        D.returning = true;
        const targetFoe = (D.originalOwner && foes.includes(D.originalOwner)) ? D.originalOwner : (foes[0] || null);
        if (targetFoe) {
          D.owner = targetFoe;
          D.color = ORANGE;
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(ORANGE);
            if (o.isPointLight) o.color.setHex(ORANGE);
          });
        }
      }
    }

    if (!D.returning && (D.t > 1.5 || D.bounces >= 3)) D.returning = true;

    if (D.returning) {
      const home = holder.pos.clone().setY(1.7 + (holder.y || 0));
      const dir = home.sub(D.pos);
      const L = dir.length();
      dir.normalize();
      D.vel.lerp(dir.multiplyScalar(34), 1 - Math.pow(.0005, dt));
      if (L < 1.4) {
        if (D.owner === 'player') {
          player.hasDisc = true;
        } else if (D.owner) {
          D.owner.hasDisc = true;
          if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
            D.owner.obj.userData.backDisc.visible = true;
          }
        }
        scene.remove(D.obj); discs.splice(i, 1); continue;
      }
    } else if (D.curve) {
      // Lateral Magnus-effect curve integration
      const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
      const speed = Math.hypot(vx, vy, vz);
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = D.curve * CURVE_ACCEL * dt;
        let nvx = vx + nx * latAcc;
        let nvz = vz + nz * latAcc;
        const newSpeed = Math.hypot(nvx, vy, nvz);
        if (newSpeed > 1e-4) {
          const s = speed / newSpeed;
          D.vel.x = nvx * s;
          D.vel.y = vy * s;
          D.vel.z = nvz * s;
        }
      }
      D.curve *= Math.exp(-CURVE_LAMBDA * dt);
    }

    D.pos.addScaledVector(D.vel, dt);
    // gentle gravity-free hover, keep near chest height
    if (D.pos.y > DISC_R) {
      D.pos.y += (1.7 - D.pos.y) * Math.min(1, dt * 2.2);
    }

    // floor collision & void check
    const yFloor = DISC_R;
    const tile = getTileAt(D.pos.x, D.pos.z);
    const isSolid = tile && tile.state !== TILE_FALLEN && tile.state !== TILE_REBUILDING;

    if (D.pos.y <= yFloor) {
      if (isSolid) {
        if (tile && tile.state === TILE_INTACT) {
          triggerTileWarning(tile, D.color);
          if (gameMode === 'duel_multi' && playerRole === 'p1') {
            onTileDestabilizedByHost(tile.ix, tile.iz);
          }
        }
        D.pos.y = yFloor;
        if (D.vel.y < 0) {
          const significant = Math.abs(D.vel.y) >= 1.0;
          D.vel.y = -D.vel.y * 0.65;
          D.vel.x *= 0.95;
          D.vel.z *= 0.95;
          if (Math.abs(D.vel.y) < 1.0) D.vel.y = 0;
          if (significant && !D.returning) {
            D.bounces++;
            if (D.hitFoes) D.hitFoes.clear();
            burst(D.pos.clone(), D.color, 10, 6);
            shake(.06);
          }
        }
      } else {
        // Tile is FALLEN: plunge through into the void beneath the grid!
        D.vel.y -= 25 * dt;
        D.voidTime = (D.voidTime || 0) + dt;
        if ((D.voidTime > 1.5 || D.pos.y < -12) && !D.returning) {
          D.returning = true;
        }
      }
    }

    // wall bounce
    const lim = ARENA - 1.5;
    let bounced = false;
    if (D.pos.x > lim) { D.pos.x = lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.x < -lim) { D.pos.x = -lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.z > lim) { D.pos.z = lim; D.vel.z *= -1; bounced = true; }
    if (D.pos.z < -lim) { D.pos.z = -lim; D.vel.z *= -1; bounced = true; }
    // pillar bounce
    for (const p of pillars) {
      const dx = D.pos.x - p.x, dz = D.pos.z - p.z;
      const dd = Math.hypot(dx, dz), min = p.r + DISC_R;
      if (dd < min && dd > .001) {
        const nx = dx / dd, nz = dz / dd;
        D.pos.x = p.x + nx * min; D.pos.z = p.z + nz * min;
        const dot = D.vel.x * nx + D.vel.z * nz;
        D.vel.x -= 2 * dot * nx; D.vel.z -= 2 * dot * nz;
        bounced = true;
      }
    }
    if (bounced) {
      if (D.isDeflected) {
        D.deflectBounces = (D.deflectBounces || 0) + 1;
      }
      if (!D.returning) {
        D.bounces++;
        if (D.hitFoes) D.hitFoes.clear();
        D.curve = -D.curve * 0.5;
        burst(D.pos.clone(), D.color, 10, 6);
        shake(.06);
      }
    }

    // hits
    let discCaught = false;
    if (D.owner === 'player') {
      if (gameMode === 'duel_multi' && duelOpponent && duelOpponent.alive) {
        const f = duelOpponent;
        const fCenter = tmp.copy(f.pos).setY(1.5 + (f.y || 0));
        const dist = D.pos.distanceTo(fCenter);
        if (dist < FOE_R + DISC_R + .35) {
          if (f.blocking && f.hasDisc) {
            burst(D.pos.clone(), WHITE, 24, 10);
            shake(0.12);
            message('RIVAL BLOCKED!');
            D.returning = true;
          } else {
            burst(D.pos.clone(), PURPLE, 28, 12);
            shake(0.18);
            message('DIRECT HIT ON RIVAL!');
            D.returning = true;
          }
        }
      }
      for (const f of foes) {
        if (D.hitFoes && D.hitFoes.has(f)) continue;
        const fCenter = tmp.copy(f.pos).setY(1.5 + (f.y || 0));
        const dist = D.pos.distanceTo(fCenter);

        // Section 3.B: AI Threat Detection & Catch Window for deflected discs
        if (D.isDeflected && dist <= 2.2) {
          const toFoe = fCenter.clone().sub(D.pos);
          const movingToward = D.vel.dot(toFoe) > 0;
          const fwd = new THREE.Vector3(
            Math.sin(f.obj.rotation.y),
            0,
            Math.cos(f.obj.rotation.y)
          ).normalize();
          const toDisc = D.pos.clone().sub(f.pos).setY(0);
          const toDiscLen = toDisc.length();
          const facingDot = toDiscLen > 1e-4 ? fwd.dot(toDisc.normalize()) : 1;
          const hasLos = lineOfSight(f.pos, D.pos);

          if (movingToward && facingDot > 0.2 && hasLos) {
            const catchChance = (gameMode === 'duel' && f.isBoss)
              ? Math.min(0.85, 0.75 + (duelTier - 1) * 0.03)
              : 0.35;
            if (Math.random() < catchChance) {
              // ON SUCCESS (AI Catch)
              scene.remove(D.obj);
              discs.splice(i, 1);
              f.hasDisc = true;
              if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
                f.obj.userData.backDisc.visible = true;
              }
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), WHITE, 28, 11);
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), ORANGE, 14, 7);
              shake(0.2);
              message('RIVAL CAUGHT DISC!');
              f.cd = 0.35 + Math.random() * 0.4;
              if (f.isBoss) f.state = 'ATTACK';
              discCaught = true;
              break;
            } else {
              // ON FAILURE (Direct Hit to Rival)
              if (!D.hitFoes) D.hitFoes = new Set();
              D.hitFoes.add(f);
              const critDmg = 85 + D.bounces * 20;
              f.hp -= critDmg;
              f.hurt = 0.8;
              f.cd = Math.max(f.cd, 0.8);
              score += 150;
              message('DEFLECTION HIT!');
              burst(D.pos.clone(), WHITE, 32, 12);
              burst(D.pos.clone(), ORANGE, 20, 8);
              shake(0.25);
              if (f.hp <= 0) {
                killFoe(f);
              } else {
                D.vel.multiplyScalar(-0.4);
                D.vel.x += (Math.random() - 0.5) * 4;
                D.vel.z += (Math.random() - 0.5) * 4;
                D.vel.y = Math.random() * 2 + 1;
                D.isDeflected = false;
                D.color = ORANGE;
                D.obj.traverse(o => {
                  if (o.material && o.material.color) o.material.color.setHex(ORANGE);
                  if (o.isPointLight) o.color.setHex(ORANGE);
                });
                D.owner = f;
                D.returning = true;
              }
              discCaught = true;
              break;
            }
          }
        }

        if (dist < FOE_R + DISC_R + .35) {
          if (!D.hitFoes) D.hitFoes = new Set();
          D.hitFoes.add(f);

          if (D.isDeflected) {
            const critDmg = 85 + D.bounces * 20;
            f.hp -= critDmg;
            f.hurt = 0.8;
            f.cd = Math.max(f.cd, 0.8);
            score += 150;
            message('DEFLECTION HIT!');
            burst(D.pos.clone(), WHITE, 32, 12);
            burst(D.pos.clone(), ORANGE, 20, 8);
            shake(0.25);
            if (f.hp <= 0) {
              killFoe(f);
            } else {
              D.vel.multiplyScalar(-0.4);
              D.vel.x += (Math.random() - 0.5) * 4;
              D.vel.z += (Math.random() - 0.5) * 4;
              D.vel.y = Math.random() * 2 + 1;
              D.isDeflected = false;
              D.color = ORANGE;
              D.obj.traverse(o => {
                if (o.material && o.material.color) o.material.color.setHex(ORANGE);
                if (o.isPointLight) o.color.setHex(ORANGE);
              });
              D.owner = f;
              D.returning = true;
            }
            discCaught = true;
            break;
          }

          // Truthful foe forward vector (visor is at +Z in local space)
          const fwd = new THREE.Vector3(
            Math.sin(f.obj.rotation.y),
            0,
            Math.cos(f.obj.rotation.y)
          ).normalize();

          // Approach 1 (Position relative to foe)
          const dRel = D.pos.clone().sub(f.pos).setY(0);
          if (dRel.lengthSq() > 1e-6) dRel.normalize();
          const posRear = dRel.dot(fwd) < 0.05;

          // Approach 2 (Velocity alignment)
          const vNorm = D.vel.clone().setY(0);
          if (vNorm.lengthSq() > 1e-6) vNorm.normalize();
          const velRear = vNorm.dot(fwd) > 0.05;

          const rear = posRear || velRear;

          let dmg = 55 + D.bounces * 18;          // ricochets already hit harder
          if (rear && D.bounces > 0) {
            dmg = (55 + D.bounces * 18) * 2.0;    // banked shot to an exposed back
            score += 150;
            message('REAR STRIKE  x2');
            burst(D.pos.clone(), WHITE, 34, 13);
            shake(.3);
          } else if (rear) {
            dmg *= 1.4;                            // plain backshot still rewarded
            score += 60;
            burst(D.pos.clone(), WHITE, 20, 10);
            shake(.18);
          } else {
            burst(D.pos.clone(), ORANGE, 24, 9);
            shake(.15);
          }

          f.hp -= dmg;
          f.hurt = .25; score += 25;
          D.returning = true;
          if (f.hp <= 0) killFoe(f);

          // If close enough to player, complete catch
          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            player.hasDisc = true;
            scene.remove(D.obj);
            discs.splice(i, 1);
            discCaught = true;
          }
          break;
        }
      }
    } else if (player.alive) {
      const pc = tmp.copy(player.pos).setY(1.5 + player.y);
      if (D.pos.distanceTo(pc) < PLAYER_R + DISC_R + .35) {
        const toDisc = D.pos.clone().sub(pc).setY(0).normalize();
        const facing = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        if (player.blocking && player.hasDisc && toDisc.dot(facing) > .35) {
          // parry: reflect back, becomes player-owned deflected threat
          burst(D.pos.clone(), WHITE, 30, 12);
          shake(.25); score += 50;
          D.originalOwner = (D.owner !== 'player') ? D.owner : (D.originalOwner || foes[0]);
          D.owner = 'player';
          D.color = WHITE;
          D.isDeflected = true;
          D.returning = false;
          D.bounces = 0;
          D.deflectBounces = 0;
          D.deflectTime = 0;
          D.t = 0;
          D.curve = 0;
          if (D.hitFoes) D.hitFoes.clear();
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(WHITE);
            if (o.isPointLight) o.color.setHex(WHITE);
          });
          const incomingSpd = D.vel.length();
          const spd = Math.max(36, incomingSpd * 1.25);
          if (gameMode === 'duel_multi' && duelOpponent) {
            const dirToRival = duelOpponent.pos.clone().setY(1.7 + (duelOpponent.y || 0)).sub(D.pos).normalize();
            D.vel.copy(dirToRival).multiplyScalar(spd);
            if (db && currentRoomId && currentUser) {
              const roomRef = getRoomRef(currentRoomId);
              roomUpdateDoc(roomRef, {
                lastThrow: {
                  id: Math.random().toString(36).substring(2, 9),
                  sender: playerRole,
                  x: +D.pos.x.toFixed(2),
                  y: +D.pos.y.toFixed(2),
                  z: +D.pos.z.toFixed(2),
                  vx: +D.vel.x.toFixed(2),
                  vy: +D.vel.y.toFixed(2),
                  vz: +D.vel.z.toFixed(2),
                  curve: 0
                }
              }).catch(err => console.warn("Parry sync err:", err));
            }
          } else {
            const targetFoe = (D.originalOwner && foes.includes(D.originalOwner)) ? D.originalOwner : foes[0];
            if (targetFoe) {
              const dirToRival = targetFoe.pos.clone().setY(1.7 + (targetFoe.y || 0)).sub(D.pos).normalize();
              D.vel.copy(dirToRival).multiplyScalar(spd);
            } else {
              D.vel.copy(facing).multiplyScalar(spd);
            }
          }
          D.pos.addScaledVector(toDisc, 1.2);
          message('DEFLECTED!');
        } else {
          // Elastic impact rebound: enemy disc hits player without being blocked (Section 2.1)
          const behind = toDisc.dot(facing) < -0.25;
          damagePlayer((16 + D.bounces * 6) * (behind && D.bounces > 0 ? 1.8 : 1));
          if (behind && D.bounces > 0) message('HIT FROM BEHIND');
          burst(D.pos.clone(), ORANGE, 18, 7);
          shake(0.18);

          // Invert and damp velocity: v <- -v * 0.45 + random deflection
          D.vel.multiplyScalar(-0.45);
          D.vel.x += (Math.random() - 0.5) * 4;
          D.vel.z += (Math.random() - 0.5) * 4;
          D.vel.y = Math.random() * 2 + 1;
          D.bounces = 0;
          D.curve = 0;
          D.isDeflected = false;
          D.returning = true;

          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            if (D.owner === 'player') {
              player.hasDisc = true;
            } else if (D.owner) {
              D.owner.hasDisc = true;
              if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
                D.owner.obj.userData.backDisc.visible = true;
              }
            }
            scene.remove(D.obj);
            discs.splice(i, 1);
            discCaught = true;
          }
        }
      }
    }

    if (discCaught) continue;

    D.obj.position.copy(D.pos);
    const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
    const spd = Math.hypot(vx, vy, vz);
    const hSpd = Math.hypot(vx, vz);
    if (hSpd > 1e-4 && spd > 1e-4) {
      _fwd.set(vx / spd, vy / spd, vz / spd);
      _r0.set(-vz / hSpd, 0, vx / hSpd);
      _u0.crossVectors(_r0, _fwd);

      const beta = (D.curve || 0) * 0.45 + Math.sin(D.spin * 0.2) * 0.08;
      const sinB = Math.sin(beta), cosB = Math.cos(beta);
      _uBank.copy(_u0).multiplyScalar(cosB).addScaledVector(_r0, sinB);
      _rBank.copy(_r0).multiplyScalar(cosB).addScaledVector(_u0, -sinB);

      const sinS = Math.sin(D.spin), cosS = Math.cos(D.spin);
      _localX.copy(_rBank).multiplyScalar(cosS).addScaledVector(_fwd, sinS);
      _localY.copy(_fwd).multiplyScalar(cosS).addScaledVector(_rBank, -sinS);

      _discMat.makeBasis(_localX, _localY, _uBank);
      D.obj.quaternion.setFromRotationMatrix(_discMat);
    } else {
      D.obj.rotation.set(Math.PI / 2 + Math.sin(D.spin * .2) * .25, 0, D.spin);
    }
  }

  // ── waves & duel rematch
  if (spawnTimer > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      if (gameMode === 'duel') {
        message('DUEL TIER ' + duelTier + ' — FIGHT!');
        spawnDuelBoss(duelTier);
      } else {
        spawnWave();
      }
    }
  }

  // ── sparks
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.life -= dt;
    const a = s.pts.geometry.attributes.position;
    for (let j = 0; j < s.v.length; j++) {
      s.v[j].y -= 16 * dt;
      a.array[j*3] += s.v[j].x * dt; a.array[j*3+1] += s.v[j].y * dt; a.array[j*3+2] += s.v[j].z * dt;
      if (a.array[j*3+1] < .05) { a.array[j*3+1] = .05; s.v[j].y *= -.35; s.v[j].x *= .7; s.v[j].z *= .7; }
    }
    a.needsUpdate = true;
    s.pts.material.opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) { scene.remove(s.pts); s.pts.geometry.dispose(); sparks.splice(i, 1); }
  }

  // ── camera (third person, over the shoulder)
  const DIST = 9.0, HEIGHT = 4.3, SHOULDER = 1.7;
  const back = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const side = new THREE.Vector3(-back.z, 0, back.x);
  const camOff = back.multiplyScalar(DIST)
    .addScaledVector(side, SHOULDER)
    .setY(HEIGHT - player.pitch * 5.0);
  const desired = player.pos.clone().add(camOff);
  desired.y += player.y * 0.85;
  desired.y = Math.max(1.4, desired.y);
  // keep camera inside arena
  desired.x = THREE.MathUtils.clamp(desired.x, -ARENA + 2, ARENA - 2);
  desired.z = THREE.MathUtils.clamp(desired.z, -ARENA + 2, ARENA - 2);
  camera.position.lerp(desired, 1 - Math.pow(.000000015, dt));
  const fwdV = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const sideV = new THREE.Vector3(-fwdV.z, 0, fwdV.x);
  const look = player.pos.clone()
    .add(new THREE.Vector3(0, 2.0 + player.y + player.pitch * 7, 0))
    .addScaledVector(sideV, 1.7)
    .addScaledVector(fwdV, 14);
  camera.lookAt(look);
  if (shakeAmt > 0) {
    camera.position.x += (Math.random() - .5) * shakeAmt;
    camera.position.y += (Math.random() - .5) * shakeAmt;
    camera.position.z += (Math.random() - .5) * shakeAmt;
    shakeAmt = Math.max(0, shakeAmt - dt * 2.2);
  }

  // ── analog steering when the cursor can't be captured
  if (!isLocked() && steerX && !isTouchDevice) {
    const RATE = 3.1;                       // radians/sec at full deflection
    player.yaw -= steerX * RATE * dt;
    if (player.yaw >  Math.PI) player.yaw -= Math.PI * 2;
    if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
  }
  // live input monitor (F1)
  const km = document.getElementById('keymon');
  if (km && km.style.display === 'block') {
    const on = k => keys[k] ? 'style="color:#fff;text-shadow:0 0 8px #fff"' : 'style="opacity:.3"';
    km.innerHTML = `<b ${on('KeyW')}>W</b> <b ${on('KeyA')}>A</b> <b ${on('KeyS')}>S</b> <b ${on('KeyD')}>D</b>
      <b ${on('KeyQ')}>Q</b> <b ${on('KeyE')}>E</b>
      <b ${on('Space')}>SPACE</b> <b ${on('ShiftLeft')}>SHIFT</b><br>
      curve ${getPlayerCurveIntent().toFixed(2)} · y ${player.y.toFixed(2)} · jumps ${player.jumps} · grounded ${player.grounded}<br>
      pointerlock ${isLocked()} · focus ${document.hasFocus()}`;
  }
  // lock-state banner
  const lb = document.getElementById('lockstate');
  if (lb) lb.style.display = (isTouchDevice || isLocked()) ? 'none' : 'block';

  // ── crosshair + trajectory preview
  const aim = aimTarget();
  const traj = updateTrajectory(aim, dt);
  updateThreatPaths();
  const ch = document.getElementById('crosshair');
  if (ch) {
    const onFoe = !!aim.foe || !!(traj && traj.willHit);
    ch.classList.toggle('hot', onFoe);
    ch.classList.toggle('bank', !!(traj && traj.willHit && traj.bounces > 0));
    ch.classList.toggle('empty', !player.hasDisc);
    const qHeld = (!!keys.KeyQ || touchCurveL) && !(!!keys.KeyE || touchCurveR);
    const eHeld = (!!keys.KeyE || touchCurveR) && !(!!keys.KeyQ || touchCurveL);
    ch.classList.toggle('curve-l', qHeld);
    ch.classList.toggle('curve-r', eHeld);
    const range = document.getElementById('range');
    if (range) range.textContent = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
  }

  // ── grid pulse
  grid.material.opacity = .72 + Math.sin(time * 1.6) * .1 + player.hurtFlash * .3;
  const cTile = getTileAt(0, 0);
  ring.visible = !cTile || cTile.state !== TILE_FALLEN;
  ring.material.opacity = .35 + Math.sin(time * 2.2) * .15;

  // ── HUD
  updateHUD();
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl.style.opacity = 0; }
}

function loop() {
  requestAnimationFrame(loop);
  let dt = clock.getDelta();
  if (justResumed) {
    dt = 0;
    justResumed = false;
  }
  dt = Math.min(dt, 0.05);
  if (running && !paused) update(dt);
  else if (!running) { // idle camera orbit on menu
    time += dt;
    camera.position.set(Math.sin(time * .12) * 34, 14, Math.cos(time * .12) * 34);
    camera.lookAt(0, 2, 0);
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { scene.remove(s.pts); sparks.splice(i, 1); } }
  }
  renderer.render(scene, camera);
}
loop();


// debug hooks (headless test harness)
window.__dbg = {
  running: () => running,
  paused: () => paused,
  mode: () => gameMode,
  duelTier: () => duelTier,
  pauseGame: () => pauseGame(),
  resumeGame: () => resumeGame(),
  restartMatch: () => restartMatch(),
  startMode: (m) => startMode(m),
  showModeSelect: () => showModeSelect(),
  killBoss: () => { if (foes.length > 0) killFoe(foes[0]); },
  spawnTimer: () => +spawnTimer.toFixed(2),
  pos: () => ({ x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2) }),
  y: () => +player.y.toFixed(2),
  foes: () => foes.length,
  gridInfo: () => ({ visible: grid.visible, y: grid.position.y, op: +grid.material.opacity.toFixed(2),
    renderOrder: grid.renderOrder, camY: +camera.position.y.toFixed(2),
    fog: [scene.fog.near, scene.fog.far], floorVisible: floor.visible }),
  setYaw: v => { player.yaw = v; },
  grounded: () => player.grounded,
  jumps: () => player.jumps,
  curve: () => getPlayerCurveIntent(),
  traj: () => {
    const a = aimTarget();
    const chest = player.pos.clone().setY(1.7 + player.y);
    const dir = a.point.clone().sub(chest).normalize();
    const origin = chest.clone().addScaledVector(dir, 1.1);
    const sim = simulatePath(origin, dir.clone().multiplyScalar(38), 3, 1.5, 1 / 90, getPlayerCurveIntent());
    return { points: sim.pts.length, bounces: sim.bounceAt.length, hitsFoe: !!sim.hitFoe,
             lineVisible: trajLine.visible, drawn: trajLine.geometry.drawRange.count };
  },
  yaw: () => +player.yaw.toFixed(3),
  pitch: () => +player.pitch.toFixed(3),
  aim: () => { const a = aimTarget(); return { dist: +a.dist.toFixed(1), foe: !!a.foe }; },
  // dot product between the live disc's velocity and the direction to the crosshair point
  discAlign: () => {
    const d = discs.find(x => x.owner === 'player'); if (!d) return null;
    const toTarget = aimTarget().point.clone().sub(player.pos.clone().setY(1.7 + player.y));
    if (toTarget.lengthSq() < 1e-6 || d.vel.lengthSq() < 1e-6) return 0;
    const val = d.vel.clone().normalize().dot(toTarget.normalize());
    return isNaN(val) ? 0 : +val.toFixed(3);
  },
  discCurve: () => {
    const d = discs.find(x => x.owner === 'player');
    return d ? +(d.curve || 0).toFixed(3) : null;
  },
  discs: () => discs.map(d => ({ pos: { x: +d.pos.x.toFixed(2), y: +d.pos.y.toFixed(2), z: +d.pos.z.toFixed(2) }, vel: { x: +d.vel.x.toFixed(2), y: +d.vel.y.toFixed(2), z: +d.vel.z.toFixed(2) }, bounces: d.bounces, returning: d.returning, isDeflected: !!d.isDeflected, owner: d.owner === 'player' ? 'player' : 'foe' })),
  lastMessage: () => msgEl.textContent,
  score: () => score,
  simulatePath: (origin, vel, maxBounces, tMax, step, curve) => simulatePath(origin, vel, maxBounces, tMax, step, curve),
  throwDisc: () => throwDisc(),
  foesList: () => foes.map(f => ({ pos: { x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2) }, hp: f.hp, hasDisc: f.hasDisc, rotY: +f.obj.rotation.y.toFixed(3) })),
  duelBoss: () => {
    const b = foes.find(f => f.isBoss);
    return b ? {
      y: +b.y.toFixed(2),
      vy: +b.vy.toFixed(2),
      grounded: b.grounded,
      jumps: b.jumps,
      state: b.state,
      dashCd: +b.dashCd.toFixed(2),
      hasDisc: b.hasDisc,
      rearmTimer: +(b.rearmTimer || 0).toFixed(2),
      hp: b.hp,
      pos: { x: +b.pos.x.toFixed(2), z: +b.pos.z.toFixed(2) }
    } : null;
  },
  spawnTestDisc: (offsetZ = 8) => {
    const b = foes.find(f => f.isBoss);
    if (!b) return null;
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z + offsetZ);
    spawnDisc(p, new THREE.Vector3(0, 0, -32), 'player', CYAN, 0);
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  },
  spawnDeflectedTestDisc: (offsetZ = 6) => {
    const b = foes.find(f => f.isBoss);
    if (!b) return null;
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z + offsetZ);
    const d = spawnDisc(p, new THREE.Vector3(0, 0, -36), 'player', WHITE, 0);
    d.isDeflected = true;
    d.originalOwner = b;
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  },
  spawnEnemyHitDisc: () => {
    const b = foes.find(f => f.isBoss) || foes[0];
    if (!b) return null;
    b.hasDisc = false;
    const p = new THREE.Vector3(player.pos.x, 1.5, player.pos.z - 3);
    const d = spawnDisc(p, new THREE.Vector3(0, 0, 24), b, ORANGE, 0);
    return d;
  },
  spawnParryTestDisc: (dist = 2.0) => {
    const b = (gameMode === 'duel_multi' && duelOpponent) ? duelOpponent : (foes.find(f => f.isBoss) || foes[0]);
    if (!b) return null;
    b.hasDisc = false;
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).normalize();
    const p = player.pos.clone().addScaledVector(fwd, dist).setY(1.5);
    const d = spawnDisc(p, fwd.clone().multiplyScalar(-24), b, ORANGE, 0);
    return {
      pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
      speed: 24
    };
  },
  spawnDeflectedMissDisc: () => {
    spawnTimer = 0;
    let b = foes.find(f => f.isBoss) || foes[0];
    if (!b) {
      spawnDuelBoss(duelTier);
      b = foes[0];
    }
    const p = new THREE.Vector3(0, 1.5, 0);
    const d = spawnDisc(p, new THREE.Vector3(34, 0, 0), 'player', WHITE, 0);
    d.isDeflected = true;
    d.originalOwner = b;
    return d;
  },
  triggerRearDisc: () => {
    const b = foes.find(f => f.isBoss);
    if (!b) return null;
    const fwdZ = Math.cos(b.obj.rotation.y);
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z - 8.0 * (fwdZ >= 0 ? 1 : -1));
    const d = spawnDisc(p, new THREE.Vector3(0, 0, (fwdZ >= 0 ? 30 : -30)), 'player', CYAN, 0);
    d.bounces = 1;
    return true;
  },
  tiles: () => tiles,
  TILE_N,
  TILE_W,
  getTileAt: (x, z) => getTileAt(x, z),
  worldToTile: (x, z) => worldToTile(x, z),
  tileToWorld: (ix, iz) => tileToWorld(ix, iz),
  dropTileAt: (x, z) => {
    const t = getTileAt(x, z);
    if (!t) return false;
    t.state = TILE_FALLEN;
    t.regenTimer = 0;
    t.mesh.position.y = t.origY - 16;
    t.mesh.visible = false;
    return true;
  },
  triggerTileWarningAt: (x, z) => {
    const t = getTileAt(x, z);
    if (!t) return false;
    triggerTileWarning(t);
    return true;
  },
  resetTiles: () => {
    for (const tile of tiles.values()) {
      tile.state = TILE_INTACT;
      tile.timer = 0;
      tile.regenTimer = 0;
      tile.mesh.position.y = tile.origY;
      tile.mesh.visible = true;
      if (tile.slabMesh.material !== tileMatIntact) {
        tile.slabMesh.material.dispose();
        tile.edgeMesh.material.dispose();
        tile.slabMesh.material = tileMatIntact;
        tile.edgeMesh.material = tileEdgeMatIntact;
      }
    }
    return true;
  },
  fallenTilesCount: () => Array.from(tiles.values()).filter(t => t.state === TILE_FALLEN).length,
  isPlayerInRecoveryZone: () => player.y < 0 && player.y > -3.5,
  playerY: () => +player.y.toFixed(2),
  playerGrounded: () => player.grounded,
  playerJumps: () => player.jumps,
  playerHasDisc: () => player.hasDisc,
  setPlayerBlocking: (b) => { player.blocking = b; },
  setPlayerPos: (x, z, y = 0) => {
    player.pos.x = x; player.pos.z = z; player.y = y;
    if (!player.alive || player.hp <= 0) { player.alive = true; player.hp = 100; }
  },
  step: (dt = 0.016) => update(dt),
  derezAudioHook: playDeRezSound,
  isTouchDevice: () => isTouchDevice,
  setTouchDevice: (val) => {
    isTouchDevice = !!val;
    if (isTouchDevice) document.body.classList.add('touch-device');
    else document.body.classList.remove('touch-device');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice ? 1.5 : 2));
    checkOrientation();
  },
  touchMove: () => ({ x: touchMove.x, y: touchMove.y }),
  touchState: () => ({
    moveTouchId,
    lookTouchId,
    touchJumpHeld,
    touchDashRequested,
    touchBlocking,
    touchCurveL,
    touchCurveR
  }),
  setTouchMove: (x, y) => { touchMove.x = x; touchMove.y = y; },
  triggerTouchJump: (held = false) => {
    touchJumpHeld = held;
    player.jumpBuf = 0.15;
  },
  triggerTouchDash: () => { touchDashRequested = true; },
  setTouchCurve: (l, r) => {
    touchCurveL = !!l;
    touchCurveR = !!r;
    updateCurveButtons();
  },
  checkOrientation: () => checkOrientation(),
  particleBurstCount: (n = 22) => isTouchDevice ? Math.max(1, Math.round(n * 0.5)) : n,
  initNetwork: () => initNetwork(),
  createRoom: () => onClickCreateRoom(),
  joinRoom: (code) => {
    const inp = document.getElementById('joinRoomInput');
    if (inp) inp.value = code;
    return onClickConfirmJoin();
  },
  currentRoomId: () => currentRoomId,
  playerRole: () => playerRole,
  duelOpponent: () => duelOpponent ? {
    pos: { x: +duelOpponent.pos.x.toFixed(2), z: +duelOpponent.pos.z.toFixed(2) },
    y: +duelOpponent.y.toFixed(2),
    hp: duelOpponent.hp,
    hasDisc: duelOpponent.hasDisc,
    blocking: duelOpponent.blocking,
    targetPos: { x: +duelOpponent.targetPos.x.toFixed(2), z: +duelOpponent.targetPos.z.toFixed(2) }
  } : null,
  copyRoomCode: (code) => copyRoomCode(code),
  teardownMultiplayer: () => teardownMultiplayer(),
  startMultiplayerDuel: (role, code) => startMultiplayerDuel(role, code),
  syncNetworkState: (dt) => syncNetworkState(dt),
  enableMockNetwork: () => initMockNetwork(),
  onTileDestabilizedByHost: (ix, iz) => onTileDestabilizedByHost(ix, iz),
  getRoomData: async (code) => {
    const roomRef = getRoomRef(code || currentRoomId);
    const snap = await roomGetDoc(roomRef);
    return snap.exists() ? snap.data() : null;
  }
};

window.__TRON__ = window.__dbg;

