import * as THREE from './vendor/three.module.js';
import { state, player } from './state.js';
import { config } from './config.js';
import { renderer, scene, camera, checkOrientation, key, d, floor, grid, ring, tiles, tileGeo, tileEdgeGeo, tileMatIntact, tileEdgeMatIntact, tileGroup, worldToTile, tileToWorld, getTileAt, findNearestIntactTile, wallMat, glowMat, pillars, pillarSpots, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY, _duelToP, _duelSide, _duelWant, _duelSafe, _duelCoverDir, _duelLead, _duelAimDir, _duelOrigin, _duelEvade, makeProgram, discGeo, makeDisc, sparks, burst, triggerTileWarning, spawnTileDeRezSparks, updateTiles, getPillarCoverPoint, findBestCoverPillar, updateDuelFoe } from './graphics.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { mockStore, mockListeners, initMockNetwork, mockDocRef, mockSetDoc, mockGetDoc, mockUpdateDoc, mockOnSnapshot, initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot, generateRoomCode, copyRoomCode, showHostWaitingModal, showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, startMultiplayerDuel, onRoomSnapshot, syncNetworkState, onTileDestabilizedByHost, renderGameOverActions, bindGameOverActions, showMultiplayerVictory, showMultiplayerDefeat, teardownMultiplayer } from './network.js';
import { EAT, getPlayerCurveIntent, codeOf, onDown, onUp, canvas, overlay, startMode, startGame, pauseGame, resumeGame, restartMatch, showModeSelect, getMainMenuHtml, showModeSelectMenu, bindMainMenuEvents, pauseBtn, onPauseClick, resumeBtn, onResumeClick, restartBtn, onRestartClick, modeSelectBtn, onModeSelectClick, btnCopyCode, btnConfirmJoin, btnCancelRoom, joinRoomInput, tryLock, setCursor, focusGame, isLocked, look, showSens, moveStartPos, touchMove, lookLastPos, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, onTouchStart, onTouchMove, onTouchEnd, bindMobileButtons } from './input.js';
import { el, msgEl, message, showGameOver, shake } from './ui.js';
import { clock, update, loop } from './main.js';

export function updateHUD() {
  const hpb = el('hpbar');
  if (hpb && hpb.firstElementChild) hpb.firstElementChild.style.width = state.player.hp + '%';
  state.db = el('discbar');
  if (state.db && state.db.firstElementChild) state.db.firstElementChild.style.width = (state.player.hasDisc ? 100 : 0) + '%';
  const eb = el('energybar');
  if (eb && eb.firstElementChild) eb.firstElementChild.style.width = state.player.energy + '%';

  if (state.gameMode === 'duel') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `DUEL TIER <span id="wave" class="big">${duelTier}</span>`;
    const boss = state.foes[0];
    const hpPct = boss ? Math.max(0, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVAL INTEGRITY <span id="rivalHp">${hpPct}%</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = hpPct + '%';
  } else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `ROOM <span id="wave" class="big">${currentRoomId || '----'}</span>`;
    let oppHp = 0;
    for (const f of state.foes) {
      if (f.alive) oppHp += Math.max(0, Math.ceil(f.hp));
    }
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `RIVALS HP <span id="foes">${oppHp}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'block';
    const bb = el('bossbar');
    const maxHp = (state.gameMode === 'duos_multi' ? 200 : 100);
    if (bb && bb.firstElementChild) bb.firstElementChild.style.width = (oppHp / maxHp * 100) + '%';
  } else {
    const rl = el('roundLabel');
    if (rl) rl.innerHTML = `CYCLE <span id="wave" class="big">${wave}</span>`;
    const sl = el('subLabel');
    if (sl) sl.innerHTML = `HOSTILES <span id="foes">${foes.length}</span>`;
    const bbw = el('bossBarWrap');
    if (bbw) bbw.style.display = 'none';
  }

  const sc = el('score');
  if (sc) sc.textContent = state.score;
}

export function resetGame() {
  for (const f of state.foes) scene.remove(f.obj);
  for (const d of state.discs) scene.remove(d.obj);
  state.foes = []; state.discs = [];
  state.player.pos.set(0, 0, 14); state.player.vel.set(0, 0, 0);
  state.player.y = 0; state.player.vy = 0; state.player.grounded = true; state.player.jumps = 0;
  state.player.hp = 100; state.player.energy = 100; state.player.hasDisc = true; state.player.alive = true;
  state.player.yaw = Math.PI; state.player.pitch = -.12;
  state.score = 0; state.gameOverT = 0; state.running = true;
  state.spawnTimer = 0;
  state.gameOverReason = '';

  for (const tile of tiles.values()) {
    tile.state = config.TILE_INTACT;
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

  if (state.gameMode === 'duel') {
    state.duelTier = 1;
    spawnDuelBoss(state.duelTier);
    message('DUEL TIER 1 — FIGHT');
  } else {
    state.wave = 1;
    spawnWave();
    message('CYCLE 1 — FIGHT');
  }
  updateHUD();
}

export function spawnDuelBoss(tier = 1) {
  for (const f of state.foes) scene.remove(f.obj);
  state.foes = [];
  const obj = makeProgram(config.ORANGE);
  obj.scale.setScalar(1.15);
  const halo = new THREE.PointLight(config.ORANGE, 3.2, 14);
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
  state.foes.push(boss);
}

export function spawnWave() {
  const n = Math.min(2 + Math.floor(state.wave * 0.8), 8);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 14;
    const obj = makeProgram(config.ORANGE); scene.add(obj);
    state.foes.push({
      obj, pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
      vel: new THREE.Vector3(), hp: 100 + state.wave * 12, hasDisc: true,
      cd: 1.4 + Math.random() * 2.2, strafe: Math.random() < .5 ? 1 : -1,
      strafeT: 1 + Math.random() * 2, hurt: 0, skill: Math.min(.3 + state.wave * .08, .95),
      y: 0, vy: 0, grounded: true, jumps: 0, dashCd: 0, didRecover: false
    });
  }
}

export function throwDisc() {
  if (!state.player.hasDisc || !state.player.alive) return;
  state.player.hasDisc = false;
  state.player.obj.userData.backDisc.visible = false;
  const aim = aimTarget();
  const chest = state.player.pos.clone().add(new THREE.Vector3(0, 1.7 + state.player.y, 0));
  // aim from the chest at the exact point under the crosshair => reticle is truthful
  const dir = aim.point.clone().sub(chest).normalize();
  const origin = chest.clone().add(dir.clone().multiplyScalar(1.1));
  const curve = getPlayerCurveIntent();
  const vel = dir.clone().multiplyScalar(38);
  spawnDisc(origin, vel, 'player', config.CYAN, curve);
  window.__lastThrowDot = dir.clone().normalize().dot(aim.point.clone().sub(origin).normalize());
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

// Cast the camera's centre ray into the arena and return {point, foe, dist}.
// Everything the crosshair sits on is resolved analytically (floor, walls,
// pillars, programs) so the reticle is an honest prediction of the throw.
export const _ro = new THREE.Vector3(), _rd = new THREE.Vector3();
export function aimTarget() {
  _ro.copy(camera.position);
  camera.getWorldDirection(_rd);
  let best = 400, hitFoe = null;

  // floor
  if (_rd.y < -0.001) { const t = -_ro.y / _rd.y; if (t > 0.5 && t < best) { best = t; hitFoe = null; } }
  // walls
  const lim = config.ARENA - 1.5;
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
  return new THREE.Vector3(-Math.sin(state.player.yaw) * Math.cos(state.player.pitch), Math.sin(state.player.pitch), -Math.cos(state.player.yaw) * Math.cos(state.player.pitch)).normalize();
}

export function spawnDisc(pos, vel, owner, color, curve = 0) {
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
  state.discs.push(d);
  return d;
}

state.gameOverReason = '';

export function damagePlayer(amount, from) {
  if (!state.player.alive) return;
  state.player.hp -= amount; state.player.hurtFlash = 1;
  burst(state.player.pos.clone().setY(state.player.y + 1.6), config.CYAN, 18, 8);
  shake(0.35);
  if (state.player.hp <= 0) {
    state.player.hp = 0; state.player.alive = false; state.running = false; state.gameOverT = 0;
    burst(state.player.pos.clone().setY(state.player.y + 1.4), config.CYAN, 90, 16);
    state.player.obj.visible = false;
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
        payload[`state.${playerRole}`] = myState;
        
        let allTeammatesDead = true;
        for (const t of state.teammates) {
          if (t.hp > 0) allTeammatesDead = false;
        }

        if (allTeammatesDead) {
          payload.status = 'finished';
          const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
          payload.winnerTeam = myTeam === 1 ? 2 : 1; // opponent team wins
          // Legacy support: if duel_multi, winner is the other player
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

export function killFoe(f) {
  burst(f.pos.clone().setY(1.5 + (f.y || 0)), config.ORANGE, 70, 14);
  scene.remove(f.obj);
  state.foes = state.foes.filter(x => x !== f);
  if (state.gameMode === 'duel') {
    state.score += 500 + state.duelTier * 250;
    message('MATCH WON — TIER ' + state.duelTier + ' CLEARED');
    state.duelTier++;
    state.spawnTimer = 2.5;
  } else {
    state.score += 100 + state.wave * 10;
    if (state.foes.length === 0) {
      state.wave++;
      message('CYCLE ' + state.wave);
      state.spawnTimer = 2.2;
    }
  }
}
