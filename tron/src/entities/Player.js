import * as THREE from '../../vendor/three.module.js';
import { state, player } from '../core/state.js';
import { config } from '../core/config.js';
import { scene, camera } from '../graphics/scene.js';
import { resolveCircle } from '../physics/collision.js';
import { burst } from '../graphics/particles.js';
import { playDeRezSound } from '../audio/sfx.js';
import { message, shake, showGameOver } from '../ui/UIManager.js';
import { getTileAt, rebuildArenaTiles, pillars } from './Arena.js';
import { spawnDisc } from './Disc.js';
import { getPlayerCurveIntent } from '../input/keyboard.js';
import { touchMove, updateCurveButtons, updateTouchMomentum } from '../input/touch.js';
import { getRoomRef, roomUpdateDoc } from '../network/firebaseSetup.js';
import { showMultiplayerDefeat } from '../network/roomManager.js';
import { updateHUD } from '../ui/hud.js';

export function updatePlayer(dt) {
  if (!state.player.alive) return;

  updateTouchMomentum(dt);
  const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const wish = new THREE.Vector3();

  if (state.countdownTimer <= 0) {
    if (state.keys.KeyW) wish.add(fwd);
    if (state.keys.KeyS) wish.sub(fwd);
    if (state.keys.KeyD) wish.add(right);
    if (state.keys.KeyA) wish.sub(right);

    if (touchMove.x !== 0 || touchMove.y !== 0) {
      wish.addScaledVector(fwd, -touchMove.y);
      wish.addScaledVector(right, touchMove.x);
    }
  }

  const stickDeflection = Math.hypot(touchMove.x, touchMove.y);
  const hasKeys = state.keys.KeyW || state.keys.KeyS || state.keys.KeyA || state.keys.KeyD;
  if (wish.lengthSq() > 0) wish.normalize();

  const prevY = state.player.y;
  const wasGrounded = state.player.grounded;
  const playerTile = getTileAt(state.player.pos.x, state.player.pos.z);
  const isTileSolid = playerTile && playerTile.state !== config.TILE_FALLEN && playerTile.state !== config.TILE_REBUILDING;

  if (!isTileSolid) {
    if (wasGrounded) {
      state.player.vy = Math.min(state.player.vy, -3.5);
    }
    state.player.grounded = false;
  }

  const inRecoveryZone = state.player.y < 0 && state.player.y > -3.5;
  if (inRecoveryZone && state.player.vy <= 0) {
    message('SURFACE COLLAPSE — JUMP / DASH!');
    state.msgT = Math.max(state.msgT, 0.4);
  }

  // Vertical physics: jump / double-jump / gravity
  const GRAV = 30, JUMP_V = 11.5;
  if ((state.keys.Space || state.touchJumpHeld) && !state.player.jumpHeld) state.player.jumpBuf = 0.15;
  state.player.jumpBuf = Math.max(0, (state.player.jumpBuf || 0) - dt);
  state.player.coyote = state.player.grounded ? 0.12 : Math.max(0, (state.player.coyote || 0) - dt);
  const canJump = state.player.jumps < 2 || state.player.coyote > 0;
  if (state.player.jumpBuf > 0 && canJump && state.player.jumps < 2) {
    state.player.jumpBuf = 0;
    if (inRecoveryZone) {
      state.player.vy = 12.0;
      message('RECOVERY JUMP');
    } else {
      state.player.vy = state.player.jumps === 0 ? JUMP_V : JUMP_V * 0.88;
      if (state.player.jumps === 1) message('AIR JUMP');
    }
    state.player.jumps++;
    state.player.grounded = false;
    burst(state.player.pos.clone().setY(state.player.y + .2), config.CYAN, state.player.jumps === 1 ? 12 : 18, 5);
    shake(.08);
  }
  state.player.jumpHeld = !!state.keys.Space || state.touchJumpHeld;
  if ((state.keys.Space || state.touchJumpHeld) && state.player.vy > 0) state.player.vy -= GRAV * 0.55 * dt;
  else state.player.vy -= GRAV * dt;
  state.player.y += state.player.vy * dt;

  if (isTileSolid) {
    if (state.player.y <= 0 && prevY >= -0.15) {
      if (!state.player.grounded && state.player.vy < -6) {
        burst(state.player.pos.clone().setY(.15), config.CYAN, 10, 4);
        shake(.07);
      }
      state.player.y = 0;
      state.player.vy = 0;
      state.player.grounded = true;
      state.player.jumps = 0;
    } else if (state.player.y < -0.15) {
      state.player.grounded = false;
    }
  } else {
    state.player.grounded = false;
  }

  // Void Death Threshold
  if (state.player.y < -18 && state.player.alive) {
    state.gameOverReason = 'FALLEN INTO THE VOID';
    playDeRezSound();
    shake(0.6);
    damagePlayer(999);
  }

  let speed = (state.player.blocking || state.touchBlocking) ? 5.5 : 12;
  if (!hasKeys && stickDeflection > 0) {
    speed *= Math.min(1, Math.max(0.3, stickDeflection));
  }
  if (!state.player.grounded) speed *= 0.82;
  state.player.dashCd -= dt;
  const isDashTriggered = (state.keys.ShiftLeft || state.keys.ShiftRight || state.touchDashRequested);
  if (isDashTriggered && state.player.energy > 25 && state.player.dashCd <= 0) {
    let dashDir = wish.clone();
    if (dashDir.lengthSq() < 1e-4) dashDir.copy(fwd);
    else dashDir.normalize();
    const dashImpulse = inRecoveryZone ? 38 : 34;
    state.player.vel.add(dashDir.multiplyScalar(dashImpulse));
    if (inRecoveryZone && state.player.vy < 0) {
      state.player.vy = Math.max(state.player.vy, 4.0);
    }
    state.player.energy -= 25;
    state.player.dashCd = .45;
    shake(.18);
    burst(state.player.pos.clone().setY(state.player.y + .4), config.CYAN, 14, 5);
    if (inRecoveryZone) message('RECOVERY DASH');
  }
  state.touchDashRequested = false;
  state.player.energy = Math.min(100, state.player.energy + dt * 14);

  const target = wish.multiplyScalar(speed);
  const inVoid = !isTileSolid && state.player.y < 0;
  const lerpRate = inVoid
    ? (wish.lengthSq() > 0 ? (1 - Math.pow(0.5, dt)) : 0)
    : (state.player.grounded ? (1 - Math.pow(0.0009, dt)) : (1 - Math.pow(0.005, dt)));
  state.player.vel.lerp(target, lerpRate);
  state.player.pos.addScaledVector(state.player.vel, dt);
  resolveCircle(state.player.pos, config.PLAYER_R, state.player.y);

  if (state.player.obj) {
    state.player.obj.position.copy(state.player.pos);
    state.player.obj.rotation.y = state.player.yaw;
    state.player.obj.position.y = state.player.y + (state.player.grounded ? Math.sin(state.time * 11) * .05 * Math.min(state.player.vel.length() / 8, 1) : 0);
    state.player.obj.rotation.x = THREE.MathUtils.clamp(-state.player.vy * 0.018, -.22, .22);
    if (state.player.obj.userData && state.player.obj.userData.backDisc) {
      state.player.obj.userData.backDisc.visible = state.player.hasDisc;
      state.player.obj.userData.backDisc.rotation.z += dt * (state.player.hasDisc ? 3 : 0);
      if (state.player.blocking && state.player.hasDisc) {
        state.player.obj.userData.backDisc.position.set(0, 1.75, .75);
        state.player.obj.userData.backDisc.rotation.x = 0;
      } else {
        state.player.obj.userData.backDisc.position.set(0, 1.8, -.45);
        state.player.obj.userData.backDisc.rotation.x = Math.PI / 2;
      }
    }
  }
}

export function throwDisc() {
  if (state.countdownTimer > 0) return;
  if (!state.player.hasDisc || !state.player.alive) return;
  state.player.hasDisc = false;
  if (state.player.obj && state.player.obj.userData && state.player.obj.userData.backDisc) {
    state.player.obj.userData.backDisc.visible = false;
  }
  const aim = aimTarget();
  const chest = state.player.pos.clone().add(new THREE.Vector3(0, 1.7 + state.player.y, 0));
  const dir = aim.point.clone().sub(chest).normalize();
  const origin = chest.clone().add(dir.clone().multiplyScalar(1.1));
  const curve = getPlayerCurveIntent();
  const vel = dir.clone().multiplyScalar(38);
  spawnDisc(origin, vel, 'player', config.CYAN, curve);
  if (typeof window !== 'undefined') {
    window.__lastThrowDot = dir.clone().normalize().dot(aim.point.clone().sub(origin).normalize());
  }
  shake(0.12);
  if (state.touchCurveL || state.touchCurveR) {
    state.touchCurveL = false;
    state.touchCurveR = false;
    updateCurveButtons();
  }

  // Network sync throw for multiplayer
  if ((state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.db && state.currentRoomId && state.currentUser) {
    const roomRef = getRoomRef(state.currentRoomId);
    roomUpdateDoc(roomRef, {
      lastThrow: {
        id: Math.random().toString(36).substring(2, 9),
        sender: state.playerRole,
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

if (typeof window !== 'undefined') {
  window.__tronThrowDisc = throwDisc;
}

export const _ro = new THREE.Vector3(), _rd = new THREE.Vector3();

export function aimTarget() {
  _ro.copy(camera.position);
  camera.getWorldDirection(_rd);
  let best = 400, hitFoe = null;

  if (_rd.y < -0.001) {
    const t = -_ro.y / _rd.y;
    if (t > 0.5 && t < best) { best = t; hitFoe = null; }
  }
  const lim = config.ARENA - 1.5;
  for (const [axis, sign] of [['x',1],['x',-1],['z',1],['z',-1]]) {
    const denom = _rd[axis];
    if (Math.abs(denom) < 1e-4) continue;
    const t = (sign * lim - _ro[axis]) / denom;
    if (t > 0.5 && t < best) { best = t; hitFoe = null; }
  }
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
  const aimFoes = state.foes;
  for (const f of aimFoes) {
    const cx = f.pos.x - _ro.x, cy = (1.5 + (f.y || 0)) - _ro.y, cz = f.pos.z - _ro.z;
    const proj = cx * _rd.x + cy * _rd.y + cz * _rd.z;
    if (proj < 0.5) continue;
    const d2 = (cx * cx + cy * cy + cz * cz) - proj * proj;
    const R = config.FOE_R + 0.5;
    if (d2 > R * R) continue;
    const t = proj - Math.sqrt(R * R - d2);
    if (t > 0.5 && t < best) { best = t; hitFoe = f; }
  }
  return { point: _ro.clone().addScaledVector(_rd, Math.min(best, 400)), foe: hitFoe, dist: best };
}

export function aimDir() {
  return new THREE.Vector3(
    -Math.sin(state.player.yaw) * Math.cos(state.player.pitch),
    Math.sin(state.player.pitch),
    -Math.cos(state.player.yaw) * Math.cos(state.player.pitch)
  ).normalize();
}

export function damagePlayer(amount, from) {
  if (state.countdownTimer > 0) return;
  if (!state.player.alive) return;
  state.player.hp -= amount;
  state.player.hurtFlash = 1;
  burst(state.player.pos.clone().setY(state.player.y + 1.6), config.CYAN, 18, 8);
  shake(0.35);

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.player.alive = false;
    state.running = false;
    state.gameOverT = 0;
    burst(state.player.pos.clone().setY(state.player.y + 1.4), config.CYAN, 90, 16);
    if (state.player.obj) state.player.obj.visible = false;

    if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
      if (state.db && state.currentRoomId && state.currentUser) {
        const roomRef = getRoomRef(state.currentRoomId);
        const myState = {
          x: +state.player.pos.x.toFixed(2),
          y: +state.player.y.toFixed(2),
          z: +state.player.pos.z.toFixed(2),
          yaw: +state.player.yaw.toFixed(2),
          pitch: +state.player.pitch.toFixed(2),
          hp: 0,
          blocking: false,
          hasDisc: state.player.hasDisc
        };
        const payload = {};
        payload[`state.${state.playerRole}`] = myState;
        
        let allTeammatesDead = true;
        for (const t of state.teammates) {
          if (t.hp > 0) allTeammatesDead = false;
        }

        if (allTeammatesDead) {
          payload.status = 'finished';
          const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
          payload.winnerTeam = myTeam === 1 ? 2 : 1;
          if (state.gameMode === 'duel_multi') {
            payload.winner = state.playerRole === 'p1' ? 'p2' : 'p1';
          }
        }
        roomUpdateDoc(roomRef, payload).catch(err => console.warn("Game over sync err:", err));
      }
      if (state.gameMode !== 'duos_multi' || state.teammates.every(t => t.hp <= 0)) {
        setTimeout(showMultiplayerDefeat, 900);
      }
    } else {
      setTimeout(showGameOver, 900);
    }
  }
}

export function resetRound(spawnX = 0, spawnZ = 14, yaw = Math.PI) {
  state.player.hp = 100;
  state.player.energy = 100;
  state.player.hasDisc = true;
  state.player.alive = true;
  state.player.blocking = false;
  if (state.player.obj) {
    state.player.obj.visible = true;
    if (state.player.obj.userData && state.player.obj.userData.backDisc) {
      state.player.obj.userData.backDisc.visible = true;
    }
  }

  state.player.pos.set(spawnX, 0, spawnZ);
  state.player.vel.set(0, 0, 0);
  state.player.yaw = yaw;
  state.player.pitch = -0.12;
  state.player.y = 0;
  state.player.vy = 0;
  state.player.grounded = true;
  state.player.jumps = 0;
  state.lookMomentumX = 0;
  state.lookMomentumY = 0;
  if (state.player.obj) {
    state.player.obj.position.copy(state.player.pos);
    state.player.obj.rotation.y = state.player.yaw;
  }

  rebuildArenaTiles();

  for (const d of state.discs) scene.remove(d.obj);
  state.discs = [];
  for (const f of state.foes) scene.remove(f.obj);
  state.foes = [];

  if (typeof window !== 'undefined' && window.__tronStartCountdown) {
    window.__tronStartCountdown(3.0);
  }
}

export function resetGame() {
  state.score = 0;
  state.gameOverT = 0;
  state.running = true;
  state.spawnTimer = 0;
  state.gameOverReason = '';

  if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
    state.tier = 1;
    state.duelTier = 1;
    resetRound(0, 14, Math.PI);
    state.onCountdownEnd = () => {
      if (typeof window !== 'undefined' && window.__tronSpawnDuelBoss) {
        window.__tronSpawnDuelBoss(state.tier || state.duelTier || 1);
      }
    };
  } else if (state.gameMode === 'swarm') {
    state.wave = 1;
    resetRound(0, 14, Math.PI);
    state.onCountdownEnd = () => {
      if (typeof window !== 'undefined' && window.__tronSpawnWave) {
        window.__tronSpawnWave();
      }
    };
  } else {
    resetRound(0, 14, Math.PI);
  }
  updateHUD();
}

if (typeof window !== 'undefined') {
  window.__tronResetGame = resetGame;
  window.__tronResetRound = resetRound;
}
