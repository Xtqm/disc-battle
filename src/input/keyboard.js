import { state } from '../core/state.js';

export const EAT = ['Space','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyP','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','F1'];

export function getPlayerCurveIntent() {
  const q = !!state.keys.KeyQ || state.touchCurveL || state.gamepadCurveL;
  const e = !!state.keys.KeyE || state.touchCurveR || state.gamepadCurveR;
  if (q && !e) return -1.0;
  if (e && !q) return 1.0;
  return 0.0;
}

export function codeOf(e) {
  if (e.code) return e.code;
  const k = (e.key || '').toLowerCase();
  if (k === ' ' || k === 'spacebar' || k === 'space') return 'Space';
  if (k === 'escape' || k === 'esc') return 'Escape';
  if (k.length === 1 && k >= 'a' && k <= 'z') return 'Key' + k.toUpperCase();
  if (k === 'shift') return 'ShiftLeft';
  return '';
}

export function onDown(e) {
  const c = codeOf(e);

  // Handle Escape isolation for Grid Authorization Terminal (dismissal restricted to [X] button)
  if (c === 'Escape' && state.authModalOpen) {
    e.preventDefault();
    return;
  }

  // Handle Escape dismissal for Armory Modal
  if (c === 'Escape' && state.armoryModalOpen) {
    e.preventDefault();
    if (typeof window !== 'undefined' && typeof window.__tronCloseArmory === 'function') {
      window.__tronCloseArmory();
    } else {
      const arm = document.getElementById('armoryModal');
      if (arm) arm.style.display = 'none';
      state.armoryModalOpen = false;
      const overlay = document.getElementById('overlay');
      if (overlay) overlay.style.display = 'flex';
    }
    return;
  }

  const isInputTarget = typeof document !== 'undefined' && document.activeElement && 
     (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

  if (isInputTarget || state.authModalOpen || state.armoryModalOpen) {
    return;
  }

  if (!c) return;
  state.keys[c] = true;
  if (EAT.includes(c)) e.preventDefault();
  if (c === 'F1') {
    const m = document.getElementById('keymon');
    if (m) m.style.display = m.style.display === 'block' ? 'none' : 'block';
  }
  if (c === 'KeyP' || c === 'Escape') {
    if (state.running) {
      const now = performance.now();
      if (now - state.lastPauseToggle > 180) {
        state.lastPauseToggle = now;
        if (state.gameMode === 'duel_multi' || state.gameMode === 'duos_multi') {
          e.preventDefault();
          if (typeof document !== 'undefined' && document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else {
          if (state.paused) {
            if (typeof window !== 'undefined' && window.__tronResumeGame) window.__tronResumeGame();
          } else {
            if (typeof window !== 'undefined' && window.__tronPauseGame) window.__tronPauseGame();
          }
        }
      }
    }
  }
}

export function onUp(e) {
  const c = codeOf(e);
  if (c) state.keys[c] = false;
}

export function initKeyboard(target = window) {
  if (typeof window === 'undefined') return;
  target.addEventListener('keydown', onDown, { passive: false, capture: true });
  target.addEventListener('keyup', onUp, { capture: true });
  target.addEventListener('blur', () => {
    for (const k in state.keys) state.keys[k] = false;
    if (!state.touchBlocking) state.player.blocking = false;
  });
}
