import * as THREE from './vendor/three.module.js';
import { state, player } from './state.js';
import { config } from './config.js';
import { initGraphics, renderer, scene, camera, checkOrientation, key, d, floor, grid, ring, tiles, tileGeo, tileEdgeGeo, tileMatIntact, tileEdgeMatIntact, tileGroup, worldToTile, tileToWorld, getTileAt, findNearestIntactTile, wallMat, glowMat, pillars, pillarSpots, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY, _duelToP, _duelSide, _duelWant, _duelSafe, _duelCoverDir, _duelLead, _duelAimDir, _duelOrigin, _duelEvade, makeProgram, discGeo, makeDisc, sparks, burst, triggerTileWarning, spawnTileDeRezSparks, updateTiles, getPillarCoverPoint, findBestCoverPillar, updateDuelFoe } from './graphics.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound, SFX } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { mockStore, mockListeners, initMockNetwork, mockDocRef, mockSetDoc, mockGetDoc, mockUpdateDoc, mockOnSnapshot, initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot, generateRoomCode, copyRoomCode, showHostWaitingModal, showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, startMultiplayerDuel, onRoomSnapshot, syncNetworkState, onTileDestabilizedByHost, renderGameOverActions, bindGameOverActions, showMultiplayerVictory, showMultiplayerDefeat, teardownMultiplayer } from './network.js';
import { initInput, EAT, getPlayerCurveIntent, codeOf, onDown, onUp, canvas, overlay, startMode, startGame, pauseGame, resumeGame, restartMatch, showModeSelect, getMainMenuHtml, showModeSelectMenu, bindMainMenuEvents, pauseBtn, onPauseClick, resumeBtn, onResumeClick, restartBtn, onRestartClick, modeSelectBtn, onModeSelectClick, btnCopyCode, btnConfirmJoin, btnCancelRoom, joinRoomInput, tryLock, setCursor, focusGame, isLocked, look, showSens, sens, moveStartPos, touchMove, lookLastPos, touchState, updateTouchMomentum, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, onTouchStart, onTouchMove, onTouchEnd, bindMobileButtons } from './input.js';
import { updateHUD, resetGame, spawnDuelBoss, spawnWave, throwDisc, _ro, aimTarget, aimDir, spawnDisc, damagePlayer, killFoe } from './entities.js';
import { el, msgEl, message, showGameOver, shake, bindMenuButtons } from './ui.js';

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

export function update(dt) {
  state.time += dt;

  // ── Universal Countdown & Freeze
  if (state.countdownTimer > 0) {
    const prevSec = Math.ceil(state.countdownTimer);
    state.countdownTimer -= dt;
    const curSec = Math.ceil(state.countdownTimer);

    // Freeze player velocity, buffer & dash
    state.player.vel.set(0, 0, 0);
    state.player.jumpBuf = 0;
    state.touchDashRequested = false;

    // Freeze AI velocity
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
      // Countdown reached 0 -> FIGHT!
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

      // Spawning enemies now that countdown ended
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

  // ── update destructible tiles
  updateTiles(dt);

  // ── multiplayer network state broadcast
  syncNetworkState(dt);

  // ── player movement
  if (state.player.alive) {
    updateTouchMomentum(dt);
    const fwd = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);   // +X when yaw=0; A/D were inverted
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
        // Step off solid edge without jump -> immediate downward plunge impulse
        state.player.vy = Math.min(state.player.vy, -3.5);
      }
      state.player.grounded = false;
    }

    const inRecoveryZone = state.player.y < 0 && state.player.y > -3.5;
    if (inRecoveryZone && state.player.vy <= 0) {
      message('SURFACE COLLAPSE — JUMP / DASH!');
      state.msgT = Math.max(state.msgT, 0.4);
    }

    // ── vertical: jump / double-jump / gravity
    const GRAV = 30, JUMP_V = 11.5;
    if ((state.keys.Space || state.touchJumpHeld) && !state.player.jumpHeld) state.player.jumpBuf = 0.15;     // buffer the press
    state.player.jumpBuf = Math.max(0, (state.player.jumpBuf || 0) - dt);
    state.player.coyote = state.player.grounded ? 0.12 : Math.max(0, (state.player.coyote || 0) - dt);
    const canJump = state.player.jumps < 2 || state.player.coyote > 0;
    if (state.player.jumpBuf > 0 && canJump && state.player.jumps < 2) {
      state.player.jumpBuf = 0;
      if (inRecoveryZone) {
        state.player.vy = 12.0; // recovery jump upward velocity
        message('RECOVERY JUMP');
      } else {
        state.player.vy = state.player.jumps === 0 ? JUMP_V : JUMP_V * 0.88;
        if (state.player.jumps === 1) message('AIR JUMP');
      }
      state.player.jumps++; state.player.grounded = false;
      burst(state.player.pos.clone().setY(state.player.y + .2), config.CYAN, state.player.jumps === 1 ? 12 : 18, 5);
      shake(.08);
    }
    state.player.jumpHeld = !!state.keys.Space || state.touchJumpHeld;
    if ((state.keys.Space || state.touchJumpHeld) && state.player.vy > 0) state.player.vy -= GRAV * 0.55 * dt;   // hold for higher jump
    else state.player.vy -= GRAV * dt;
    state.player.y += state.player.vy * dt;

    if (isTileSolid) {
      // Step-up prevention: cannot land from below unless falling from above floor plane (prevY >= -0.15m)
      if (state.player.y <= 0 && prevY >= -0.15) {
        if (!state.player.grounded && state.player.vy < -6) { burst(state.player.pos.clone().setY(.15), config.CYAN, 10, 4); shake(.07); }
        state.player.y = 0; state.player.vy = 0; state.player.grounded = true; state.player.jumps = 0;
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
    if (!state.player.grounded) speed *= 0.82;                  // reduced air control
    state.player.dashCd -= dt;
    const isDashTriggered = (state.keys.ShiftLeft || state.keys.ShiftRight || state.touchDashRequested);
    if (isDashTriggered && state.player.energy > 25 && state.player.dashCd <= 0) {
      let dashDir = wish.clone();
      if (dashDir.lengthSq() < 1e-4) {
        dashDir.copy(fwd);
      } else {
        dashDir.normalize();
      }
      const dashImpulse = inRecoveryZone ? 38 : 34;
      state.player.vel.add(dashDir.multiplyScalar(dashImpulse));
      if (inRecoveryZone && state.player.vy < 0) {
        state.player.vy = Math.max(state.player.vy, 4.0); // upward recovery pop
      }
      state.player.energy -= 25; state.player.dashCd = .45; shake(.18);
      burst(state.player.pos.clone().setY(state.player.y + .4), config.CYAN, 14, 5);
      if (inRecoveryZone) message('RECOVERY DASH');
    }
    state.touchDashRequested = false;
    state.player.energy = Math.min(100, state.player.energy + dt * 14);

    const target = wish.multiplyScalar(speed);
    // Disallow floor friction damping so lateral momentum is preserved in void
    const inVoid = !isTileSolid && state.player.y < 0;
    const lerpRate = inVoid
      ? (wish.lengthSq() > 0 ? (1 - Math.pow(0.5, dt)) : 0)
      : (state.player.grounded
          ? (1 - Math.pow(0.0009, dt))
          : (1 - Math.pow(0.005, dt)));
    state.player.vel.lerp(target, lerpRate);
    state.player.pos.addScaledVector(state.player.vel, dt);
    resolveCircle(state.player.pos, config.PLAYER_R, state.player.y);

    state.player.obj.position.copy(state.player.pos);
    state.player.obj.rotation.y = state.player.yaw;
    // bob on the ground, tuck-and-lean in the air
    state.player.obj.position.y = state.player.y + (state.player.grounded ? Math.sin(state.time * 11) * .05 * Math.min(state.player.vel.length() / 8, 1) : 0);
    state.player.obj.rotation.x = THREE.MathUtils.clamp(-state.player.vy * 0.018, -.22, .22);
    state.player.obj.userData.backDisc.visible = state.player.hasDisc;
    state.player.obj.userData.backDisc.rotation.z += dt * (state.player.hasDisc ? 3 : 0);
    if (state.player.blocking && state.player.hasDisc) {
      const d = state.player.obj.userData.backDisc;
      d.position.set(0, 1.75, .75); d.rotation.x = 0;
    } else {
      const d = state.player.obj.userData.backDisc;
      d.position.set(0, 1.8, -.45); d.rotation.x = Math.PI / 2;
    }
  }
  // ── remote opponent (multiplayer interpolation)
  if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    for (const key in state.multiPlayers) {
      const opp = state.multiPlayers[key];
      if (!opp || !opp.obj || !opp.alive) continue;
      opp.pos.lerp(opp.targetPos, dt * 16);
      opp.y = THREE.MathUtils.lerp(opp.y || 0, opp.targetY || 0, dt * 16);
      opp.obj.position.copy(opp.pos);
      opp.obj.position.y = opp.y;
      opp.yaw = THREE.MathUtils.lerp(
        opp.yaw !== undefined ? opp.yaw : opp.obj.rotation.y,
        opp.targetYaw,
        dt * 14
      );
      opp.obj.rotation.y = opp.yaw;
      if (opp.obj.userData && opp.obj.userData.backDisc) {
        opp.obj.userData.backDisc.visible = opp.hasDisc;
        if (opp.blocking && opp.hasDisc) {
          opp.obj.userData.backDisc.position.set(0, 1.75, .75);
          opp.obj.userData.backDisc.rotation.x = 0;
        } else {
          opp.obj.userData.backDisc.position.set(0, 1.8, -.45);
          opp.obj.userData.backDisc.rotation.x = Math.PI / 2;
        }
      }
    }
  }

  // ── foes
  if (state.gameMode !== 'duel_multi' && state.gameMode !== 'duos_multi' && state.countdownTimer <= 0) {
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
      burst(tmp.copy(f.pos).setY(f.y + 0.3), config.ORANGE, 14, 5);
    }

    // Void Death Threshold
    if (f.y < -18) {
      burst(f.pos.clone().setY(-18), config.ORANGE, 70, 16);
      state.score += 200;
      message('PIT ELIMINATION +200');
      killFoe(f);
      continue;
    }

    const toP = tmp.copy(state.player.pos).sub(f.pos); toP.y = 0;
    const dist = toP.length(); toP.normalize();
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

    // avoid other foes
    for (const o of state.foes) if (o !== f) {
      const dd = tmp.copy(f.pos).sub(o.pos); dd.y = 0;
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

    // Deflected disc threat response or normal facing
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

    // fire
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

  // ── discs
  for (let i = state.discs.length - 1; i >= 0; i--) {
    const D = state.discs[i];
    D.t += dt; D.spin += dt * 26;

    const holder = D.owner === 'player' ? player : D.owner;
    let holderAlive = false;
    if (D.owner === 'player') holderAlive = state.player.alive;
    else if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
      if (D.owner && D.owner.alive !== undefined) holderAlive = D.owner.alive;
    } else {
      holderAlive = state.foes.includes(D.owner);
    }

    if (!holderAlive) { scene.remove(D.obj); state.discs.splice(i, 1); continue; }

    // Deflection miss handling (Section 3.C)
    if (D.isDeflected) {
      D.deflectTime = (D.deflectTime || 0) + dt;
      if ((D.deflectTime >= 1.5 || (D.deflectBounces || 0) >= 2) && !D.returning) {
        D.isDeflected = false;
        D.returning = true;
        const targetFoe = (D.originalOwner && state.foes.includes(D.originalOwner)) ? D.originalOwner : (state.foes[0] || null);
        if (targetFoe) {
          D.owner = targetFoe;
          D.color = config.ORANGE;
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
            if (o.isPointLight) o.color.setHex(config.ORANGE);
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
          state.player.hasDisc = true;
        } else if (D.owner) {
          D.owner.hasDisc = true;
          if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
            D.owner.obj.userData.backDisc.visible = true;
          }
        }
        scene.remove(D.obj); state.discs.splice(i, 1); continue;
      }
    } else if (D.curve) {
      // Lateral Magnus-effect curve integration
      const vx = D.vel.x, vy = D.vel.y, vz = D.vel.z;
      const speed = Math.hypot(vx, vy, vz);
      const hSpeed = Math.hypot(vx, vz);
      if (hSpeed > 1e-4) {
        const nx = -vz / hSpeed;
        const nz = vx / hSpeed;
        const latAcc = D.curve * config.CURVE_ACCEL * dt;
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
      D.curve *= Math.exp(-config.CURVE_LAMBDA * dt);
    }

    D.pos.addScaledVector(D.vel, dt);
    // gentle gravity-free hover, keep near chest height
    if (D.pos.y > config.DISC_R) {
      D.pos.y += (1.7 - D.pos.y) * Math.min(1, dt * 2.2);
    }

    // floor collision & void check
    const yFloor = config.DISC_R;
    const tile = getTileAt(D.pos.x, D.pos.z);
    const isSolid = tile && tile.state !== config.TILE_FALLEN && tile.state !== config.TILE_REBUILDING;

    if (D.pos.y <= yFloor) {
      if (isSolid) {
        if (tile && tile.state === config.TILE_INTACT) {
          triggerTileWarning(tile, D.color);
          if ((state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') && state.playerRole === 'p1') {
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
    const lim = config.ARENA - 1.5;
    let bounced = false;
    if (D.pos.x > lim) { D.pos.x = lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.x < -lim) { D.pos.x = -lim; D.vel.x *= -1; bounced = true; }
    if (D.pos.z > lim) { D.pos.z = lim; D.vel.z *= -1; bounced = true; }
    if (D.pos.z < -lim) { D.pos.z = -lim; D.vel.z *= -1; bounced = true; }
    // pillar bounce
    for (const p of pillars) {
      const dx = D.pos.x - p.x, dz = D.pos.z - p.z;
      const dd = Math.hypot(dx, dz), min = p.r + config.DISC_R;
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
      for (const f of state.foes) {
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
            const catchChance = ((state.gameMode === 'duel' || state.gameMode === 'duel_ai') && f.isBoss)
              ? Math.min(0.85, 0.75 + ((state.tier || state.duelTier) - 1) * 0.03)
              : 0.35;
            if (Math.random() < catchChance) {
              // ON SUCCESS (AI Catch)
              scene.remove(D.obj);
              state.discs.splice(i, 1);
              f.hasDisc = true;
              if (f.obj && f.obj.userData && f.obj.userData.backDisc) {
                f.obj.userData.backDisc.visible = true;
              }
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.WHITE, 28, 11);
              burst(f.pos.clone().setY(1.7 + (f.y || 0)), config.ORANGE, 14, 7);
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
              state.score += 150;
              message('DEFLECTION HIT!');
              burst(D.pos.clone(), config.WHITE, 32, 12);
              burst(D.pos.clone(), config.ORANGE, 20, 8);
              shake(0.25);
              if (f.hp <= 0) {
                killFoe(f);
              } else {
                D.vel.multiplyScalar(-0.4);
                D.vel.x += (Math.random() - 0.5) * 4;
                D.vel.z += (Math.random() - 0.5) * 4;
                D.vel.y = Math.random() * 2 + 1;
                D.isDeflected = false;
                D.color = config.ORANGE;
                D.obj.traverse(o => {
                  if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
                  if (o.isPointLight) o.color.setHex(config.ORANGE);
                });
                D.owner = f;
                D.returning = true;
              }
              discCaught = true;
              break;
            }
          }
        }

        if (dist < config.FOE_R + config.DISC_R + .35) {
          if (!D.hitFoes) D.hitFoes = new Set();
          D.hitFoes.add(f);

          if (D.isDeflected) {
            const critDmg = 85 + D.bounces * 20;
            f.hp -= critDmg;
            f.hurt = 0.8;
            f.cd = Math.max(f.cd, 0.8);
            state.score += 150;
            message('DEFLECTION HIT!');
            burst(D.pos.clone(), config.WHITE, 32, 12);
            burst(D.pos.clone(), config.ORANGE, 20, 8);
            shake(0.25);
            if (f.hp <= 0) {
              killFoe(f);
            } else {
              D.vel.multiplyScalar(-0.4);
              D.vel.x += (Math.random() - 0.5) * 4;
              D.vel.z += (Math.random() - 0.5) * 4;
              D.vel.y = Math.random() * 2 + 1;
              D.isDeflected = false;
              D.color = config.ORANGE;
              D.obj.traverse(o => {
                if (o.material && o.material.color) o.material.color.setHex(config.ORANGE);
                if (o.isPointLight) o.color.setHex(config.ORANGE);
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
            state.score += 150;
            message('REAR STRIKE  x2');
            burst(D.pos.clone(), config.WHITE, 34, 13);
            shake(.3);
          } else if (rear) {
            dmg *= 1.4;                            // plain backshot still rewarded
            state.score += 60;
            burst(D.pos.clone(), config.WHITE, 20, 10);
            shake(.18);
          } else {
            burst(D.pos.clone(), config.ORANGE, 24, 9);
            shake(.15);
          }

          f.hp -= dmg;
          f.hurt = .25; state.score += 25;
          D.returning = true;
          if (f.hp <= 0) killFoe(f);

          // If close enough to player, complete catch
          if (D.pos.distanceTo(tmp.copy(holder.pos).setY(1.7 + (holder.y || 0))) < 1.4) {
            state.player.hasDisc = true;
            scene.remove(D.obj);
            state.discs.splice(i, 1);
            discCaught = true;
          }
          break;
        }
      }
    } else if (state.player.alive) {
      let isTeammate = false;
      if (state.gameMode === 'duos_multi' && D.owner && D.owner.team !== undefined) {
        const myTeam = (state.playerRole === 'p1' || state.playerRole === 'p3') ? 1 : 2;
        if (D.owner.team === myTeam) isTeammate = true;
      }
      
      const pc = tmp.copy(state.player.pos).setY(1.5 + state.player.y);
      if (!isTeammate && D.pos.distanceTo(pc) < config.PLAYER_R + config.DISC_R + .35) {
        const toDisc = D.pos.clone().sub(pc).setY(0).normalize();
        const facing = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
        if (state.player.blocking && state.player.hasDisc && toDisc.dot(facing) > .35) {
          // parry: reflect back, becomes player-owned deflected threat
          burst(D.pos.clone(), config.WHITE, 30, 12);
          shake(.25); state.score += 50;
          D.originalOwner = (D.owner !== 'player') ? D.owner : (D.originalOwner || state.foes[0]);
          D.owner = 'player';
          D.color = config.WHITE;
          D.isDeflected = true;
          D.returning = false;
          D.bounces = 0;
          D.deflectBounces = 0;
          D.deflectTime = 0;
          D.t = 0;
          D.curve = 0;
          if (D.hitFoes) D.hitFoes.clear();
          D.obj.traverse(o => {
            if (o.material && o.material.color) o.material.color.setHex(config.WHITE);
            if (o.isPointLight) o.color.setHex(config.WHITE);
          });
          const incomingSpd = D.vel.length();
          const spd = Math.max(36, incomingSpd * 1.25);
          let targetFoe = (D.originalOwner && state.foes.includes(D.originalOwner)) ? D.originalOwner : state.foes[0];
          if (!targetFoe && state.foes.length > 0) targetFoe = state.foes[0];
          if (targetFoe) {
            const dirToRival = targetFoe.pos.clone().setY(1.7 + (targetFoe.y || 0)).sub(D.pos).normalize();
            D.vel.copy(dirToRival).multiplyScalar(spd);
          } else {
            D.vel.copy(facing).multiplyScalar(spd);
          }

          if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
            if (state.db && state.currentRoomId && state.currentUser) {
              const roomRef = getRoomRef(state.currentRoomId);
              roomUpdateDoc(roomRef, {
                lastThrow: {
                  id: Math.random().toString(36).substring(2, 9),
                  sender: state.playerRole,
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
          }
          D.pos.addScaledVector(toDisc, 1.2);
          message('DEFLECTED!');
        } else {
          // Elastic impact rebound: enemy disc hits player without being blocked (Section 2.1)
          const behind = toDisc.dot(facing) < -0.25;
          damagePlayer((16 + D.bounces * 6) * (behind && D.bounces > 0 ? 1.8 : 1));
          if (behind && D.bounces > 0) message('HIT FROM BEHIND');
          burst(D.pos.clone(), config.ORANGE, 18, 7);
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
              state.player.hasDisc = true;
            } else if (D.owner) {
              D.owner.hasDisc = true;
              if (D.owner.obj && D.owner.obj.userData && D.owner.obj.userData.backDisc) {
                D.owner.obj.userData.backDisc.visible = true;
              }
            }
            scene.remove(D.obj);
            state.discs.splice(i, 1);
            discCaught = true;
            SFX.catchDisc();
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
  const back = new THREE.Vector3(Math.sin(state.player.yaw), 0, Math.cos(state.player.yaw));
  const side = new THREE.Vector3(-back.z, 0, back.x);
  const camOff = back.multiplyScalar(DIST)
    .addScaledVector(side, SHOULDER)
    .setY(HEIGHT - state.player.pitch * 5.0);
  const desired = state.player.pos.clone().add(camOff);
  desired.y += state.player.y * 0.85;
  desired.y = Math.max(1.4, desired.y);
  // keep camera inside arena
  desired.x = THREE.MathUtils.clamp(desired.x, -config.ARENA + 2, config.ARENA - 2);
  desired.z = THREE.MathUtils.clamp(desired.z, -config.ARENA + 2, config.ARENA - 2);
  camera.position.lerp(desired, 1 - Math.pow(.000000015, dt));
  const fwdV = new THREE.Vector3(-Math.sin(state.player.yaw), 0, -Math.cos(state.player.yaw));
  const sideV = new THREE.Vector3(-fwdV.z, 0, fwdV.x);
  const look = state.player.pos.clone()
    .add(new THREE.Vector3(0, 2.0 + state.player.y + state.player.pitch * 7, 0))
    .addScaledVector(sideV, 1.7)
    .addScaledVector(fwdV, 14);
  camera.lookAt(look);
  if (state.shakeAmt > 0) {
    camera.position.x += (Math.random() - .5) * state.shakeAmt;
    camera.position.y += (Math.random() - .5) * state.shakeAmt;
    camera.position.z += (Math.random() - .5) * state.shakeAmt;
    state.shakeAmt = Math.max(0, state.shakeAmt - dt * 2.2);
  }

  // ── analog steering when the cursor can't be captured
  if (!isLocked() && state.steerX && !state.isTouchDevice) {
    const RATE = 3.1;                       // radians/sec at full deflection
    state.player.yaw -= state.steerX * RATE * dt;
    if (state.player.yaw >  Math.PI) state.player.yaw -= Math.PI * 2;
    if (state.player.yaw < -Math.PI) state.player.yaw += Math.PI * 2;
  }
  // live input monitor (F1)
  const km = document.getElementById('keymon');
  if (km && km.style.display === 'block') {
    const on = k => state.keys[k] ? 'style="color:#fff;text-shadow:0 0 8px #fff"' : 'style="opacity:.3"';
    km.innerHTML = `<b ${on('KeyW')}>W</b> <b ${on('KeyA')}>A</b> <b ${on('KeyS')}>S</b> <b ${on('KeyD')}>D</b>
      <b ${on('KeyQ')}>Q</b> <b ${on('KeyE')}>E</b>
      <b ${on('Space')}>SPACE</b> <b ${on('ShiftLeft')}>SHIFT</b><br>
      curve ${getPlayerCurveIntent().toFixed(2)} · y ${player.y.toFixed(2)} · jumps ${player.jumps} · grounded ${player.grounded}<br>
      pointerlock ${isLocked()} · focus ${document.hasFocus()}`;
  }
  // lock-state banner
  const lb = document.getElementById('lockstate');
  if (lb) lb.style.display = (state.isTouchDevice || isLocked()) ? 'none' : 'block';

  // ── crosshair + trajectory preview
  const aim = aimTarget();
  const traj = updateTrajectory(aim, dt);
  updateThreatPaths();
  const ch = document.getElementById('crosshair');
  if (ch) {
    const onFoe = !!aim.foe || !!(traj && traj.willHit);
    ch.classList.toggle('hot', onFoe);
    ch.classList.toggle('bank', !!(traj && traj.willHit && traj.bounces > 0));
    ch.classList.toggle('empty', !state.player.hasDisc);
    const qHeld = (!!state.keys.KeyQ || state.touchCurveL) && !(!!state.keys.KeyE || state.touchCurveR);
    const eHeld = (!!state.keys.KeyE || state.touchCurveR) && !(!!state.keys.KeyQ || state.touchCurveL);
    ch.classList.toggle('curve-l', qHeld);
    ch.classList.toggle('curve-r', eHeld);
    const range = document.getElementById('range');
    if (range) range.textContent = aim.dist < 300 ? Math.round(aim.dist) + 'M' : '';
  }

  // ── grid pulse
  grid.material.opacity = .72 + Math.sin(state.time * 1.6) * .1 + state.player.hurtFlash * .3;
  const cTile = getTileAt(0, 0);
  ring.visible = !cTile || cTile.state !== config.TILE_FALLEN;
  ring.material.opacity = .35 + Math.sin(state.time * 2.2) * .15;

  // ── HUD
  updateHUD();
  if (state.msgT > 0) { state.msgT -= dt; if (state.msgT <= 0) msgEl.style.opacity = 0; }
}

export function loop() {
  requestAnimationFrame(loop);
  let dt = clock.getDelta();
  if (state.justResumed) {
    dt = 0;
    state.justResumed = false;
  }
  dt = Math.min(dt, 0.05);
  if (state.running && !state.paused) update(dt);
  else if (!state.running) { // idle camera orbit on menu
    state.time += dt;
    camera.position.set(Math.sin(state.time * .12) * 34, 14, Math.cos(state.time * .12) * 34);
    camera.lookAt(0, 2, 0);
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { scene.remove(s.pts); sparks.splice(i, 1); } }
  }
  renderer.render(scene, camera);
}

export const animate = loop;

function initApp() {
  try {
    // 1. Initialize renderer and scene
    initGraphics();

    // 2. Safely initialize inputs using the mounted canvas
    const canvas = renderer?.domElement || document.querySelector('canvas');
    initInput(canvas);

    // 3. Bind UI buttons safely
    bindMenuButtons();

    if (state.isTouchDevice && typeof document !== 'undefined' && document.body) {
      document.body.classList.add('touch-device');
      checkOrientation();
    }

    // 4. Start render loop
    requestAnimationFrame(animate);
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


// debug hooks (headless test harness)
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
  gridInfo: () => ({ visible: grid.visible, y: grid.position.y, op: +grid.material.opacity.toFixed(2),
    renderOrder: grid.renderOrder, camY: +camera.position.y.toFixed(2),
    fog: [scene.fog.near, scene.fog.far], floorVisible: floor.visible }),
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
    return { points: sim.pts.length, bounces: sim.bounceAt.length, hitsFoe: !!sim.hitFoe,
             lineVisible: trajLine.visible, drawn: trajLine.geometry.drawRange.count };
  },
  yaw: () => +state.player.yaw.toFixed(3),
  pitch: () => +state.player.pitch.toFixed(3),
  aim: () => { const a = aimTarget(); return { dist: +a.dist.toFixed(1), foe: !!a.foe }; },
  // dot product between the live disc's velocity and the direction to the crosshair point
  discAlign: () => {
    const d = state.discs.find(x => x.owner === 'player'); if (!d) return null;
    const toTarget = aimTarget().point.clone().sub(state.player.pos.clone().setY(1.7 + state.player.y));
    if (toTarget.lengthSq() < 1e-6 || d.vel.lengthSq() < 1e-6) return 0;
    const val = d.vel.clone().normalize().dot(toTarget.normalize());
    return isNaN(val) ? 0 : +val.toFixed(3);
  },
  discCurve: () => {
    const d = state.discs.find(x => x.owner === 'player');
    return d ? +(d.curve || 0).toFixed(3) : null;
  },
  discs: () => state.discs.map(d => ({ pos: { x: +d.pos.x.toFixed(2), y: +d.pos.y.toFixed(2), z: +d.pos.z.toFixed(2) }, vel: { x: +d.vel.x.toFixed(2), y: +d.vel.y.toFixed(2), z: +d.vel.z.toFixed(2) }, bounces: d.bounces, returning: d.returning, isDeflected: !!d.isDeflected, owner: d.owner === 'player' ? 'player' : 'foe' })),
  lastMessage: () => msgEl.textContent,
  score: () => state.score,
  simulatePath: (origin, vel, maxBounces, tMax, step, curve) => simulatePath(origin, vel, maxBounces, tMax, step, curve),
  throwDisc: () => throwDisc(),
  foesList: () => state.foes.map(f => ({ pos: { x: +f.pos.x.toFixed(2), z: +f.pos.z.toFixed(2) }, hp: f.hp, hasDisc: f.hasDisc, rotY: +f.obj.rotation.y.toFixed(3) })),
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
    const d = spawnDisc(p, fwd.clone().multiplyScalar(-24), b, config.ORANGE, 0);
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
    state.player.pos.x = x; state.player.pos.z = z; state.player.y = y;
    if (state.countdownTimer > 0) state.countdownTimer = 0;
    if (!state.player.alive || state.player.hp <= 0) { state.player.alive = true; state.player.hp = 100; }
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
  }
};

window.__TRON__ = window.__dbg;

