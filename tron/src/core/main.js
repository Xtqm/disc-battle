import * as THREE from '../../vendor/three.module.js';
import { state, player, touchState } from './state.js';
import { config } from './config.js';
import { renderer, scene, camera, grid, ring, floor, initGraphics, updateCamera } from '../graphics/scene.js';
import { updateSparks } from '../graphics/particles.js';
import { tiles, getTileAt, worldToTile, tileToWorld, triggerTileWarning, updateTiles, rebuildArenaTiles } from '../entities/Arena.js';
import { updatePlayer, throwDisc, aimTarget, aimDir } from '../entities/Player.js';
import { updateFoes, spawnDuelBoss, spawnWave, killFoe } from '../entities/Bot.js';
import { updateDiscs, spawnDisc } from '../entities/Disc.js';
import { simulatePath, trajLine, updateThreatPaths, updateTrajectory } from '../physics/trajectory.js';
import { InputManager, initInput, isLocked, getPlayerCurveIntent, sens, touchMove, updateCurveButtons } from '../input/InputManager.js';
import { initNetwork, initMockNetwork, getRoomRef, roomGetDoc } from '../network/firebaseSetup.js';
import { onClickCreateRoom, onClickConfirmJoin, copyRoomCode, teardownMultiplayer, startMultiplayerDuel } from '../network/roomManager.js';
import { syncNetworkState, onTileDestabilizedByHost, updateRemotePlayers } from '../network/sync.js';
import { updateHUD, message, msgEl, updateCrosshair, updateKeyMonitor, updateLockStateBanner } from '../ui/hud.js';
import { startMode, showModeSelect, bindMenuButtons } from '../ui/menus.js';
import { pauseGame, resumeGame, restartMatch, checkOrientation, requestFullScreen, exitFullScreen, toggleFullScreen, isFullScreen } from '../ui/modals.js';
import { SFX, playDeRezSound } from '../audio/sfx.js';

export const clock = new THREE.Clock();
state.time = 0;

export function startCountdown(duration = 3.0, onComplete = null) {
  state.countdownTimer = duration;
  state.lastCountdownSec = Math.ceil(duration);
  if (onComplete) state.onCountdownEnd = onComplete;
  state.fightDisplayTimer = 0;

  const cdEl = document.getElementById('countdownText');
  if (cdEl) {
    cdEl.style.display = 'block';
    cdEl.style.opacity = '1';
    cdEl.textContent = Math.max(1, Math.ceil(duration)).toString();
    cdEl.style.color = '#fff';
    cdEl.style.textShadow = '0 0 20px var(--cyan), 0 0 40px var(--cyan), 0 0 80px var(--cyan)';
    cdEl.style.transform = 'translate(-50%, -50%) scale(1.15)';
    setTimeout(() => { if (cdEl) cdEl.style.transform = 'translate(-50%, -50%) scale(1.0)'; }, 80);
  }
  if (duration > 0) {
    SFX.countdownTick();
  }
}

if (typeof window !== 'undefined') {
  window.__tronStartCountdown = startCountdown;
}

export function update(dt) {
  state.time += dt;

  // Countdown & Freeze logic
  if (state.countdownTimer > 0) {
    const prevSec = Math.ceil(state.countdownTimer);
    state.countdownTimer -= dt;
    const curSec = Math.ceil(state.countdownTimer);

    state.player.vel.set(0, 0, 0);
    state.player.jumpBuf = 0;
    state.touchDashRequested = false;

    for (const f of state.foes) {
      if (f.vel) f.vel.set(0, 0, 0);
      f.vy = 0;
    }

    const cdEl = document.getElementById('countdownText');
    if (state.countdownTimer > 0) {
      if (curSec !== prevSec && curSec >= 1) {
        SFX.countdownTick();
        if (cdEl) {
          cdEl.style.display = 'block';
          cdEl.textContent = curSec.toString();
          cdEl.style.opacity = '1';
          cdEl.style.color = '#fff';
          cdEl.style.textShadow = '0 0 20px var(--cyan), 0 0 40px var(--cyan), 0 0 80px var(--cyan)';
          cdEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
          setTimeout(() => { if (cdEl) cdEl.style.transform = 'translate(-50%, -50%) scale(1.0)'; }, 80);
        }
      }
    } else {
      state.countdownTimer = 0;
      state.fightDisplayTimer = 0.8;
      SFX.fight();
      if (cdEl) {
        cdEl.style.display = 'block';
        cdEl.textContent = 'FIGHT!';
        cdEl.style.opacity = '1';
        cdEl.style.color = '#fff';
        cdEl.style.textShadow = '0 0 30px var(--orange), 0 0 60px var(--orange), 0 0 90px var(--orange)';
        cdEl.style.transform = 'translate(-50%, -50%) scale(1.35)';
        setTimeout(() => { if (cdEl) cdEl.style.transform = 'translate(-50%, -50%) scale(1.0)'; }, 100);
      }

      if (state.onCountdownEnd) {
        const cb = state.onCountdownEnd;
        state.onCountdownEnd = null;
        cb();
      } else {
        if (state.gameMode === 'duel_ai' || state.gameMode === 'duel') {
          spawnDuelBoss(state.tier || state.duelTier || 1);
        } else if (state.gameMode === 'swarm') {
          spawnWave();
        }
      }
    }
  } else if (state.fightDisplayTimer > 0) {
    state.fightDisplayTimer -= dt;
    const cdEl = document.getElementById('countdownText');
    if (cdEl) {
      if (state.fightDisplayTimer <= 0) {
        cdEl.style.display = 'none';
        cdEl.style.opacity = '0';
      } else if (state.fightDisplayTimer < 0.3) {
        cdEl.style.opacity = (state.fightDisplayTimer / 0.3).toString();
      }
    }
  }

  // Subsystem updates
  updateTiles(dt);
  syncNetworkState(dt);
  updatePlayer(dt);
  updateRemotePlayers(dt);
  updateFoes(dt);
  updateDiscs(dt);

  // Rematch / Wave spawn timer
  if (state.spawnTimer > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
        message('TIER ' + (state.tier || state.duelTier) + ' — FIGHT!');
        spawnDuelBoss(state.tier || state.duelTier);
      } else {
        spawnWave();
      }
    }
  }

  updateSparks(dt, scene);
  updateCamera(dt);

  // Analog steering when cursor unlocked (desktop)
  if (!isLocked() && state.steerX && !state.isTouchDevice) {
    const RATE = 3.1;
    state.player.yaw -= state.steerX * RATE * dt;
    if (state.player.yaw > Math.PI) state.player.yaw -= Math.PI * 2;
    if (state.player.yaw < -Math.PI) state.player.yaw += Math.PI * 2;
  }

  updateKeyMonitor();
  updateLockStateBanner();

  // Crosshair + Trajectory preview
  const aim = aimTarget();
  const traj = updateTrajectory(aim, dt);
  updateThreatPaths();
  updateCrosshair(aim, traj);

  // Grid and ring decorative pulse
  grid.material.opacity = .72 + Math.sin(state.time * 1.6) * .1 + state.player.hurtFlash * .3;
  const cTile = getTileAt(0, 0);
  ring.visible = !cTile || cTile.state !== config.TILE_FALLEN;
  ring.material.opacity = .35 + Math.sin(state.time * 2.2) * .15;

  updateHUD();
  if (state.msgT > 0) {
    state.msgT -= dt;
    if (state.msgT <= 0 && msgEl) msgEl.style.opacity = 0;
  }
}

export function loop() {
  requestAnimationFrame(loop);
  let dt = clock.getDelta();
  if (state.justResumed) {
    dt = 0;
    state.justResumed = false;
  }
  dt = Math.min(dt, 0.05);

  if (state.running && !state.paused) {
    update(dt);
  } else if (!state.running) {
    state.time += dt;
    camera.position.set(Math.sin(state.time * .12) * 34, 14, Math.cos(state.time * .12) * 34);
    camera.lookAt(0, 2, 0);
    updateSparks(dt, scene);
  }
  renderer.render(scene, camera);
}

export const animate = loop;

export function initApp() {
  try {
    initGraphics();
    const canvasEl = renderer?.domElement || document.querySelector('canvas');
    initInput(canvasEl);
    bindMenuButtons();

    if (state.isTouchDevice && typeof document !== 'undefined' && document.body) {
      document.body.classList.add('touch-device');
      checkOrientation();
    }

    requestAnimationFrame(animate);
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// Debug hooks for headless puppeteer test harness
window.__dbg = {
  running: () => state.running,
  paused: () => state.paused,
  mode: () => state.gameMode,
  tier: () => state.tier || state.duelTier,
  duelTier: () => state.tier || state.duelTier,
  countdownTimer: () => +state.countdownTimer.toFixed(2),
  startCountdown: (d, cb) => startCountdown(d, cb),
  finishCountdown: () => {
    state.countdownTimer = 0;
    if (state.onCountdownEnd) {
      const cb = state.onCountdownEnd;
      state.onCountdownEnd = null;
      cb();
    } else if (state.gameMode === 'duel_ai' || state.gameMode === 'duel') {
      spawnDuelBoss(state.tier || state.duelTier || 1);
    } else if (state.gameMode === 'swarm') {
      spawnWave();
    }
  },
  pauseGame: () => pauseGame(),
  resumeGame: () => resumeGame(),
  restartMatch: () => restartMatch(),
  startMode: (m) => startMode(m),
  showModeSelect: () => showModeSelect(),
  killBoss: () => { if (state.foes.length > 0) killFoe(state.foes[0]); },
  spawnTimer: () => +state.spawnTimer.toFixed(2),
  pos: () => ({ x: +state.player.pos.x.toFixed(2), z: +state.player.pos.z.toFixed(2) }),
  y: () => +state.player.y.toFixed(2),
  foes: () => state.foes.length,
  gridInfo: () => ({
    visible: grid.visible,
    y: grid.position.y,
    op: +grid.material.opacity.toFixed(2),
    renderOrder: grid.renderOrder,
    camY: +camera.position.y.toFixed(2),
    fog: [scene.fog.near, scene.fog.far],
    floorVisible: floor.visible
  }),
  setYaw: v => { state.player.yaw = v; },
  grounded: () => state.player.grounded,
  jumps: () => state.player.jumps,
  curve: () => getPlayerCurveIntent(),
  traj: () => {
    const a = aimTarget();
    const chest = state.player.pos.clone().setY(1.7 + state.player.y);
    const dir = a.point.clone().sub(chest).normalize();
    const origin = chest.clone().addScaledVector(dir, 1.1);
    const sim = simulatePath(origin, dir.clone().multiplyScalar(38), 3, 1.5, 1 / 90, getPlayerCurveIntent());
    return {
      points: sim.pts.length,
      bounces: sim.bounceAt.length,
      hitsFoe: !!sim.hitFoe,
      lineVisible: trajLine.visible,
      drawn: trajLine.geometry.drawRange.count
    };
  },
  yaw: () => +state.player.yaw.toFixed(3),
  pitch: () => +state.player.pitch.toFixed(3),
  aim: () => { const a = aimTarget(); return { dist: +a.dist.toFixed(1), foe: !!a.foe }; },
  discAlign: () => {
    const d = state.discs.find(x => x.owner === 'player');
    if (!d) return null;
    const toTarget = aimTarget().point.clone().sub(state.player.pos.clone().setY(1.7 + state.player.y));
    if (toTarget.lengthSq() < 1e-6 || d.vel.lengthSq() < 1e-6) return 0;
    const val = d.vel.clone().normalize().dot(toTarget.normalize());
    return isNaN(val) ? 0 : +val.toFixed(3);
  },
  discCurve: () => {
    const d = state.discs.find(x => x.owner === 'player');
    return d ? +(d.curve || 0).toFixed(3) : null;
  },
  discs: () => state.discs.map(d => ({
    pos: { x: +d.pos.x.toFixed(2), y: +d.pos.y.toFixed(2), z: +d.pos.z.toFixed(2) },
    vel: { x: +d.vel.x.toFixed(2), y: +d.vel.y.toFixed(2), z: +d.vel.z.toFixed(2) },
    bounces: d.bounces,
    returning: d.returning,
    isDeflected: !!d.isDeflected,
    owner: d.owner === 'player' ? 'player' : 'foe'
  })),
  lastMessage: () => (msgEl ? msgEl.textContent : ''),
  score: () => state.score,
  simulatePath: (origin, vel, maxBounces, tMax, step, curve) => simulatePath(origin, vel, maxBounces, tMax, step, curve),
  throwDisc: () => throwDisc(),
  foesList: () => state.foes.map(f => ({
    pos: { x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2) },
    hp: f.hp,
    hasDisc: f.hasDisc,
    rotY: +f.obj.rotation.y.toFixed(3)
  })),
  duelBoss: () => {
    const b = state.foes.find(f => f.isBoss);
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
    let b = state.foes.find(f => f.isBoss) || state.foes[0];
    if (!b) {
      spawnDuelBoss(state.tier || state.duelTier || 1);
      b = state.foes[0];
    }
    if (!b) return null;
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z + offsetZ);
    spawnDisc(p, new THREE.Vector3(0, 0, -32), 'player', config.CYAN, 0);
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  },
  spawnDeflectedTestDisc: (offsetZ = 6) => {
    let b = state.foes.find(f => f.isBoss) || state.foes[0];
    if (!b) {
      spawnDuelBoss(state.tier || state.duelTier || 1);
      b = state.foes[0];
    }
    if (!b) return null;
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z + offsetZ);
    const d = spawnDisc(p, new THREE.Vector3(0, 0, -36), 'player', config.WHITE, 0);
    d.isDeflected = true;
    d.originalOwner = b;
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  },
  spawnEnemyHitDisc: () => {
    let b = state.foes.find(f => f.isBoss) || state.foes[0];
    if (!b) {
      spawnDuelBoss(state.tier || state.duelTier || 1);
      b = state.foes[0];
    }
    if (!b) return null;
    b.hasDisc = false;
    const p = new THREE.Vector3(state.player.pos.x, 1.5, state.player.pos.z - 3);
    const d = spawnDisc(p, new THREE.Vector3(0, 0, 24), b, config.ORANGE, 0);
    return d;
  },
  spawnParryTestDisc: (dist = 2.0) => {
    let b = ((state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.foes[0]) ? state.foes[0] : (state.foes.find(f => f.isBoss) || state.foes[0]);
    if (!b) {
      spawnDuelBoss(state.tier || state.duelTier || 1);
      b = state.foes[0];
    }
    if (!b) return null;
    b.hasDisc = false;
    const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw)).normalize();
    const p = state.player.pos.clone().addScaledVector(fwd, dist).setY(1.5);
    spawnDisc(p, fwd.clone().multiplyScalar(-24), b, config.ORANGE, 0);
    return {
      pos: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) },
      speed: 24
    };
  },
  spawnDeflectedMissDisc: () => {
    state.spawnTimer = 0;
    let b = state.foes.find(f => f.isBoss) || state.foes[0];
    if (!b) {
      spawnDuelBoss(state.duelTier);
      b = state.foes[0];
    }
    const p = new THREE.Vector3(0, 1.5, 0);
    const d = spawnDisc(p, new THREE.Vector3(34, 0, 0), 'player', config.WHITE, 0);
    d.isDeflected = true;
    d.originalOwner = b;
    return d;
  },
  triggerRearDisc: () => {
    const b = state.foes.find(f => f.isBoss);
    if (!b) return null;
    const fwdZ = Math.cos(b.obj.rotation.y);
    const p = new THREE.Vector3(b.pos.x, 1.7, b.pos.z - 8.0 * (fwdZ >= 0 ? 1 : -1));
    const d = spawnDisc(p, new THREE.Vector3(0, 0, (fwdZ >= 0 ? 30 : -30)), 'player', config.CYAN, 0);
    d.bounces = 1;
    return true;
  },
  tiles: () => tiles,
  TILE_N: config.TILE_N,
  TILE_W: config.TILE_W,
  getTileAt: (x, z) => getTileAt(x, z),
  worldToTile: (x, z) => worldToTile(x, z),
  tileToWorld: (ix, iz) => tileToWorld(ix, iz),
  dropTileAt: (x, z) => {
    const t = getTileAt(x, z);
    if (!t) return false;
    t.state = config.TILE_FALLEN;
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
    rebuildArenaTiles();
    return true;
  },
  fallenTilesCount: () => Array.from(tiles.values()).filter(t => t.state === config.TILE_FALLEN).length,
  isPlayerInRecoveryZone: () => state.player.y < 0 && state.player.y > -3.5,
  playerY: () => +state.player.y.toFixed(2),
  playerGrounded: () => state.player.grounded,
  playerJumps: () => state.player.jumps,
  playerHasDisc: () => state.player.hasDisc,
  setPlayerBlocking: (b) => { state.player.blocking = b; },
  setPlayerPos: (x, z, y = 0) => {
    state.player.pos.x = x;
    state.player.pos.z = z;
    state.player.y = y;
    if (state.countdownTimer > 0) state.countdownTimer = 0;
    if (!state.player.alive || state.player.hp <= 0) {
      state.player.alive = true;
      state.player.hp = 100;
    }
  },
  step: (dt = 0.016) => update(dt),
  derezAudioHook: playDeRezSound,
  isTouchDevice: () => state.isTouchDevice,
  setTouchDevice: (val) => {
    state.isTouchDevice = !!val;
    if (state.isTouchDevice) document.body.classList.add('touch-device');
    else document.body.classList.remove('touch-device');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isTouchDevice ? 1.5 : 2));
    checkOrientation();
  },
  sens: () => sens,
  setSens: (v) => { state.sens = v; },
  touchMove: () => ({ x: touchMove.x, y: touchMove.y }),
  touchState: () => ({
    moveTouchId: state.moveTouchId,
    lookTouchId: state.lookTouchId,
    moveId: touchState.moveId,
    lookId: touchState.lookId,
    lastLookX: touchState.lastLookX,
    lastLookY: touchState.lastLookY,
    lookMomentumX: touchState.lookMomentumX,
    lookMomentumY: touchState.lookMomentumY,
    touchJumpHeld: state.touchJumpHeld,
    touchDashRequested: state.touchDashRequested,
    touchBlocking: state.touchBlocking,
    touchCurveL: state.touchCurveL,
    touchCurveR: state.touchCurveR
  }),
  setTouchMove: (x, y) => { touchMove.x = x; touchMove.y = y; },
  triggerTouchJump: (held = false) => {
    state.touchJumpHeld = held;
    state.player.jumpBuf = 0.15;
  },
  triggerTouchDash: () => { state.touchDashRequested = true; },
  setTouchCurve: (l, r) => {
    state.touchCurveL = !!l;
    state.touchCurveR = !!r;
    updateCurveButtons();
  },
  checkOrientation: () => checkOrientation(),
  particleBurstCount: (n = 22) => state.isTouchDevice ? Math.max(1, Math.round(n * 0.5)) : n,
  initNetwork: () => initNetwork(),
  createRoom: () => onClickCreateRoom(),
  joinRoom: (code) => {
    const inp = document.getElementById('joinRoomInput');
    if (inp) inp.value = code;
    return onClickConfirmJoin();
  },
  currentRoomId: () => state.currentRoomId,
  playerRole: () => state.playerRole,
  duelOpponent: () => (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.foes[0] ? {
    pos: { x: +state.foes[0].pos.x.toFixed(2), z: +state.foes[0].pos.z.toFixed(2) },
    y: +state.foes[0].y.toFixed(2),
    hp: state.foes[0].hp,
    hasDisc: state.foes[0].hasDisc,
    blocking: state.foes[0].blocking,
    targetPos: { x: +state.foes[0].targetPos.x.toFixed(2), z: +state.foes[0].targetPos.z.toFixed(2) }
  } : null,
  copyRoomCode: (code) => copyRoomCode(code),
  teardownMultiplayer: () => teardownMultiplayer(),
  startMultiplayerDuel: (role, code) => startMultiplayerDuel(role, code),
  syncNetworkState: (dt) => syncNetworkState(dt),
  enableMockNetwork: () => initMockNetwork(),
  onTileDestabilizedByHost: (ix, iz) => onTileDestabilizedByHost(ix, iz),
  getRoomData: async (code) => {
    const roomRef = getRoomRef(code || state.currentRoomId);
    const snap = await roomGetDoc(roomRef);
    return snap.exists() ? snap.data() : null;
  },
  requestFullScreen: () => requestFullScreen(),
  exitFullScreen: () => exitFullScreen(),
  toggleFullScreen: () => toggleFullScreen(),
  isFullScreen: () => isFullScreen()
};

window.__TRON__ = window.__dbg;

export { requestFullScreen, toggleFullScreen, isFullScreen, exitFullScreen };
