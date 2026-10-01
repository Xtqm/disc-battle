import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';

export let canvas = null;
export let lockFailed = false;

export let sens = 0.0022;
state.sens = sens;
state.invertY = false;
state.steerX = 0;
state.steerY = 0;
state.cursorX = typeof innerWidth !== 'undefined' ? innerWidth / 2 : 0;
state.cursorY = typeof innerHeight !== 'undefined' ? innerHeight / 2 : 0;

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

export const isLocked = () => !!(canvas && typeof document !== 'undefined' && document.pointerLockElement === canvas);

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
    if (typeof document !== 'undefined' && document.pointerLockElement !== canvas) {
      lockFailed = true;
    }
  }, 400);
}

export function setCursor() {
  if (typeof document === 'undefined' || !document.body) return;
  if (state.isTouchDevice) {
    document.body.style.cursor = 'default';
    return;
  }
  const locked = isLocked();
  document.body.style.cursor = (state.running && !state.paused && locked) ? 'none' : 'default';
}

export function focusGame() {
  try { if (typeof window !== 'undefined') window.focus(); } catch (e) {}
  if (canvas) canvas.focus();
}

export function look(dx, dy) {
  state.player.yaw -= dx * sens;
  state.player.pitch = THREE.MathUtils.clamp(state.player.pitch - dy * sens * (state.invertY ? -1 : 1), -0.6, 0.55);
  if (state.player.yaw > Math.PI) state.player.yaw -= Math.PI * 2;
  if (state.player.yaw < -Math.PI) state.player.yaw += Math.PI * 2;
}

export function showSens() {
  const s = document.getElementById('sens');
  if (!s || state.isTouchDevice) return;
  s.textContent = 'SENSITIVITY ' + Math.round(sens / 0.0022 * 100) + '%';
  s.style.opacity = '1';
  clearTimeout(showSens._t);
  showSens._t = setTimeout(() => { if (s) s.style.opacity = '0'; }, 1200);
}

export function initMouse(targetCanvas) {
  canvas = targetCanvas;
  if (!canvas) return;

  canvas.tabIndex = 0;
  canvas.style.outline = 'none';

  canvas.addEventListener('mousedown', () => {
    if (!state.isTouchDevice) {
      focusGame();
      if (lockFailed === false && document.pointerLockElement !== canvas && state.running && !state.paused) {
        tryLock();
      }
    }
  });

  canvas.addEventListener('click', () => {
    if (!state.isTouchDevice && state.running && !isLocked()) {
      tryLock();
    }
  });

  document.addEventListener('pointerlockerror', () => {
    if (!state.isTouchDevice) lockFailed = true;
  });

  document.addEventListener('pointerlockchange', () => {
    if (state.isTouchDevice) return;
    const locked = isLocked();
    if (locked) {
      const um = document.getElementById('unlockedMenu');
      if (um) um.style.display = 'none';
    } else if (state.running && !state.paused && !lockFailed) {
      const isMultiplayer = (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi');
      if (isMultiplayer) {
        const um = document.getElementById('unlockedMenu');
        if (um) um.style.display = 'flex';
      } else {
        if (typeof window !== 'undefined' && window.__tronPauseGame) {
          window.__tronPauseGame();
        }
      }
    }
    setCursor();
  });

  window.addEventListener('mousemove', e => {
    if (state.isTouchDevice) return;
    state.cursorX = e.clientX;
    state.cursorY = e.clientY;
    if (!state.running || state.paused) return;

    if (isLocked()) {
      state.steerX = state.steerY = 0;
      look(e.movementX || 0, e.movementY || 0);
    } else {
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      const dz = 0.08;
      const curve = v => {
        const m = Math.abs(v);
        return m < dz ? 0 : Math.sign(v) * Math.pow((m - dz) / (1 - dz), 1.7);
      };
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
    if (e.button === 0) {
      if (typeof window !== 'undefined' && window.__tronThrowDisc) {
        window.__tronThrowDisc();
      }
    }
    if (e.button === 2) {
      state.player.blocking = true;
    }
  });

  window.addEventListener('mouseup', e => {
    if (state.isTouchDevice) return;
    if (e.button === 2 && !state.touchBlocking) {
      state.player.blocking = false;
    }
  });

  window.addEventListener('contextmenu', e => e.preventDefault());
}
