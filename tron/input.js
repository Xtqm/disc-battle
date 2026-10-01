import * as THREE from './vendor/three.module.js';
import { state, player, touchState } from './state.js';
import { config } from './config.js';
import { renderer, scene, camera, checkOrientation, key, d, floor, grid, ring, tiles, tileGeo, tileEdgeGeo, tileMatIntact, tileEdgeMatIntact, tileGroup, worldToTile, tileToWorld, getTileAt, findNearestIntactTile, wallMat, glowMat, pillars, pillarSpots, tmp, _discMat, _fwd, _r0, _u0, _uBank, _rBank, _localX, _localY, _duelToP, _duelSide, _duelWant, _duelSafe, _duelCoverDir, _duelLead, _duelAimDir, _duelOrigin, _duelEvade, makeProgram, discGeo, makeDisc, sparks, burst, triggerTileWarning, spawnTileDeRezSparks, updateTiles, getPillarCoverPoint, findBestCoverPillar, updateDuelFoe } from './graphics.js';
import { getAudioCtx, playDeRezSound, playWarningSound, playTileDropSound } from './audio.js';
import { simulatePath, trajLine, bouncePips, impactMark, threatLines, updateThreatPaths, updateTrajectory, resolveCircle, lineOfSight } from './physics.js';
import { mockStore, mockListeners, initMockNetwork, mockDocRef, mockSetDoc, mockGetDoc, mockUpdateDoc, mockOnSnapshot, initNetwork, getRoomRef, roomSetDoc, roomGetDoc, roomUpdateDoc, roomOnSnapshot, generateRoomCode, copyRoomCode, showHostWaitingModal, showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, startMultiplayerDuel, onRoomSnapshot, syncNetworkState, onTileDestabilizedByHost, renderGameOverActions, bindGameOverActions, showMultiplayerVictory, showMultiplayerDefeat, teardownMultiplayer } from './network.js';
import { updateHUD, resetGame, spawnDuelBoss, spawnWave, throwDisc, _ro, aimTarget, aimDir, spawnDisc, damagePlayer, killFoe } from './entities.js';
import { el, msgEl, message, showGameOver, shake, requestFullScreen, toggleFullScreen, isFullScreen } from './ui.js';

state.paused = false;
export let lockFailed = false;
state.lastPauseToggle = 0;
state.justResumed = false;
state.keys = {};
export const EAT = ['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyP','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F1'];

export function getPlayerCurveIntent() {
  const q = !!state.keys.KeyQ || state.touchCurveL;
  const e = !!state.keys.KeyE || state.touchCurveR;
  if (q && !e) return -1.0;
  if (e && !q) return 1.0;
  return 0.0;
}

export function codeOf(e) {
  if (e.code) return e.code;
  const k = (e.key || '').toLowerCase();          // fallback for odd/synthetic events
  if (k === ' ' || k === 'spacebar' || k === 'space') return 'Space';
  if (k === 'escape' || k === 'esc') return 'Escape';
  if (k.length === 1 && k >= 'a' && k <= 'z') return 'Key' + k.toUpperCase();
  if (k === 'shift') return 'ShiftLeft';
  return '';
}
export function onDown(e) {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
  const c = codeOf(e);
  if (!c) return;
  state.keys[c] = true;
  if (EAT.includes(c)) e.preventDefault();        // no page scroll / button re-trigger
  if (c === 'F1') { const m = document.getElementById('keymon'); if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
  if (c === 'KeyP' || c === 'Escape') {
    if (state.running) {
      const now = performance.now();
      if (now - state.lastPauseToggle > 180) {
        state.lastPauseToggle = now;
        if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
          // Multiplayer: only release pointer lock — the pointerlockchange
          // handler is the single source of truth for showing the overlay.
          // Never open the offline pause menu in multiplayer.
          e.preventDefault();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else {
          if (state.paused) {
            resumeGame();
          } else {
            pauseGame();
          }
        }
      }
    }
  }
}
export function onUp(e) { const c = codeOf(e); if (c) state.keys[c] = false; }
// Capture phase on window intercepts all keyboard events across the whole document

export let canvas = null;
export let overlay = null;
export const keys = state.keys;

export function startMode(mode) {
  state.gameMode = (mode === 'duel' || mode === 'duel_ai') ? 'duel_ai' : mode;
  if (!overlay) overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  resetGame();
  state.paused = false;
  state.justResumed = true;
  tryLock();
  focusGame();
}

export function startGame() {
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  startMode(state.gameMode || 'swarm');
}

export function pauseGame() {
  if (!state.running || state.paused) return;
  state.paused = true;
  state.lastPauseToggle = performance.now();
  const pm = document.getElementById('pauseMenu');
  if (pm) {
    pm.style.display = 'flex';
    const card = pm.querySelector('.card');
    if (card) card.scrollTop = 0;
  }
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
}

export function resumeGame() {
  if (!state.running || !state.paused) return;
  state.paused = false;
  state.lastPauseToggle = performance.now();
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  state.justResumed = true;
  tryLock();
  focusGame();
  setCursor();
}

export function restartMatch() {
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  resetGame();
  state.paused = false;
  state.justResumed = true;
  tryLock();
  focusGame();
  setCursor();
}

export function showModeSelect() {
  const pm = document.getElementById('pauseMenu');
  if (pm) pm.style.display = 'none';
  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  state.paused = false;
  state.running = false;
  teardownMultiplayer();
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
  setCursor();
  showModeSelectMenu();
}

export function getMainMenuHtml() {
  return `<div class="card" id="mainMenu">
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
  <div class="mode-select" id="mainMenuButtons">
    <button id="swarmBtn" class="mode-btn swarm-btn">ENTER SWARM (WAVES)</button>
    <button id="hostMatchBtn" class="mode-btn multi-btn">HOST MATCH</button>
    <button id="joinOnlineBtn" class="mode-btn multi-btn">JOIN ONLINE MATCH</button>
    <button id="duelBtn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="btnSwarmSolo" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="btnDuelSolo" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
    <button id="joinRoomBtn" style="display:none;min-width:44px;min-height:44px;" aria-hidden="true"></button>
  </div>
</div>`;
}

export function showModeSelectMenu() {
  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  if (!overlay) overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.innerHTML = getMainMenuHtml();
  const card = overlay.querySelector('.card');
  if (card) card.scrollTop = 0;
  bindMainMenuEvents();
}

export function startSoloSwarm() {
  startMode('swarm');
}

export function startSoloDuel() {
  startMode('duel_ai');
}

export function bindMainMenuEvents() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', fn);
    } else {
      console.warn(`UI Binding Warning: Button #${id} not found.`);
    }
  };

  const startSwarm = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      if (!isFullScreen()) toggleFullScreen();
      else requestFullScreen();
    }
    startSoloSwarm();
  };
  const openHostModal = (e) => {
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (overlay) overlay.style.display = 'none';
    const hm = document.getElementById('hostModal');
    if (hm) {
      hm.style.display = 'flex';
      const card = hm.querySelector('.card');
      if (card) card.scrollTop = 0;
    }
  };
  const openJoinModal = (e) => {
    e.stopPropagation(); if (e.cancelable) e.preventDefault();
    if (overlay) overlay.style.display = 'none';
    showJoinInputModal();
  };
  const startDuelAi = (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      if (!isFullScreen()) toggleFullScreen();
      else requestFullScreen();
    }
    startSoloDuel();
  };

  bind('swarmBtn', startSwarm);
  bind('btnSwarmSolo', (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      toggleFullScreen();
    }
    startSoloSwarm();
  });
  bind('hostMatchBtn', openHostModal);
  bind('joinOnlineBtn', openJoinModal);
  bind('duelBtn', startDuelAi);
  bind('btnDuelSolo', (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      toggleFullScreen();
    }
    startSoloDuel();
  });
  bind('joinRoomBtn', openJoinModal);
}

// Bind pause menu & HUD buttons
export let pauseBtn = null;
export let hudFullscreenBtn = null;
export let fullscreenBtn = null;
export let pauseFullscreenBtn = null;

export const onFullscreenToggleClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  toggleFullScreen();
};

export const onPauseClick = (e) => {
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    // In multiplayer: only release pointer lock, don't pause
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    pauseGame();
  }
};

export let resumeBtn = null;
export const onResumeClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  resumeGame();
};

export let restartBtn = null;
export const onRestartClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  restartMatch();
};

export let modeSelectBtn = null;
export const onModeSelectClick = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); showModeSelect(); };

// Bind room modal buttons
export let btnCopyCode = null;
export let btnConfirmJoin = null;
export let btnCancelRoom = null;
export let joinRoomInput = null;

export function bindPauseAndModalEvents() {
  pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) { pauseBtn.onclick = onPauseClick; pauseBtn.ontouchstart = onPauseClick; }

  fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.onclick = onFullscreenToggleClick;
    fullscreenBtn.ontouchstart = onFullscreenToggleClick;
  }

  hudFullscreenBtn = document.getElementById('hudFullscreenBtn');
  if (hudFullscreenBtn && hudFullscreenBtn !== fullscreenBtn) {
    hudFullscreenBtn.onclick = onFullscreenToggleClick;
    hudFullscreenBtn.ontouchstart = onFullscreenToggleClick;
  }

  pauseFullscreenBtn = document.getElementById('pauseFullscreenBtn');
  if (pauseFullscreenBtn) {
    pauseFullscreenBtn.onclick = onFullscreenToggleClick;
    pauseFullscreenBtn.ontouchstart = onFullscreenToggleClick;
  }

  resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) { resumeBtn.onclick = onResumeClick; }

  restartBtn = document.getElementById('restartBtn');
  if (restartBtn) { restartBtn.onclick = onRestartClick; }

  modeSelectBtn = document.getElementById('modeSelectBtn');
  if (modeSelectBtn) { modeSelectBtn.onclick = onModeSelectClick; }

  btnCopyCode = document.getElementById('btnCopyCode');
  if (btnCopyCode) {
    btnCopyCode.onclick = (e) => {
      e.stopPropagation();
      if (state.currentRoomId) copyRoomCode(state.currentRoomId);
    };
  }

  btnConfirmJoin = document.getElementById('btnConfirmJoin');
  if (btnConfirmJoin) {
    btnConfirmJoin.onclick = (e) => {
      e.stopPropagation();
      onClickConfirmJoin(e);
    };
  }

  btnCancelRoom = document.getElementById('btnCancelRoom');
  if (btnCancelRoom) {
    btnCancelRoom.onclick = (e) => {
      e.stopPropagation();
      teardownMultiplayer();
      const rm = document.getElementById('roomModal');
      if (rm) rm.style.display = 'none';
      const hm = document.getElementById('hostModal');
      if (hm) hm.style.display = 'none';
      showModeSelectMenu();
    };
  }

  // Host setup modal bindings
  const hm = document.getElementById('hostModal');
  const practiceBtn = document.getElementById('practiceBtn');
  if (practiceBtn) {
    const onPractice = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      startMode('duel_ai');
    };
    practiceBtn.onclick = onPractice;
  }

  const host1v1Btn = document.getElementById('host1v1Btn');
  if (host1v1Btn) {
    const onHost1v1 = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      onClickCreateRoom(e, '1v1');
    };
    host1v1Btn.onclick = onHost1v1;
  }

  const host2v2Btn = document.getElementById('host2v2Btn');
  if (host2v2Btn) {
    const onHost2v2 = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      onClickCreateRoom(e, '2v2');
    };
    host2v2Btn.onclick = onHost2v2;
  }

  const cancelHostBtn = document.getElementById('cancelHostBtn');
  if (cancelHostBtn) {
    const onCancelHost = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (hm) hm.style.display = 'none';
      showModeSelectMenu();
    };
    cancelHostBtn.onclick = onCancelHost;
  }

  joinRoomInput = document.getElementById('joinRoomInput');
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

  const leaveMatchBtn = document.getElementById('leaveMatchBtn');
  if (leaveMatchBtn) {
    leaveMatchBtn.onclick = (e) => {
      e.stopPropagation();
      const um = document.getElementById('unlockedMenu');
      if (um) um.style.display = 'none';
      state.running = false;
      state.paused = false;
      teardownMultiplayer();
      showModeSelectMenu();
    };
  }

  // Clicking the unlocked overlay (anywhere except Leave button) re-locks the pointer.
  // The pointerlockchange handler will then hide the overlay automatically.
  const unlockedMenu = document.getElementById('unlockedMenu');
  if (unlockedMenu) {
    unlockedMenu.addEventListener('click', (e) => {
      // Don't re-lock if clicking the Leave button
      if (e.target === leaveMatchBtn || (e.target && e.target.closest && e.target.closest('#leaveMatchBtn'))) {
        return;
      }
      // Re-request pointer lock on the canvas
      if (canvas && state.running) {
        tryLock();
      }
    });
  }
}

export function bindMenuButtons() {
  bindMainMenuEvents();
  bindPauseAndModalEvents();
}

// Pointer lock can throw synchronously (SecurityError) inside sandboxed/permission-less
// iframes, and can also fail async. Both paths just enable the cursor-steering fallback.
export function tryLock() {
  if (state.isTouchDevice) return;
  if (!canvas) return;
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
export function setCursor() {
  if (state.isTouchDevice) {
    document.body.style.cursor = 'default';
    return;
  }
  const locked = !!(canvas && document.pointerLockElement === canvas);
  document.body.style.cursor = (state.running && !state.paused && locked) ? 'none' : 'default';
}

export function focusGame() {
  try { window.focus(); } catch (e) {}
  if (canvas) canvas.focus();
}


export let sens = 0.0022;
state.sens = sens;
state.invertY = false;
state.steerX = 0, state.steerY = 0;                 // joystick steering (unlocked mode)
state.cursorX = innerWidth / 2, state.cursorY = innerHeight / 2;
export const isLocked = () => !!(canvas && document.pointerLockElement === canvas);

if (typeof window !== 'undefined') {
  window.sens = sens;
}

Object.defineProperty(state, 'sens', {
  get() { return sens; },
  set(v) {
    sens = v;
    if (typeof window !== 'undefined') window.sens = v;
  },
  configurable: true,
  enumerable: true
});

export { touchState };

export function look(dx, dy) {
  state.player.yaw   -= dx * sens;
  state.player.pitch  = THREE.MathUtils.clamp(state.player.pitch - dy * sens * (state.invertY ? -1 : 1), -0.6, 0.55);
  if (state.player.yaw >  Math.PI) state.player.yaw -= Math.PI * 2;
  if (state.player.yaw < -Math.PI) state.player.yaw += Math.PI * 2;
}



export function showSens() {
  const s = document.getElementById('sens');
  if (!s || state.isTouchDevice) return;
  s.textContent = 'SENSITIVITY ' + Math.round(sens / 0.0022 * 100) + '%';
  s.style.opacity = 1; clearTimeout(showSens._t);
  showSens._t = setTimeout(() => s.style.opacity = 0, 1200);
}


state.moveTouchId = null;
export const moveStartPos = { x: 0, y: 0 };
export const touchMove = { x: 0, y: 0 }; // normalized: x: [-1, 1], y: [-1, 1]

state.lookTouchId = null;
export const lookLastPos = {
  get x() { return touchState.lastLookX; },
  set x(v) { touchState.lastLookX = v; },
  get y() { return touchState.lastLookY; },
  set y(v) { touchState.lastLookY = v; }
};

state.touchJumpHeld = false;
state.touchDashRequested = false;
state.touchBlocking = false;
state.touchCurveL = false;
state.touchCurveR = false;

export let joyBase = null;
export let joyThumb = null;
export const R_STICK = 52; // radius in px

export function showJoystick(x, y) {
  if (!joyBase) joyBase = document.getElementById('joystickBase');
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
  if (!joyBase) return;
  joyBase.style.left = `${x}px`;
  joyBase.style.top = `${y}px`;
  joyBase.style.opacity = '1';
  joyBase.style.transform = 'scale(1)';
  if (joyThumb) joyThumb.style.transform = 'translate3d(0, 0, 0)';
}

export function updateJoystick(x, y) {
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
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

export function hideJoystick() {
  if (!joyBase) joyBase = document.getElementById('joystickBase');
  if (!joyThumb) joyThumb = document.getElementById('joystickThumb');
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

export function updateCurveButtons() {
  const btnCurveL = document.getElementById('btnCurveL');
  const btnCurveR = document.getElementById('btnCurveR');
  if (btnCurveL) btnCurveL.classList.toggle('active', state.touchCurveL);
  if (btnCurveR) btnCurveR.classList.toggle('active', state.touchCurveR);
}

export function onTouchStart(e) {
  // If the user is touching a UI modal card, let the browser handle the native scroll
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
  }

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.target && t.target.closest && t.target.closest('.touch-btn, .hud-btn, .btn, .mode-btn')) continue;
    if (!state.running || state.paused) continue;

    if (t.clientX < window.innerWidth * 0.45 && state.moveTouchId === null) {
      state.moveTouchId = t.identifier;
      moveStartPos.x = t.clientX;
      moveStartPos.y = t.clientY;
      touchMove.x = 0;
      touchMove.y = 0;
      showJoystick(t.clientX, t.clientY);
      e.preventDefault();
    } else if (t.clientX >= window.innerWidth * 0.45) {
      // Clear residual momentum immediately when touching the look zone
      touchState.lookMomentumX = 0;
      touchState.lookMomentumY = 0;
      if (state.lookTouchId === null) {
        state.lookTouchId = t.identifier;
        touchState.lastLookX = t.clientX;
        touchState.lastLookY = t.clientY;
        e.preventDefault();
      }
    }
  }
}

export function onTouchMove(e) {
  // If the user is touching a UI modal card, let the browser handle the native scroll
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return; // Do not call e.preventDefault() here!
  }

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.identifier === state.moveTouchId) {
      e.preventDefault();
      updateJoystick(t.clientX, t.clientY);
    } else if (t.identifier === state.lookTouchId) {
      e.preventDefault();
      const dX = t.clientX - touchState.lastLookX;
      const dY = t.clientY - touchState.lastLookY;

      touchState.lastLookX = t.clientX;
      touchState.lastLookY = t.clientY;

      // Store the raw deltas as momentum
      touchState.lookMomentumX = dX;
      touchState.lookMomentumY = dY;

      // Apply immediate rotation
      const touchSens = sens * 2.5;
      player.yaw -= dX * touchSens;
      player.pitch = THREE.MathUtils.clamp(
        player.pitch - dY * touchSens * (state.invertY ? -1 : 1),
        -0.6,
        0.55
      );
      if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
      if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;
    }
  }
}

export function onTouchEnd(e) {
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
  }
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.target && t.target.closest && t.target.closest('.card')) continue;
    if (t.identifier === state.moveTouchId) {
      state.moveTouchId = null;
      hideJoystick();
    } else if (t.identifier === state.lookTouchId) {
      state.lookTouchId = null;
    }
  }
}

export function updateTouchMomentum(dt) {
  if (!state.player.alive) return;
  if (touchState.lookId === null && (Math.abs(touchState.lookMomentumX) > 0.1 || Math.abs(touchState.lookMomentumY) > 0.1)) {
    const touchSens = sens * 2.5;

    // Apply the residual momentum
    player.yaw -= touchState.lookMomentumX * touchSens;
    player.pitch = THREE.MathUtils.clamp(
      player.pitch - touchState.lookMomentumY * touchSens * (state.invertY ? -1 : 1),
      -0.6,
      0.55
    );

    // Wrap yaw safely
    if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
    if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;

    // Apply friction (deceleration)
    const friction = 1 - Math.pow(0.0001, dt); // Adjust exponent to tune sliding distance
    touchState.lookMomentumX *= (1 - friction);
    touchState.lookMomentumY *= (1 - friction);

    if (Math.abs(touchState.lookMomentumX) <= 0.1 && Math.abs(touchState.lookMomentumY) <= 0.1) {
      touchState.lookMomentumX = 0;
      touchState.lookMomentumY = 0;
    }
  }
}


export function bindMobileButtons() {
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
      state.touchJumpHeld = true;
      state.player.jumpBuf = 0.15;
      btnJump.classList.add('pressed');
    };
    const endJump = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchJumpHeld = false;
      btnJump.classList.remove('pressed');
    };
    btnJump.addEventListener('touchstart', startJump, { passive: false });
    btnJump.addEventListener('touchend', endJump, { passive: false });
    btnJump.addEventListener('touchcancel', endJump, { passive: false });
  }

  if (btnDash) {
    const doDash = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchDashRequested = true;
      btnDash.classList.add('pressed');
      setTimeout(() => btnDash.classList.remove('pressed'), 140);
    };
    btnDash.addEventListener('touchstart', doDash, { passive: false });
    btnDash.addEventListener('click', doDash);
  }

  if (btnBlock) {
    const startBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchBlocking = true;
      state.player.blocking = true;
      btnBlock.classList.add('pressed');
    };
    const endBlock = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchBlocking = false;
      state.player.blocking = false;
      btnBlock.classList.remove('pressed');
    };
    btnBlock.addEventListener('touchstart', startBlock, { passive: false });
    btnBlock.addEventListener('touchend', endBlock, { passive: false });
    btnBlock.addEventListener('touchcancel', endBlock, { passive: false });
  }

  if (btnCurveL) {
    const doCurveL = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchCurveL = !state.touchCurveL;
      if (state.touchCurveL) state.touchCurveR = false;
      updateCurveButtons();
    };
    btnCurveL.addEventListener('touchstart', doCurveL, { passive: false });
    btnCurveL.addEventListener('click', doCurveL);
  }

  if (btnCurveR) {
    const doCurveR = (e) => {
      e.preventDefault(); e.stopPropagation();
      state.touchCurveR = !state.touchCurveR;
      if (state.touchCurveR) state.touchCurveL = false;
      updateCurveButtons();
    };
    btnCurveR.addEventListener('touchstart', doCurveR, { passive: false });
    btnCurveR.addEventListener('click', doCurveR);
  }
}



export function initTouchControls(canvas) {
  joyBase = document.getElementById('joystickBase');
  joyThumb = document.getElementById('joystickThumb');
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: false });
  window.addEventListener('touchcancel', onTouchEnd, { passive: false });
  bindMobileButtons();
}

export function initInput(canvasOrRenderer) {
  const c = canvasOrRenderer?.domElement || canvasOrRenderer;
  if (!c) {
    console.error("initInput error: canvas element is undefined");
    return;
  }
  canvas = c;
  overlay = document.getElementById('overlay');

  // 1. Setup Canvas Focus
  canvas.tabIndex = 0;
  canvas.style.outline = 'none';

  // 2. Attach Canvas-Specific Listeners
  canvas.addEventListener('mousedown', () => { 
    if (!state.isTouchDevice) { 
      focusGame(); 
      if (lockFailed === false && document.pointerLockElement !== canvas && state.running && !state.paused) {
        tryLock();
      } 
    } 
  });
  canvas.addEventListener('click', () => { if (!state.isTouchDevice && state.running && !isLocked()) tryLock(); });

  // 3. Attach Window / Document Listeners
  window.addEventListener('keydown', onDown, { passive: false, capture: true });
  window.addEventListener('keyup', onUp, { capture: true });
  window.addEventListener('blur', () => { for (const k in state.keys) state.keys[k] = false; if (!state.touchBlocking) state.player.blocking = false; });  // no stuck keys

  document.addEventListener('pointerlockerror', () => { if (!state.isTouchDevice) lockFailed = true; });
  document.addEventListener('pointerlockchange', () => {
    if (state.isTouchDevice) return;
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      // Pointer lock acquired — always hide the multiplayer unlock overlay
      const um = document.getElementById('unlockedMenu');
      if (um) um.style.display = 'none';
    } else if (state.running && !state.paused && !lockFailed) {
      // Pointer lock lost while game is active
      const isMultiplayer = (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi');
      if (isMultiplayer) {
        // Multiplayer: show lightweight overlay, keep simulation running
        const um = document.getElementById('unlockedMenu');
        if (um) um.style.display = 'flex';
      } else {
        // Solo: open the full pause menu
        pauseGame();
      }
    }
    setCursor();
  });
  window.addEventListener('mousemove', e => {
    if (state.isTouchDevice) return;
    state.cursorX = e.clientX; state.cursorY = e.clientY;
    if (!state.running || state.paused) return;
  
    if (isLocked()) {
      state.steerX = state.steerY = 0;
      look(e.movementX || 0, e.movementY || 0);
    } else {
      const nx = (e.clientX / innerWidth)  * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      const dz = 0.08;
      const curve = v => { const m = Math.abs(v); return m < dz ? 0 : Math.sign(v) * Math.pow((m - dz) / (1 - dz), 1.7); };
      state.steerX = curve(nx);
      state.steerY = 0;
      state.player.pitch = THREE.MathUtils.clamp(-ny * 0.5, -0.6, 0.55);
    }
  });
  window.addEventListener('wheel', e => {
    if (!state.running) return;
    state.sens = THREE.MathUtils.clamp(state.sens * (e.deltaY > 0 ? 0.9 : 1.1), 0.0006, 0.012);
    showSens();
  }, { passive: true });
  window.addEventListener('mousedown', e => {
    if (state.isTouchDevice || !state.running || state.paused) return;
    if (e.button === 0) throwDisc();
    if (e.button === 2) state.player.blocking = true;
  });
  window.addEventListener('mouseup', e => {
    if (state.isTouchDevice) return;
    if (e.button === 2 && !state.touchBlocking) state.player.blocking = false;
  });
  window.addEventListener('contextmenu', e => e.preventDefault());

  // Setup touch listeners if mobile
  initTouchControls(canvas);
}

export { requestFullScreen, toggleFullScreen, isFullScreen } from './ui.js';
