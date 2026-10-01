import { state } from '../core/state.js';
import { tryLock, focusGame, setCursor } from '../input/InputManager.js';
import { el } from './hud.js';

export function requestFullScreen() {
  const elem = document.documentElement;
  try {
    let p;
    if (elem.requestFullscreen) {
      p = elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      p = elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      p = elem.webkitRequestFullscreen();
    } else if (elem.webkitRequestFullScreen) {
      p = elem.webkitRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      p = elem.msRequestFullscreen();
    }
    if (p && typeof p.catch === 'function') {
      p.catch(err => {
        console.warn("Fullscreen request failed or was blocked:", err);
      });
    }
  } catch (err) {
    console.warn("Fullscreen request failed or was blocked:", err);
  }

  try {
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo(0, 1);
    }
  } catch (_) {}
}

export function exitFullScreen() {
  try {
    let p;
    if (document.exitFullscreen) {
      p = document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      p = document.webkitExitFullscreen();
    } else if (document.webkitCancelFullScreen) {
      p = document.webkitCancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      p = document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      p = document.msExitFullscreen();
    }
    if (p && typeof p.catch === 'function') {
      p.catch(err => {
        console.warn("Exit fullscreen failed or was blocked:", err);
      });
    }
  } catch (err) {
    console.warn("Exit fullscreen failed or was blocked:", err);
  }
}

export function isFullScreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.webkitCurrentFullScreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export function toggleFullScreen() {
  if (!isFullScreen()) {
    requestFullScreen();
  } else {
    exitFullScreen();
  }
}

export {
  requestFullScreen as requestFullscreen,
  exitFullScreen as exitFullscreen,
  toggleFullScreen as toggleFullscreen,
  isFullScreen as isFullscreen
};

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

if (typeof window !== 'undefined') {
  window.__tronCheckOrientation = checkOrientation;
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
  if (typeof document !== 'undefined' && document.pointerLockElement) {
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
  if (typeof window !== 'undefined' && window.__tronResetGame) {
    window.__tronResetGame();
  }
  state.paused = false;
  state.justResumed = true;
  tryLock();
  focusGame();
  setCursor();
}

if (typeof window !== 'undefined') {
  window.__tronPauseGame = pauseGame;
  window.__tronResumeGame = resumeGame;
}

export function showGameOver(customTitle, customSubtitle) {
  const overlayEl = document.getElementById('overlay');
  if (overlayEl) overlayEl.style.display = 'flex';
  const title = customTitle || (state.gameMode === 'duel' || state.gameMode === 'duel_ai' ? 'DUEL ELIMINATED' : 'DEREZZED');
  const subtitle = customSubtitle || state.gameOverReason || 'YOUR DISC WAS CLAIMED';
  const stats = (state.gameMode === 'duel' || state.gameMode === 'duel_ai')
    ? `TIERS CLEARED <b style="color:#fff">${(state.duelTier || state.tier || 1) - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${state.score}</b>`
    : `CYCLES SURVIVED <b style="color:#fff">${state.wave - 1}</b> &nbsp;·&nbsp; SCORE <b style="color:#fff">${state.score}</b>`;
  if (overlayEl) {
    overlayEl.innerHTML = `<div class="card dead">
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
      <div style="font-size:15px;letter-spacing:4px;margin-bottom:26px">
        ${stats}
      </div>
      <div class="menu-actions" style="max-width:320px;margin:0 auto">
        <button id="recompileBtn" class="btn">RE-COMPILE (${state.gameMode.toUpperCase()})</button>
        <button id="returnMenuBtn" class="btn" style="border-color:var(--orange);color:#ffb37a">MODE SELECT</button>
      </div>
    </div>`;
  }
  const rc = el('recompileBtn');
  if (rc) rc.onclick = (e) => {
    e.stopPropagation();
    if (state.isTouchDevice) {
      requestFullScreen();
    }
    if (state.player.obj) state.player.obj.visible = true;
    if (overlayEl) overlayEl.style.display = 'none';
    if (typeof window !== 'undefined' && window.__tronResetGame) {
      window.__tronResetGame();
    }
    state.paused = false;
    state.justResumed = true;
    tryLock();
    focusGame();
  };
  const rm = el('returnMenuBtn');
  if (rm) rm.onclick = (e) => {
    e.stopPropagation();
    if (state.player.obj) state.player.obj.visible = true;
    if (typeof window !== 'undefined' && window.__tronShowModeSelectMenu) {
      window.__tronShowModeSelectMenu();
    }
  };
  state.gameOverT = 1;
}

// Button event bindings
export let pauseBtn = null;
export let hudFullscreenBtn = null;
export let fullscreenBtn = null;
export let pauseFullscreenBtn = null;
export let resumeBtn = null;
export let restartBtn = null;
export let modeSelectBtn = null;

export const onFullscreenToggleClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  toggleFullScreen();
};

export const onPauseClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock();
  } else {
    pauseGame();
  }
};

export const onResumeClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  resumeGame();
};

export const onRestartClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (state.isTouchDevice) {
    requestFullScreen();
  }
  restartMatch();
};

export const onModeSelectClick = (e) => {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
  if (typeof window !== 'undefined' && window.__tronShowModeSelect) {
    window.__tronShowModeSelect();
  }
};

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

  const leaveMatchBtn = document.getElementById('leaveMatchBtn');
  if (leaveMatchBtn) {
    leaveMatchBtn.onclick = (e) => {
      e.stopPropagation();
      const um = document.getElementById('unlockedMenu');
      if (um) um.style.display = 'none';
      state.running = false;
      state.paused = false;
      if (typeof window !== 'undefined' && window.__tronTeardownMultiplayer) {
        window.__tronTeardownMultiplayer();
      }
      if (typeof window !== 'undefined' && window.__tronShowModeSelectMenu) {
        window.__tronShowModeSelectMenu();
      }
    };
  }

  const unlockedMenu = document.getElementById('unlockedMenu');
  if (unlockedMenu) {
    unlockedMenu.addEventListener('click', (e) => {
      if (e.target === leaveMatchBtn || (e.target && e.target.closest && e.target.closest('#leaveMatchBtn'))) {
        return;
      }
      if (state.running) {
        tryLock();
      }
    });
  }
}
