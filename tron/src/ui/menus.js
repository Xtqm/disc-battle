import { state } from '../core/state.js';
import { tryLock, focusGame, setCursor } from '../input/InputManager.js';
import { requestFullScreen, toggleFullScreen, isFullScreen, bindPauseAndModalEvents } from './modals.js';
import { showJoinInputModal, onClickCreateRoom, onClickConfirmJoin, copyRoomCode, teardownMultiplayer } from '../network/roomManager.js';

export function startMode(mode) {
  state.gameMode = (mode === 'duel' || mode === 'duel_ai') ? 'duel_ai' : mode;
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.style.display = 'none';
  const hm = document.getElementById('hostModal');
  if (hm) hm.style.display = 'none';
  const rm = document.getElementById('roomModal');
  if (rm) rm.style.display = 'none';
  if (typeof window !== 'undefined' && window.__tronResetGame) {
    window.__tronResetGame();
  }
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
  if (typeof document !== 'undefined' && document.pointerLockElement) {
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
  const overlay = document.getElementById('overlay');
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
    const b = document.getElementById(id);
    if (b) {
      b.addEventListener('click', fn);
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
    const overlay = document.getElementById('overlay');
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
    const overlay = document.getElementById('overlay');
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
  bind('hostMatchBtn', openHostModal);
  bind('joinOnlineBtn', openJoinModal);
  bind('duelBtn', startDuelAi);
  bind('btnSwarmSolo', startSwarm);
  bind('btnDuelSolo', (e) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (state.isTouchDevice) {
      toggleFullScreen();
    }
    startSoloDuel();
  });
  bind('joinRoomBtn', openJoinModal);

  // Host setup modal bindings
  const hm = document.getElementById('hostModal');
  const practiceBtn = document.getElementById('practiceBtn');
  if (practiceBtn) {
    practiceBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      startMode('duel_ai');
    };
  }

  const host1v1Btn = document.getElementById('host1v1Btn');
  if (host1v1Btn) {
    host1v1Btn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      onClickCreateRoom(e, '1v1');
    };
  }

  const host2v2Btn = document.getElementById('host2v2Btn');
  if (host2v2Btn) {
    host2v2Btn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (state.isTouchDevice) {
        requestFullScreen();
      }
      if (hm) hm.style.display = 'none';
      onClickCreateRoom(e, '2v2');
    };
  }

  const cancelHostBtn = document.getElementById('cancelHostBtn');
  if (cancelHostBtn) {
    cancelHostBtn.onclick = (e) => {
      e.stopPropagation(); if (e.cancelable) e.preventDefault();
      if (hm) hm.style.display = 'none';
      showModeSelectMenu();
    };
  }

  const btnCopyCode = document.getElementById('btnCopyCode');
  if (btnCopyCode) {
    btnCopyCode.onclick = (e) => {
      e.stopPropagation();
      if (state.currentRoomId) copyRoomCode(state.currentRoomId);
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
      if (hm) hm.style.display = 'none';
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
}

export function bindMenuButtons() {
  bindMainMenuEvents();
  bindPauseAndModalEvents();
}

if (typeof window !== 'undefined') {
  window.__tronShowModeSelect = showModeSelect;
  window.__tronShowModeSelectMenu = showModeSelectMenu;
  window.__tronTeardownMultiplayer = teardownMultiplayer;
}
