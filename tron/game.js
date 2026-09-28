import * as THREE from './vendor/three.module.js';

// ───────────────────────────── constants ─────────────────────────────
const ARENA = 46;              // half-extent of the square grid
const CYAN = 0x4ff2ff, ORANGE = 0xff6a10, WHITE = 0xffffff;
const PLAYER_R = 0.9, FOE_R = 0.95, DISC_R = 0.55;
const CURVE_ACCEL = 38.0;              // lateral Magnus acceleration m/s^2 (hooks around pillars)
const CURVE_LAMBDA = 0.45;             // exponential decay rate per second

// ───────────────────────────── renderer ──────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060a);
scene.fog = new THREE.Fog(0x02090f, 55, 170);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ───────────────────────────── arena build ───────────────────────────
scene.add(new THREE.HemisphereLight(0x3f9ab5, 0x061820, 0.95));
const key = new THREE.DirectionalLight(0x9ff0ff, 0.8);
key.position.set(30, 60, 20); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
const d = ARENA + 10;
key.shadow.camera.left = -d; key.shadow.camera.right = d;
key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
scene.add(key);

// floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA * 2, ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 })
);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

const grid = new THREE.GridHelper(ARENA * 2, 46, CYAN, 0x1f9fb8);
grid.material.transparent = true; grid.material.opacity = .8;
grid.material.blending = THREE.AdditiveBlending; grid.material.depthWrite = false;
grid.position.y = 0.03; grid.renderOrder = 1; scene.add(grid);

// reflective-ish sheen ring at centre
const ring = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.5, 96),
  new THREE.MeshBasicMaterial({ color: CYAN, side: THREE.DoubleSide, transparent: true, opacity: .5 })
);
ring.rotation.x = -Math.PI / 2; ring.position.y = .03; scene.add(ring);

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
    p.y += (1.7 - p.y) * Math.min(1, step * 2.2);        // same hover easing

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
    for (const f of foes) {
      if (p.distanceTo(tmp.copy(f.pos).setY(1.5)) < FOE_R + DISC_R + .35) {
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
    const facing = new THREE.Vector3(-Math.sin(f.obj.rotation.y), 0, -Math.cos(f.obj.rotation.y));
    const seg = sim.pts[sim.pts.length - 1].clone().sub(sim.pts[Math.max(0, sim.pts.length - 4)]).setY(0).normalize();
    return seg.dot(facing) > 0.25 && sim.hitFoe.bounces > 0;
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

let gameMode = 'swarm'; // 'duel' or 'swarm'
let duelTier = 1;
let foes = [], discs = [], wave = 1, score = 0, running = false, spawnTimer = 0, gameOverT = 0;

// ───────────────────────────── input & pause ─────────────────────────
let paused = false, lockFailed = false;
let lastPauseTime = 0;
let justResumed = false;
const keys = {};
const EAT = ['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyP','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F1'];

function getPlayerCurveIntent() {
  if (keys.KeyQ && !keys.KeyE) return -1.0;
  if (keys.KeyE && !keys.KeyQ) return 1.0;
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
  const c = codeOf(e);
  if (!c) return;
  keys[c] = true;
  if (EAT.includes(c)) e.preventDefault();        // no page scroll / button re-trigger
  if (c === 'F1') { const m = document.getElementById('keymon'); if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
  if (c === 'KeyP' || c === 'Escape') {
    if (running) {
      if (paused) {
        if (performance.now() - lastPauseTime > 150) resumeGame();
      } else {
        pauseGame();
      }
    }
  }
}
function onUp(e) { const c = codeOf(e); if (c) keys[c] = false; }
// bind on BOTH targets in the capture phase so nothing can swallow the key first
addEventListener('keydown', onDown, { passive: false, capture: true });
addEventListener('keyup', onUp, { capture: true });
document.addEventListener('keydown', e => { if (e.target !== window) onDown(e); }, { passive: false, capture: true });
document.addEventListener('keyup', e => { if (e.target !== window) onUp(e); }, { capture: true });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });  // no stuck keys

const canvas = renderer.domElement;
canvas.tabIndex = 0;                       // canvas can hold keyboard focus
canvas.style.outline = 'none';
canvas.addEventListener('mousedown', () => { focusGame(); if (lockFailed === false && document.pointerLockElement !== canvas && running && !paused) tryLock(); });
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
  lastPauseTime = performance.now();
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
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
  showModeSelectMenu();
}

function getMainMenuHtml() {
  return `<div class="card">
  <h1>TRON</h1><h2>D I S C &nbsp; A R E N A</h2>
  <div class="keys">
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
  <div class="mode-select">
    <button id="duelBtn" class="mode-btn duel-btn">ENTER DUEL (1v1)</button>
    <button id="swarmBtn" class="mode-btn swarm-btn">ENTER SWARM (WAVES)</button>
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
  if (db) db.onclick = (e) => { e.stopPropagation(); startMode('duel'); };
  if (sb) sb.onclick = (e) => { e.stopPropagation(); startMode('swarm'); };
}

// Bind pause menu & HUD buttons
const pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) pauseBtn.onclick = (e) => { e.stopPropagation(); pauseGame(); };
const resumeBtn = document.getElementById('resumeBtn');
if (resumeBtn) resumeBtn.onclick = (e) => { e.stopPropagation(); resumeGame(); };
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) restartBtn.onclick = (e) => { e.stopPropagation(); restartMatch(); };
const modeSelectBtn = document.getElementById('modeSelectBtn');
if (modeSelectBtn) modeSelectBtn.onclick = (e) => { e.stopPropagation(); showModeSelect(); };
bindMainMenuEvents();

// Pointer lock can throw synchronously (SecurityError) inside sandboxed/permission-less
// iframes, and can also fail async. Both paths just enable the cursor-steering fallback.
function tryLock() {
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
  const locked = document.pointerLockElement === canvas;
  document.body.style.cursor = (running && !paused && locked) ? 'none' : 'default';
}

function focusGame() {
  try { window.focus(); } catch (e) {}
  canvas.focus();
}
document.addEventListener('pointerlockerror', () => { lockFailed = true; });

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && running) {
    if (!paused && !lockFailed) {
      pauseGame();
    }
  }
  setCursor();
});

// ───────────────────────────── mouse look ───────────────────────────
// One code path drives the camera: accumulate raw mouse deltas into yaw/pitch.
// movementX/movementY are reported by the browser with OR without pointer lock,
// so look works identically in a permission-less iframe. When unlocked we also
// add edge-steering, because the real cursor eventually hits the window border
// and stops producing deltas.
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
  cursorX = e.clientX; cursorY = e.clientY;
  if (!running || paused) return;

  if (isLocked()) {
    // TRUE POINTER LOCK: cursor is captured, camera follows raw deltas 1:1.
    steerX = steerY = 0;
    look(e.movementX || 0, e.movementY || 0);
  } else {
    // FALLBACK (iframe denies pointer lock, so the OS cursor can't be captured):
    // treat the cursor's offset from the crosshair as an analog stick. The camera
    // turns at a RATE, so the crosshair stays the aim point and the loose cursor
    // can never "run out of screen" or fight you.
    const nx = (e.clientX / innerWidth)  * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    const dz = 0.08;                                    // dead zone at centre
    const curve = v => { const m = Math.abs(v); return m < dz ? 0 : Math.sign(v) * Math.pow((m - dz) / (1 - dz), 1.7); };
    steerX = curve(nx);                                 // horizontal: turn RATE (can spin 360)
    steerY = 0;
    // vertical: ABSOLUTE - cursor height maps straight to pitch, so it settles
    // instead of drifting to the clamp when you park the mouse off-centre.
    player.pitch = THREE.MathUtils.clamp(-ny * 0.5, -0.6, 0.55);
  }
});

// Re-request lock on every click: some embedders only grant it after a gesture,
// and any Esc press drops it. Cheap to retry, silent when refused.
canvas.addEventListener('click', () => { if (running && !isLocked()) tryLock(); });

addEventListener('wheel', e => {
  if (!running) return;
  sens = THREE.MathUtils.clamp(sens * (e.deltaY > 0 ? 0.9 : 1.1), 0.0006, 0.012);
  showSens();
}, { passive: true });
function showSens() {
  const s = document.getElementById('sens');
  if (!s) return;
  s.textContent = 'SENSITIVITY ' + Math.round(sens / 0.0023 * 100) + '%';
  s.style.opacity = 1; clearTimeout(showSens._t);
  showSens._t = setTimeout(() => s.style.opacity = 0, 1200);
}

addEventListener('mousedown', e => {
  if (!running || paused) return;
  if (e.button === 0) throwDisc();
  if (e.button === 2) player.blocking = true;
});
addEventListener('mouseup', e => { if (e.button === 2) player.blocking = false; });
addEventListener('contextmenu', e => e.preventDefault());

// ───────────────────────────── game logic ────────────────────────────
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

  if (gameMode === 'duel') {
    duelTier = 1;
    spawnDuelBoss(duelTier);
    message('DUEL TIER 1 — FIGHT');
  } else {
    wave = 1;
    spawnWave();
    message('CYCLE 1 — FIGHT');
  }
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
    speed: 10.5 + (tier - 1) * 0.5
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
      strafeT: 1 + Math.random() * 2, hurt: 0, skill: Math.min(.3 + wave * .08, .95)
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
  const origin = chest.add(dir.clone().multiplyScalar(1.1));
  const curve = getPlayerCurveIntent();
  spawnDisc(origin, dir.multiplyScalar(38), 'player', CYAN, curve);
  window.__lastThrowDot = dir.clone().normalize().dot(aim.point.clone().sub(origin).normalize());
  shake(0.12);
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
  for (const f of foes) {
    const cx = f.pos.x - _ro.x, cy = 1.5 - _ro.y, cz = f.pos.z - _ro.z;
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
  discs.push({ obj, pos: pos.clone(), vel: vel.clone(), owner, color, bounces: 0, t: 0, returning: false, spin: 0, curve });
}

function damagePlayer(amount, from) {
  if (!player.alive) return;
  player.hp -= amount; player.hurtFlash = 1;
  burst(player.pos.clone().setY(1.6), CYAN, 18, 8);
  shake(0.35);
  if (player.hp <= 0) {
    player.hp = 0; player.alive = false; running = false; gameOverT = 0;
    burst(player.pos.clone().setY(1.4), CYAN, 90, 16);
    player.obj.visible = false;
    setTimeout(showGameOver, 900);
  }
}

function killFoe(f) {
  burst(f.pos.clone().setY(1.5), ORANGE, 70, 14);
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
function message(t) { msgEl.textContent = t; msgEl.style.opacity = 1; msgT = 2; }

function showGameOver() {
  overlay.style.display = 'flex';
  const title = gameMode === 'duel' ? 'DUEL ELIMINATED' : 'DEREZZED';
  const stats = gameMode === 'duel'
    ? `TIERS CLEARED <b style="color:#fff">${duelTier - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`
    : `CYCLES SURVIVED <b style="color:#fff">${wave - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${score}</b>`;
  overlay.innerHTML = `<div class="card dead">
    <h1>${title}</h1>
    <h2>YOUR DISC WAS CLAIMED</h2>
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
function resolveCircle(pos, radius) {
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

// ───────────────────────────── main loop ─────────────────────────────
const clock = new THREE.Clock();
let time = 0;

function update(dt) {
  time += dt;
  // ── player movement
  if (player.alive) {
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);   // +X when yaw=0; A/D were inverted
    const wish = new THREE.Vector3();
    if (keys.KeyW) wish.add(fwd);
    if (keys.KeyS) wish.sub(fwd);
    if (keys.KeyD) wish.add(right);
    if (keys.KeyA) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    // ── vertical: jump / double-jump / gravity
    const GRAV = 30, JUMP_V = 11.5;
    if (keys.Space && !player.jumpHeld) player.jumpBuf = 0.15;     // buffer the press
    player.jumpBuf = Math.max(0, (player.jumpBuf || 0) - dt);
    player.coyote = player.grounded ? 0.12 : Math.max(0, (player.coyote || 0) - dt);
    const canJump = player.jumps < 2 || player.coyote > 0;
    if (player.jumpBuf > 0 && canJump && player.jumps < 2) {
      player.jumpBuf = 0;
      player.vy = player.jumps === 0 ? JUMP_V : JUMP_V * 0.88;
      player.jumps++; player.grounded = false;
      burst(player.pos.clone().setY(player.y + .2), CYAN, player.jumps === 1 ? 12 : 18, 5);
      shake(.08);
      if (player.jumps === 2) message('AIR JUMP');
    }
    player.jumpHeld = !!keys.Space;
    if (keys.Space && player.vy > 0) player.vy -= GRAV * 0.55 * dt;   // hold for higher jump
    else player.vy -= GRAV * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      if (!player.grounded && player.vy < -6) { burst(player.pos.clone().setY(.15), CYAN, 10, 4); shake(.07); }
      player.y = 0; player.vy = 0; player.grounded = true; player.jumps = 0;
    }

    let speed = player.blocking ? 5.5 : 12;
    if (!player.grounded) speed *= 0.82;                  // reduced air control
    player.dashCd -= dt;
    if ((keys.ShiftLeft || keys.ShiftRight) && player.energy > 25 && wish.lengthSq() > 0 && player.dashCd <= 0) {
      player.vel.add(wish.clone().multiplyScalar(34));
      player.energy -= 25; player.dashCd = .45; shake(.18);
      burst(player.pos.clone().setY(.4), CYAN, 14, 5);
    }
    player.energy = Math.min(100, player.energy + dt * 14);

    const target = wish.multiplyScalar(speed);
    player.vel.lerp(target, 1 - Math.pow(0.0009, dt));
    player.pos.addScaledVector(player.vel, dt);
    resolveCircle(player.pos, PLAYER_R);

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
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 2);

  // ── foes
  for (const f of foes) {
    const toP = tmp.copy(player.pos).sub(f.pos); toP.y = 0;
    const dist = toP.length(); toP.normalize();
    const see = lineOfSight(f.pos, player.pos) && player.alive;

    if (f.isBoss) {
      f.strafeT -= dt * (!f.hasDisc ? 1.6 : 1.1);
      if (f.strafeT <= 0) { f.strafe *= -1; f.strafeT = 0.45 + Math.random() * 0.65; }
    } else {
      f.strafeT -= dt;
      if (f.strafeT <= 0) { f.strafe *= -1; f.strafeT = .9 + Math.random() * 1.8; }
    }
    const side = new THREE.Vector3(toP.z, 0, -toP.x).multiplyScalar(f.strafe);

    const want = new THREE.Vector3();
    if (f.isBoss && !f.hasDisc) {
      // Tactical retreat behind pillars when disc is in flight
      let bestCover = null;
      let bestDist = Infinity;
      for (const pl of pillars) {
        const plPos = new THREE.Vector3(pl.x, 0, pl.z);
        const pToPl = plPos.clone().sub(player.pos).setY(0);
        const len = pToPl.length();
        if (len > 0.1) {
          const coverPos = plPos.clone().addScaledVector(pToPl.normalize(), pl.r + 2.4);
          const d = f.pos.distanceTo(coverPos);
          if (d < bestDist) {
            bestDist = d;
            bestCover = coverPos;
          }
        }
      }
      if (bestCover) {
        const coverDir = bestCover.clone().sub(f.pos).setY(0);
        if (coverDir.length() > 0.4) {
          want.copy(coverDir.normalize()).multiplyScalar(1.5);
        }
      }
      want.addScaledVector(side, 0.9);
    } else {
      const ideal = f.isBoss ? 16 : 15;
      if (dist > ideal + 3) want.add(toP);
      else if (dist < ideal - 5) want.sub(toP);
      want.addScaledVector(side, f.isBoss ? 1.1 : .85);
      if (!see) want.add(toP).multiplyScalar(1.2);
    }

    // avoid other foes
    for (const o of foes) if (o !== f) {
      const dd = tmp.copy(f.pos).sub(o.pos); dd.y = 0;
      const L = dd.length();
      if (L < 4 && L > .01) want.addScaledVector(dd.normalize(), (4 - L) * .5);
    }
    if (want.lengthSq() > 0) want.normalize();

    const moveSpeed = f.isBoss
      ? (f.speed || 10.5) * (!f.hasDisc ? 1.25 : 1.0)
      : (8.2 + wave * .25);
    const lerpRate = f.isBoss ? 1 - Math.pow(.001, dt) : 1 - Math.pow(.002, dt);
    f.vel.lerp(want.multiplyScalar(moveSpeed), lerpRate);
    f.pos.addScaledVector(f.vel, dt);
    resolveCircle(f.pos, FOE_R);

    f.obj.position.copy(f.pos);
    const face = Math.atan2(-(player.pos.x - f.pos.x), -(player.pos.z - f.pos.z));
    const turnRate = f.isBoss ? 8 * dt : 6 * dt;
    f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
    f.obj.userData.backDisc.visible = f.hasDisc;
    if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(time * 60) * .05; }

    // fire
    f.cd -= dt;
    if (f.cd <= 0 && f.hasDisc && see && player.alive) {
      f.hasDisc = false;
      if (f.isBoss) {
        f.cd = 0.8 + Math.random() * 0.6; // 0.8 - 1.4s cooldown
        const lead = player.pos.clone().addScaledVector(player.vel, 0.28 * f.skill);
        const dir = lead.sub(f.pos).setY(0).normalize();
        dir.x += (Math.random() - .5) * (1 - f.skill) * .18;
        dir.z += (Math.random() - .5) * (1 - f.skill) * .18;
        dir.normalize();
        const origin = f.pos.clone().setY(1.7).addScaledVector(dir, 1.2);
        // Capable of curved throws toward the player
        const curveDir = Math.random() < 0.5 ? 1.0 : -1.0;
        const curvePower = (Math.random() < 0.7) ? curveDir * (0.8 + Math.random() * 0.4) : 0;
        spawnDisc(origin, dir.multiplyScalar(28 + duelTier * 2), f, ORANGE, curvePower);
      } else {
        f.cd = Math.max(1.1, 3.4 - wave * .18) + Math.random();
        const lead = player.pos.clone().addScaledVector(player.vel, 0.22 * f.skill);
        const dir = lead.sub(f.pos).setY(0).normalize();
        dir.x += (Math.random() - .5) * (1 - f.skill) * .45;
        dir.z += (Math.random() - .5) * (1 - f.skill) * .45;
        dir.normalize();
        const origin = f.pos.clone().setY(1.7).addScaledVector(dir, 1.2);
        spawnDisc(origin, dir.multiplyScalar(26 + wave), f, ORANGE);
      }
    }
  }

  // ── discs
  for (let i = discs.length - 1; i >= 0; i--) {
    const D = discs[i];
    D.t += dt; D.spin += dt * 26;

    const holder = D.owner === 'player' ? player : D.owner;
    const holderAlive = D.owner === 'player' ? player.alive : foes.includes(D.owner);

    if (!holderAlive) { scene.remove(D.obj); discs.splice(i, 1); continue; }

    if (!D.returning && (D.t > 1.5 || D.bounces >= 3)) D.returning = true;

    if (D.returning) {
      const home = holder.pos.clone().setY(1.7);
      const dir = home.sub(D.pos);
      const L = dir.length();
      dir.normalize();
      D.vel.lerp(dir.multiplyScalar(34), 1 - Math.pow(.0005, dt));
      if (L < 1.4) {
        if (D.owner === 'player') player.hasDisc = true; else D.owner.hasDisc = true;
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
    D.pos.y += (1.7 - D.pos.y) * Math.min(1, dt * 2.2);

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
    if (bounced && !D.returning) {
      D.bounces++;
      D.curve = -D.curve * 0.5;
      burst(D.pos.clone(), D.color, 10, 6);
      shake(.06);
    }

    // hits
    if (!D.returning || D.owner !== 'player') {
      if (D.owner === 'player') {
        for (const f of foes) {
          if (D.pos.distanceTo(tmp.copy(f.pos).setY(1.5)) < FOE_R + DISC_R + .35) {
            // Which side of the program did the disc come from?
            // foe's facing vector (matches how the model is oriented each frame)
            const facing = new THREE.Vector3(-Math.sin(f.obj.rotation.y), 0, -Math.cos(f.obj.rotation.y));
            const travel = D.vel.clone().setY(0).normalize();
            // disc travelling the SAME way the foe faces => it came in behind them
            const rear = travel.dot(facing) > 0.25;

            let dmg = 55 + D.bounces * 18;          // ricochets already hit harder
            if (rear && D.bounces > 0) {
              dmg *= 2.0;                            // banked shot to an exposed back
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
            break;
          }
        }
      } else if (player.alive) {
        const pc = tmp.copy(player.pos).setY(1.5);
        if (D.pos.distanceTo(pc) < PLAYER_R + DISC_R + .35) {
          const toDisc = D.pos.clone().sub(pc).setY(0).normalize();
          const facing = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
          if (player.blocking && player.hasDisc && toDisc.dot(facing) > .35) {
            // parry: reflect back, becomes player-owned
            burst(D.pos.clone(), WHITE, 30, 12);
            shake(.25); score += 50;
            D.owner = 'player'; D.color = CYAN; D.returning = false; D.bounces = 1; D.t = 0; D.curve = 0;
            D.obj.traverse(o => { if (o.material && o.material.color) o.material.color.setHex(CYAN); if (o.isPointLight) o.color.setHex(CYAN); });
            D.vel.copy(facing).multiplyScalar(40).addScaledVector(toDisc, 6);
            D.pos.addScaledVector(toDisc, 1.2);
            message('DEFLECT');
          } else {
            const behind = toDisc.dot(facing) < -0.25;
            damagePlayer((16 + D.bounces * 6) * (behind && D.bounces > 0 ? 1.8 : 1));
            if (behind && D.bounces > 0) message('HIT FROM BEHIND');
            scene.remove(D.obj); discs.splice(i, 1);
            continue;
          }
        }
      }
    }

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
  if (!isLocked() && steerX) {
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
  if (lb) lb.style.display = isLocked() ? 'none' : 'block';

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
    const qHeld = !!keys.KeyQ && !keys.KeyE;
    const eHeld = !!keys.KeyE && !keys.KeyQ;
    ch.classList.toggle('curve-l', qHeld);
    ch.classList.toggle('curve-r', eHeld);
    const range = document.getElementById('range');
    if (range) range.textContent = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
  }

  // ── grid pulse
  grid.material.opacity = .72 + Math.sin(time * 1.6) * .1 + player.hurtFlash * .3;
  ring.material.opacity = .35 + Math.sin(time * 2.2) * .15;

  // ── HUD
  el('hpbar').firstElementChild.style.width = player.hp + '%';
  el('discbar').firstElementChild.style.width = (player.hasDisc ? 100 : 0) + '%';
  el('energybar').firstElementChild.style.width = player.energy + '%';

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
  } else {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `CYCLE <span id="wave" class="big">${wave}</span>`;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `HOSTILES <span id="foes">${foes.length}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'none';
  }

  el('score').textContent = score;
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
  }
};
