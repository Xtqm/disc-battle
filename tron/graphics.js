import * as THREE from './vendor/three.module.js';
import { state, player } from './state.js';
import { config } from './config.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { mockStore, mockListeners, initMockNetwork, mockDocRef, mockSetDoc, mockGetDoc, mockUpdateDoc, mockOnSnapshot, initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot, generateRoomCode, copyRoomCode, showHostWaitingModal, showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, startMultiplayerDuel, onRoomSnapshot, syncNetworkState, onTileDestabilizedByHost, renderGameOverActions, bindGameOverActions, showMultiplayerVictory, showMultiplayerDefeat, teardownMultiplayer } from './network.js';
import { EAT, getPlayerCurveIntent, codeOf, onDown, onUp, canvas, overlay, startMode, startGame, pauseGame, resumeGame, restartMatch, showModeSelect, getMainMenuHtml, showModeSelectMenu, bindMainMenuEvents, pauseBtn, onPauseClick, resumeBtn, onResumeClick, restartBtn, onRestartClick, modeSelectBtn, onModeSelectClick, btnCopyCode, btnConfirmJoin, btnCancelRoom, joinRoomInput, tryLock, setCursor, focusGame, isLocked, look, showSens, moveStartPos, touchMove, lookLastPos, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, onTouchStart, onTouchMove, onTouchEnd, bindMobileButtons } from './input.js';
import { updateHUD, resetGame, spawnDuelBoss, spawnWave, throwDisc, _ro, aimTarget, aimDir, spawnDisc, damagePlayer, killFoe } from './entities.js';
import { el, msgEl, message, showGameOver, shake } from './ui.js';
import { clock, update, loop } from './main.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isTouchDevice ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01060a);
scene.fog = new THREE.Fog(0x02090f, 55, 170);

export const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 400);

state.orientationPaused = false;
export function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const orientOverlay = document.getElementById('orientationOverlay');
  if (state.isTouchDevice && isPortrait) {
    if (orientOverlay) orientOverlay.style.display = 'flex';
    if (state.running && !state.paused) {
      state.orientationPaused = true;
      pauseGame();
    }
  } else {
    if (orientOverlay) orientOverlay.style.display = 'none';
    if (state.orientationPaused) {
      state.orientationPaused = false;
      resumeGame();
    }
  }
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isTouchDevice ? 1.5 : 2));
  checkOrientation();
});
window.addEventListener('orientationchange', checkOrientation);

scene.add(new THREE.HemisphereLight(0x3f9ab5, 0x061820, 0.95));
export const key = new THREE.DirectionalLight(0x9ff0ff, 0.8);
key.position.set(30, 60, 20); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
export const d = config.ARENA + 10;
key.shadow.camera.left = -d; key.shadow.camera.right = d;
key.shadow.camera.top = d; key.shadow.camera.bottom = -d;
scene.add(key);

// floor - modular destructible grid tiles
export const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(config.ARENA * 2, config.ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 })
);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.visible = false; scene.add(floor);

export const grid = new THREE.GridHelper(config.ARENA * 2, 46, config.CYAN, 0x1f9fb8);
grid.material.transparent = true; grid.material.opacity = .8;
grid.material.blending = THREE.AdditiveBlending; grid.material.depthWrite = false;
grid.position.y = 0.03; grid.renderOrder = 1; grid.visible = false; scene.add(grid);

// reflective-ish sheen ring at centre
export const ring = new THREE.Mesh(
  new THREE.RingGeometry(9, 9.5, 96),
  new THREE.MeshBasicMaterial({ color: config.CYAN, side: THREE.DoubleSide, transparent: true, opacity: .5 })
);
ring.rotation.x = -Math.PI / 2; ring.position.y = .03; scene.add(ring);

config.TILE_N = 24;
config.TILE_W = (config.ARENA * 2) / config.TILE_N;
config.TILE_WARN_DURATION = 0.75;
config.TILE_REGEN_DELAY = 12.0;

config.TILE_INTACT = 0;
config.TILE_WARNING = 1;
config.TILE_FALLEN = 2;
config.TILE_REBUILDING = 3;

// Map: key `${ix}_${iz}` -> { mesh, slabMesh, edgeMesh, state, timer, origY, ix, iz, center, regenTimer, warningColor }
export const tiles = new Map();

export const tileGeo = new THREE.BoxGeometry(config.TILE_W - 0.08, 0.35, config.TILE_W - 0.08);
export const tileEdgeGeo = new THREE.EdgesGeometry(tileGeo);
export const tileMatIntact = new THREE.MeshStandardMaterial({ color: 0x07202c, roughness: .28, metalness: .8 });
export const tileEdgeMatIntact = new THREE.LineBasicMaterial({ color: 0x187588, transparent: true, opacity: .75, depthWrite: false });

export const tileGroup = new THREE.Group();
scene.add(tileGroup);

for (let ix = 0; ix < config.TILE_N; ix++) {
  for (let iz = 0; iz < config.TILE_N; iz++) {
    const cx = -config.ARENA + (ix + 0.5) * config.TILE_W;
    const cz = -config.ARENA + (iz + 0.5) * config.TILE_W;
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
      state: config.TILE_INTACT,
      timer: 0,
      origY: 0,
      ix,
      iz,
      center: new THREE.Vector3(cx, 0, cz),
      regenTimer: 0,
      warningColor: config.CYAN
    });
  }
}

export function worldToTile(x, z) {
  const ix = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((x + config.ARENA) / config.TILE_W)));
  const iz = Math.min(config.TILE_N - 1, Math.max(0, Math.floor((z + config.ARENA) / config.TILE_W)));
  return { ix, iz };
}

export function tileToWorld(ix, iz) {
  return {
    x: -config.ARENA + (ix + 0.5) * config.TILE_W,
    z: -config.ARENA + (iz + 0.5) * config.TILE_W
  };
}

export function getTileAt(x, z) {
  if (Math.abs(x) > config.ARENA || Math.abs(z) > config.ARENA) return null;
  const { ix, iz } = worldToTile(x, z);
  return tiles.get(`${ix}_${iz}`) || null;
}

export function findNearestIntactTile(x, z) {
  const { ix: cix, iz: ciz } = worldToTile(x, z);
  let best = null;
  let bestDistSq = Infinity;
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const nx = cix + dx, nz = ciz + dz;
        if (nx < 0 || nx >= config.TILE_N || nz < 0 || nz >= config.TILE_N) continue;
        const t = tiles.get(`${nx}_${nz}`);
        if (t && t.state === config.TILE_INTACT) {
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
export const wallMat = new THREE.MeshStandardMaterial({ color: 0x04141c, roughness: .4, metalness: .9 });
export const glowMat = new THREE.MeshBasicMaterial({ color: config.CYAN });
for (let i = 0; i < 4; i++) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, 9, 1.4), wallMat);
  const g = new THREE.Mesh(new THREE.BoxGeometry(config.ARENA * 2 + 2, .22, 1.7), glowMat);
  const a = i * Math.PI / 2;
  const p = new THREE.Vector3(Math.sin(a) * config.ARENA, 4.5, Math.cos(a) * config.ARENA);
  w.position.copy(p); w.rotation.y = a; w.receiveShadow = true;
  g.position.set(p.x, 9.1, p.z); g.rotation.y = a;
  scene.add(w, g);
  // vertical light strips
  for (let k = -config.ARENA + 6; k < config.ARENA; k += 11) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(.18, 8.4, .1), glowMat);
    s.position.set(p.x + Math.cos(a) * k, 4.4, p.z - Math.sin(a) * k);
    s.rotation.y = a; scene.add(s);
  }
}

// pillars = cover + ricochet surfaces
export const pillars = [];
export const pillarSpots = [[-20,-20],[20,-20],[-20,20],[20,20],[0,-30],[0,30],[-31,0],[31,0]];
for (const [x, z] of pillarSpots) {
  const r = 2.1, h = 6.5;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 6), wallMat);
  m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const e = new THREE.Mesh(new THREE.CylinderGeometry(r + .05, r + .05, .2, 6), glowMat);
  e.position.set(x, h, z); scene.add(e);
  pillars.push({ x, z, r });
}

export const tmp = new THREE.Vector3();
export const _discMat = new THREE.Matrix4();
export const _fwd = new THREE.Vector3();
export const _r0 = new THREE.Vector3();
export const _u0 = new THREE.Vector3();
export const _uBank = new THREE.Vector3();
export const _rBank = new THREE.Vector3();
export const _localX = new THREE.Vector3();
export const _localY = new THREE.Vector3();

// duel AI reusable scratch vectors (zero heap allocations in hot loop)
export const _duelToP = new THREE.Vector3();
export const _duelSide = new THREE.Vector3();
export const _duelWant = new THREE.Vector3();
export const _duelSafe = new THREE.Vector3();
export const _duelCoverDir = new THREE.Vector3();
export const _duelLead = new THREE.Vector3();
export const _duelAimDir = new THREE.Vector3();
export const _duelOrigin = new THREE.Vector3();
export const _duelEvade = new THREE.Vector3();

export function makeProgram(color) {
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

export function discGeo() {
  const g = new THREE.TorusGeometry(config.DISC_R, .085, 8, 40);
  return g;
}

export function makeDisc(color) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(discGeo(), new THREE.MeshBasicMaterial({ color }));
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(config.DISC_R - .06, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .22, side: THREE.DoubleSide })
  );
  const hub = new THREE.Mesh(new THREE.TorusGeometry(.2, .05, 6, 20), new THREE.MeshBasicMaterial({ color: config.WHITE }));
  g.add(outer, face, hub);
  g.add(new THREE.PointLight(color, 2.4, 10));
  return g;
}

// particle burst pool
export const sparks = [];
export function burst(pos, color, n = 22, power = 10) {
  if (state.isTouchDevice) n = Math.max(1, Math.round(n * 0.5));
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

export function triggerTileWarning(tile, color = config.CYAN) {
  if (!tile || tile.state !== config.TILE_INTACT) return;
  tile.state = config.TILE_WARNING;
  tile.timer = config.TILE_WARN_DURATION;
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

export function spawnTileDeRezSparks(cx, cz) {
  const hw = (config.TILE_W - 0.08) * 0.5;
  const pts = [
    new THREE.Vector3(cx - hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz - hw),
    new THREE.Vector3(cx + hw, 0.1, cz + hw),
    new THREE.Vector3(cx - hw, 0.1, cz + hw),
    new THREE.Vector3(cx, 0.1, cz)
  ];
  for (const p of pts) burst(p, config.CYAN, 12, 8);
  playTileDropSound();
  shake(0.12);
}

export function updateTiles(dt) {
  for (const tile of tiles.values()) {
    if (tile.state === config.TILE_INTACT) continue;

    if (tile.state === config.TILE_WARNING) {
      tile.timer -= dt;
      const strobe = 0.5 + 0.5 * Math.sin(state.time * 40);
      const isWhite = Math.sin(state.time * 40) > 0;
      const col = isWhite ? 0xffffff : (tile.warningColor || config.CYAN);

      tile.slabMesh.material.emissive.setHex(col);
      tile.slabMesh.material.emissiveIntensity = 0.5 + strobe * 1.5;
      tile.edgeMesh.material.color.setHex(col);
      tile.edgeMesh.material.opacity = strobe;

      // Shake tile vertically by +-0.05m
      tile.mesh.position.y = tile.origY + Math.sin(state.time * 60) * 0.05;

      if (tile.timer <= 0) {
        tile.state = config.TILE_FALLEN;
        tile.regenTimer = 0;
        tile.mesh.position.y = tile.origY;
        spawnTileDeRezSparks(tile.center.x, tile.center.z);
      }
    } else if (tile.state === config.TILE_FALLEN) {
      // Animate falling downward: y_tile <- y_tile - 25 * dt
      tile.mesh.position.y -= 25 * dt;

      // After falling 15m, set mesh.visible = false
      if (tile.mesh.position.y <= tile.origY - 15) {
        tile.mesh.visible = false;
      }

      // Tile Regeneration after delay
      tile.regenTimer = (tile.regenTimer || 0) + dt;
      if (tile.regenTimer >= config.TILE_REGEN_DELAY) {
        tile.state = config.TILE_REBUILDING;
        tile.mesh.visible = true;
        tile.mesh.position.y = tile.origY - 15;
        tile.slabMesh.material.emissive.setHex(config.CYAN);
        tile.slabMesh.material.emissiveIntensity = 0.5;
        tile.edgeMesh.material.color.setHex(config.CYAN);
        playWarningSound();
      }
    } else if (tile.state === config.TILE_REBUILDING) {
      // Slowly re-compile from bottom upward with glowing hologram outline
      tile.mesh.position.y += 8.0 * dt;
      const holoPulse = 0.5 + 0.5 * Math.sin(state.time * 12);
      tile.slabMesh.material.emissiveIntensity = holoPulse;
      tile.edgeMesh.material.opacity = holoPulse;

      if (tile.mesh.position.y >= tile.origY) {
        tile.mesh.position.y = tile.origY;
        tile.state = config.TILE_INTACT;
        tile.timer = 0;
        tile.regenTimer = 0;
        if (tile.slabMesh.material !== tileMatIntact) {
          tile.slabMesh.material.dispose();
          tile.edgeMesh.material.dispose();
          tile.slabMesh.material = tileMatIntact;
          tile.edgeMesh.material = tileEdgeMatIntact;
        }
        burst(new THREE.Vector3(tile.center.x, 0.1, tile.center.z), config.CYAN, 16, 6);
      }
    }
  }
}

export function getPillarCoverPoint(pillar, playerPos, out) {
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

export function findBestCoverPillar(foePos, playerPos) {
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

export function updateDuelFoe(f, dt) {
  // 1. Vertical Kinematics & Gravity (Gfoe = 30)
  const GRAV_FOE = 30;
  const prevY = f.y;
  const wasGrounded = f.grounded;
  f.vy -= GRAV_FOE * dt;
  f.y += f.vy * dt;

  const foeTile = getTileAt(f.pos.x, f.pos.z);
  const isFoeTileSolid = foeTile && foeTile.state !== config.TILE_FALLEN && foeTile.state !== config.TILE_REBUILDING;

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
  if (!f.hasDisc && !state.discs.some(d => d.owner === f)) {
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
    burst(tmp.copy(f.pos).setY(f.y + 0.3), config.ORANGE, 18, 6);
    shake(0.12);
  }

  // Void Death Threshold
  if (f.y < -18) {
    burst(f.pos.clone().setY(-18), config.ORANGE, 80, 16);
    state.score += 500;
    message('PIT ELIMINATION +500');
    killFoe(f);
    return;
  }

  f.dashCd -= dt;

  const toPx = state.player.pos.x - f.pos.x;
  const toPz = state.player.pos.z - f.pos.z;
  const pDist = Math.hypot(toPx, toPz);
  const see = lineOfSight(f.pos, state.player.pos) && state.player.alive;

  // 2. Threat Awareness & Ricochet Defense (Section 4)
  let deflectThreat = null;
  let deflectDist = Infinity;
  for (let i = 0; i < state.discs.length; i++) {
    const D = state.discs[i];
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
  for (let i = 0; i < state.discs.length; i++) {
    const D = state.discs[i];
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
      burst(tmp.set(f.pos.x, 2.45 + f.y, f.pos.z), config.ORANGE, 4, 3);
      burst(tmp.set(f.pos.x + 0.7, 1.6 + f.y, f.pos.z), config.ORANGE, 3, 2);
      burst(tmp.set(f.pos.x - 0.7, 1.6 + f.y, f.pos.z), config.ORANGE, 3, 2);
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
      if ((f.pos.x + perpX * 4) * Math.sign(f.pos.x) > config.ARENA - 3 || (f.pos.z + perpZ * 4) * Math.sign(f.pos.z) > config.ARENA - 3) {
        perpX = -perpX;
        perpZ = -perpZ;
      }
      f.vel.x += perpX * 32;
      f.vel.z += perpZ * 32;
      f.dashCd = 1.8 + Math.random() * 0.8;
      burst(tmp.copy(f.pos).setY(f.y + 0.4), config.ORANGE, 16, 6);
      shake(0.12);
    } else if (f.grounded && f.jumps === 0) {
      f.vy = 11.5;
      f.grounded = false;
      f.jumps = 1;
      burst(tmp.copy(f.pos).setY(f.y + 0.2), config.ORANGE, 14, 5);
    }
  } else {
    // Normal smooth facing towards player
    const face = Math.atan2(toPx, toPz);
    const turnRate = 8 * dt;
    f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
  }

  // 3. Low Disc Jump Evasion (Section 1)
  if (f.grounded && f.jumps === 0) {
    for (let i = 0; i < state.discs.length; i++) {
      const D = state.discs[i];
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
            burst(tmp.copy(f.pos).setY(f.y + 0.2), config.ORANGE, 14, 5);
            break;
          }
        }
      }
    }
  }

  // 4. Tactical Evasive Dash (Section 2)
  if (!panicDisc && f.dashCd <= 0) {
    let triggerDash = false;
    for (let i = 0; i < state.discs.length; i++) {
      const D = state.discs[i];
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

    if (!triggerDash && see && state.player.hasDisc && (!f.hasDisc || f.hp < f.maxHp * 0.35)) {
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

      if (Math.abs(f.pos.x + evadeX * 5) > config.ARENA - 2) evadeX = -evadeX;
      if (Math.abs(f.pos.z + evadeZ * 5) > config.ARENA - 2) evadeZ = -evadeZ;

      f.vel.x += evadeX * 32;
      f.vel.z += evadeZ * 32;
      f.dashCd = 1.8 + Math.random() * 0.8;
      burst(tmp.copy(f.pos).setY(f.y + 0.4), config.ORANGE, 16, 6);
      shake(0.12);
    }
  }

  // 5. Aerial Throw at Apex (Section 1)
  if (f.aerialThrow && f.hasDisc && f.vy <= 1.0) {
    const leadX = state.player.pos.x + state.player.vel.x * (0.28 * f.skill);
    const leadZ = state.player.pos.z + state.player.vel.z * (0.28 * f.skill);
    _duelLead.set(leadX, 1.7 + state.player.y, leadZ);
    _duelOrigin.copy(f.pos).setY(1.7 + f.y);
    _duelAimDir.copy(_duelLead).sub(_duelOrigin).normalize();
    _duelOrigin.addScaledVector(_duelAimDir, 1.2);

    const curvePower = (Math.random() < 0.6) ? (Math.random() < 0.5 ? 1.0 : -1.0) * (0.8 + Math.random() * 0.4) : 0;
    spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + state.duelTier * 2), f, config.ORANGE, curvePower);

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
      f.coverPillar = findBestCoverPillar(f.pos, state.player.pos);
    }
    getPillarCoverPoint(f.coverPillar, state.player.pos, f.coverTarget);
    const toCoverX = f.coverTarget.x - f.pos.x;
    const toCoverZ = f.coverTarget.z - f.pos.z;
    const coverDist = Math.hypot(toCoverX, toCoverZ);

    if (see) {
      // Trapped in open: weave between pillars
      if (coverDist > 0.2) {
        const dirX = toCoverX / coverDist;
        const dirZ = toCoverZ / coverDist;
        const weave = Math.sin(state.time * 6.0) * 0.45;
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
      const pl = f.coverPillar || findBestCoverPillar(f.pos, state.player.pos);
      const pdx = pl.x - state.player.pos.x;
      const pdz = pl.z - state.player.pos.z;
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
      if (f.cd <= 0 && f.hasDisc && state.player.alive) {
        if (f.grounded && Math.random() < 0.35 && pDist >= 9) {
          // Leap throw
          f.vy = 11.5;
          f.grounded = false;
          f.jumps = 1;
          f.aerialThrow = true;
          burst(tmp.copy(f.pos).setY(f.y + 0.2), config.ORANGE, 14, 5);
        } else {
          // Ground throw with lead and curve bias
          const leadX = state.player.pos.x + state.player.vel.x * (0.28 * f.skill);
          const leadZ = state.player.pos.z + state.player.vel.z * (0.28 * f.skill);
          _duelAimDir.set(leadX - f.pos.x, 0, leadZ - f.pos.z);
          _duelAimDir.x += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.z += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.normalize();

          const curveDir = -f.peekDir;
          const curvePower = (Math.random() < 0.75) ? curveDir * (0.85 + Math.random() * 0.4) : 0;
          _duelOrigin.copy(f.pos).setY(1.7 + f.y).addScaledVector(_duelAimDir, 1.2);

          spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + state.duelTier * 2), f, config.ORANGE, curvePower);

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
  resolveCircle(f.pos, config.FOE_R, f.y);

  // 9. Visual mesh updates
  f.obj.position.copy(f.pos);
  f.obj.position.y = f.y + (f.grounded ? Math.sin(state.time * 11) * 0.05 * Math.min(f.vel.length() / 8, 1) : 0);
  f.obj.rotation.x = THREE.MathUtils.clamp(-f.vy * 0.018, -0.22, 0.22);
  f.obj.userData.backDisc.visible = f.hasDisc;
  if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(state.time * 60) * 0.05; }
}
