import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { scene } from '../graphics/scene.js';
import { makeProgram, tmp, _duelLead, _duelOrigin, _duelAimDir, _duelWant, _duelSafe } from '../graphics/materials.js';
import { burst } from '../graphics/particles.js';
import { shake, message } from '../ui/UIManager.js';
import { resolveCircle, lineOfSight } from '../physics/collision.js';
import { getTileAt, findNearestIntactTile, pillars } from './Arena.js';
import { spawnDisc } from './Disc.js';
import { updateHUD } from '../ui/hud.js';
import { getRoomRef, roomUpdateDoc } from '../network/firebaseSetup.js';
import { showMultiplayerVictory } from '../network/roomManager.js';

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

export function spawnDuelBoss(tier = 1) {
  for (const f of state.foes) scene.remove(f.obj);
  state.foes = [];
  const obj = makeProgram(config.ORANGE);
  obj.scale.setScalar(1.15);
  const halo = new THREE.PointLight(config.ORANGE, 3.2, 14);
  halo.position.y = 1.6;
  obj.add(halo);
  scene.add(obj);

  const maxHp = tier === 1 ? 250 : (250 + tier * 50);
  const baseCd = tier === 1 ? 1.4 : Math.max(0.6, 1.4 - tier * 0.15);
  const speed = tier === 1 ? 10.5 : (10.5 + (tier - 1) * 0.85);
  const jumpChance = tier === 1 ? 0.35 : Math.min(0.85, 0.35 + (tier - 1) * 0.12);
  const strafeRate = tier === 1 ? 1.0 : (1.0 + (tier - 1) * 0.15);

  const boss = {
    obj,
    pos: new THREE.Vector3(0, 0, -28),
    vel: new THREE.Vector3(),
    hp: maxHp,
    maxHp: maxHp,
    hasDisc: true,
    cd: baseCd + Math.random() * 0.3,
    baseCd: baseCd,
    strafe: Math.random() < 0.5 ? 1 : -1,
    strafeT: (0.5 + Math.random() * 0.7) / strafeRate,
    strafeRate: strafeRate,
    hurt: 0,
    skill: Math.min(0.88 + (tier - 1) * 0.03, 0.98),
    isBoss: true,
    speed: speed,
    jumpChance: jumpChance,
    tier: tier,
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
    const obj = makeProgram(config.ORANGE);
    scene.add(obj);
    state.foes.push({
      obj,
      pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
      vel: new THREE.Vector3(),
      hp: 100 + state.wave * 12,
      hasDisc: true,
      cd: 1.4 + Math.random() * 2.2,
      strafe: Math.random() < .5 ? 1 : -1,
      strafeT: 1 + Math.random() * 2,
      hurt: 0,
      skill: Math.min(.3 + state.wave * .08, .95),
      y: 0,
      vy: 0,
      grounded: true,
      jumps: 0,
      dashCd: 0,
      didRecover: false
    });
  }
}

export function killFoe(f) {
  burst(f.pos.clone().setY(1.5 + (f.y || 0)), config.ORANGE, 70, 14);
  scene.remove(f.obj);
  state.foes = state.foes.filter(x => x !== f);
  state.score += 150;

  if (state.gameMode === 'duel' || state.gameMode === 'duel_ai') {
    state.tier = (state.tier || state.duelTier || 1) + 1;
    state.duelTier = state.tier;
    message('TIER ' + state.tier + ' REACHED');
    if (typeof window !== 'undefined' && window.__tronResetRound) {
      window.__tronResetRound(0, 14, Math.PI);
    }
    state.onCountdownEnd = () => {
      spawnDuelBoss(state.tier);
    };
    updateHUD();
    return;
  }

  if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    message('VICTORY — OPPONENT DEREZZED');
    if (state.db && state.currentRoomId && state.playerRole === 'p1') {
      const roomRef = getRoomRef(state.currentRoomId);
      const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
      const payload = { status: 'finished', winnerTeam: myTeam };
      if (state.gameMode === 'duel_multi') {
        payload.winner = state.playerRole;
      }
      roomUpdateDoc(roomRef, payload).catch(() => {});
    }
    setTimeout(() => {
      showMultiplayerVictory();
    }, 900);
    return;
  }

  if (state.gameMode === 'swarm') {
    state.score += 100 + state.wave * 10;
    if (state.foes.length === 0) {
      state.wave++;
      message('CYCLE ' + state.wave);
      if (typeof window !== 'undefined' && window.__tronResetRound) {
        window.__tronResetRound(0, 14, Math.PI);
      }
      state.onCountdownEnd = () => {
        spawnWave();
      };
      updateHUD();
    }
  } else {
    if (state.foes.length === 0) {
      state.wave++;
      message('CYCLE ' + state.wave);
      if (typeof window !== 'undefined' && window.__tronResetRound) {
        window.__tronResetRound(0, 14, Math.PI);
      }
      state.onCountdownEnd = () => {
        spawnWave();
      };
      updateHUD();
    }
  }
}

if (typeof window !== 'undefined') {
  window.__tronSpawnDuelBoss = spawnDuelBoss;
  window.__tronSpawnWave = spawnWave;
  window.__tronKillFoe = killFoe;
}

export function updateDuelFoe(f, dt) {
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
    if (wasGrounded) {
      f.vy = Math.min(f.vy, -3.5);
    }
    f.grounded = false;
  }

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
    const faceAngle = Math.atan2(deflectThreat.pos.x - f.pos.x, deflectThreat.pos.z - f.pos.z);
    const faceDiff = ((faceAngle - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.obj.rotation.y += THREE.MathUtils.clamp(faceDiff, -24 * dt, 24 * dt);

    f.telegraphT = (f.telegraphT || 0) + dt;
    if (f.telegraphT > 0.1) {
      f.telegraphT = 0;
      burst(tmp.set(f.pos.x, 2.45 + f.y, f.pos.z), config.ORANGE, 4, 3);
      burst(tmp.set(f.pos.x + 0.7, 1.6 + f.y, f.pos.z), config.ORANGE, 3, 2);
      burst(tmp.set(f.pos.x - 0.7, 1.6 + f.y, f.pos.z), config.ORANGE, 3, 2);
    }
  } else if (panicDisc) {
    f.state = 'EVADE';
    const faceAngle = Math.atan2(panicDisc.pos.x - f.pos.x, panicDisc.pos.z - f.pos.z);
    const faceDiff = ((faceAngle - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    f.obj.rotation.y += THREE.MathUtils.clamp(faceDiff, -18 * dt, 18 * dt);

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
    const face = Math.atan2(toPx, toPz);
    const turnRate = 8 * dt;
    f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
  }

  // Low disc jump evasion
  if (f.grounded && f.jumps === 0) {
    for (let i = 0; i < state.discs.length; i++) {
      const D = state.discs[i];
      if (D.owner === 'player' && !D.returning) {
        const dx = f.pos.x - D.pos.x;
        const dz = f.pos.z - D.pos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < 100) {
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

  // Tactical evasive dash
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

  // Aerial throw at apex
  if (f.aerialThrow && f.hasDisc && f.vy <= 1.0) {
    const leadX = state.player.pos.x + state.player.vel.x * (0.28 * f.skill);
    const leadZ = state.player.pos.z + state.player.vel.z * (0.28 * f.skill);
    _duelLead.set(leadX, 1.7 + state.player.y, leadZ);
    _duelOrigin.copy(f.pos).setY(1.7 + f.y);
    _duelAimDir.copy(_duelLead).sub(_duelOrigin).normalize();
    _duelOrigin.addScaledVector(_duelAimDir, 1.2);

    const curvePower = (Math.random() < 0.6) ? (Math.random() < 0.5 ? 1.0 : -1.0) * (0.8 + Math.random() * 0.4) : 0;
    spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + (state.tier || state.duelTier || 1) * 2), f, config.ORANGE, curvePower);

    f.hasDisc = false;
    f.aerialThrow = false;
    f.state = 'SEEK_COVER';
    f.cd = (f.baseCd !== undefined ? f.baseCd : 0.8) + Math.random() * 0.4;
    f.coverPillar = null;
    f.peekDir = -f.peekDir;
  }

  // Combat state machine
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
      f.strafeT -= dt * (1.1 * (f.strafeRate || 1.0));
      if (f.strafeT <= 0) {
        f.strafe *= -1;
        f.strafeT = (0.45 + Math.random() * 0.65) / (f.strafeRate || 1.0);
      }
      const sideX = -normZ * f.strafe;
      const sideZ = normX * f.strafe;

      if (pDist > 19) _duelWant.add({ x: normX, y: 0, z: normZ });
      else if (pDist < 12) _duelWant.add({ x: -normX, y: 0, z: -normZ });
      _duelWant.add({ x: sideX * 1.1, y: 0, z: sideZ * 1.1 });
      if (_duelWant.lengthSq() > 0) _duelWant.normalize();

      f.cd -= dt;
      if (f.cd <= 0 && f.hasDisc && state.player.alive) {
        if (f.grounded && Math.random() < (f.jumpChance || 0.35) && pDist >= 8) {
          f.vy = 11.5;
          f.grounded = false;
          f.jumps = 1;
          f.aerialThrow = true;
          burst(tmp.copy(f.pos).setY(f.y + 0.2), config.ORANGE, 14, 5);
        } else {
          const leadX = state.player.pos.x + state.player.vel.x * (0.28 * f.skill);
          const leadZ = state.player.pos.z + state.player.vel.z * (0.28 * f.skill);
          _duelAimDir.set(leadX - f.pos.x, 0, leadZ - f.pos.z);
          _duelAimDir.x += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.z += (Math.random() - .5) * (1 - f.skill) * .18;
          _duelAimDir.normalize();

          const curveDir = -f.peekDir;
          const curvePower = (Math.random() < 0.75) ? curveDir * (0.85 + Math.random() * 0.4) : 0;
          _duelOrigin.copy(f.pos).setY(1.7 + f.y).addScaledVector(_duelAimDir, 1.2);

          spawnDisc(_duelOrigin.clone(), _duelAimDir.clone().multiplyScalar(28 + (state.tier || state.duelTier || 1) * 2), f, config.ORANGE, curvePower);

          f.hasDisc = false;
          f.state = 'SEEK_COVER';
          f.cd = (f.baseCd !== undefined ? f.baseCd : 0.8) + Math.random() * 0.4;
          f.coverPillar = null;
          f.peekDir = -f.peekDir;
        }
      }
    }
  }

  const moveSpeed = (f.state === 'SEEK_COVER') ? (f.speed || 10.5) * 1.35 : (f.speed || 10.5);
  const inVoid = !isFoeTileSolid && f.y < 0;
  const lerpRate = inVoid ? 0 : (1 - Math.pow(.001, dt));
  f.vel.lerp(_duelWant.multiplyScalar(moveSpeed), lerpRate);
  f.pos.addScaledVector(f.vel, dt);
  resolveCircle(f.pos, config.FOE_R, f.y);

  f.obj.position.copy(f.pos);
  f.obj.position.y = f.y + (f.grounded ? Math.sin(state.time * 11) * 0.05 * Math.min(f.vel.length() / 8, 1) : 0);
  f.obj.rotation.x = THREE.MathUtils.clamp(-f.vy * 0.018, -0.22, 0.22);
  f.obj.userData.backDisc.visible = f.hasDisc;
  if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(state.time * 60) * 0.05; }
}

export function updateFoes(dt) {
  if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi' || state.countdownTimer > 0) return;

  for (let fi = state.foes.length - 1; fi >= 0; fi--) {
    const f = state.foes[fi];
    if ((state.gameMode === 'duel' || state.gameMode === 'duel_ai') && f.isBoss) {
      updateDuelFoe(f, dt);
      continue;
    }

    if (f.y === undefined) { f.y = 0; f.vy = 0; f.grounded = true; f.didRecover = false; }
    const prevY = f.y;
    const wasGrounded = f.grounded;
    f.vy -= 30 * dt;
    f.y += f.vy * dt;

    const sTile = getTileAt(f.pos.x, f.pos.z);
    const isSTileSolid = sTile && sTile.state !== config.TILE_FALLEN && sTile.state !== config.TILE_REBUILDING;

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
      burst(tmp.copy(f.pos).setY(f.y + 0.3), config.ORANGE, 14, 5);
    }

    if (f.y < -18) {
      burst(f.pos.clone().setY(-18), config.ORANGE, 70, 16);
      state.score += 200;
      message('PIT ELIMINATION +200');
      killFoe(f);
      continue;
    }

    const toP = tmp.copy(state.player.pos).sub(f.pos);
    toP.y = 0;
    const dist = toP.length();
    toP.normalize();
    const see = lineOfSight(f.pos, state.player.pos) && state.player.alive;

    f.strafeT -= dt;
    if (f.strafeT <= 0) { f.strafe *= -1; f.strafeT = .9 + Math.random() * 1.8; }
    const side = new THREE.Vector3(toP.z, 0, -toP.x).multiplyScalar(f.strafe);

    const want = new THREE.Vector3();
    const ideal = 15;
    if (dist > ideal + 3) want.add(toP);
    else if (dist < ideal - 5) want.sub(toP);
    want.addScaledVector(side, .85);
    if (!see) want.add(toP).multiplyScalar(1.2);

    for (const o of state.foes) if (o !== f) {
      const dd = tmp.copy(f.pos).sub(o.pos);
      dd.y = 0;
      const L = dd.length();
      if (L < 4 && L > .01) want.addScaledVector(dd.normalize(), (4 - L) * .5);
    }
    if (want.lengthSq() > 0) want.normalize();

    const moveSpeed = 8.2 + state.wave * .25;
    const inVoid = !isSTileSolid && f.y < 0;
    const lerpRate = inVoid ? 0 : (1 - Math.pow(.002, dt));
    f.vel.lerp(want.multiplyScalar(moveSpeed), lerpRate);
    f.pos.addScaledVector(f.vel, dt);
    resolveCircle(f.pos, config.FOE_R, f.y);

    f.obj.position.copy(f.pos);
    f.obj.position.y = f.y + (f.grounded ? Math.sin(state.time * 11) * 0.05 * Math.min(f.vel.length() / 8, 1) : 0);
    f.obj.rotation.x = THREE.MathUtils.clamp(-f.vy * 0.018, -0.22, 0.22);

    let deflectThreat = null;
    for (let i = 0; i < state.discs.length; i++) {
      const D = state.discs[i];
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
        burst(tmp.set(f.pos.x, 2.45 + (f.y || 0), f.pos.z), config.ORANGE, 4, 2);
      }
    } else {
      const face = Math.atan2(state.player.pos.x - f.pos.x, state.player.pos.z - f.pos.z);
      const turnRate = 6 * dt;
      f.obj.rotation.y += THREE.MathUtils.clamp(((face - f.obj.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI, -turnRate, turnRate);
    }
    f.obj.userData.backDisc.visible = f.hasDisc;
    if (f.hurt > 0) { f.hurt -= dt; f.obj.position.x += Math.sin(state.time * 60) * .05; }

    f.cd -= dt;
    if (f.cd <= 0 && f.hasDisc && see && state.player.alive) {
      f.hasDisc = false;
      f.cd = Math.max(1.1, 3.4 - state.wave * .18) + Math.random();
      const lead = state.player.pos.clone().addScaledVector(state.player.vel, 0.22 * f.skill);
      const dir = lead.sub(f.pos).setY(0).normalize();
      dir.x += (Math.random() - .5) * (1 - f.skill) * .45;
      dir.z += (Math.random() - .5) * (1 - f.skill) * .45;
      dir.normalize();
      const origin = f.pos.clone().setY(1.7 + (f.y || 0)).addScaledVector(dir, 1.2);
      spawnDisc(origin, dir.multiplyScalar(26 + state.wave), f, config.ORANGE);
    }
  }
}
