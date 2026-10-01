import * as THREE from '../../vendor/three.module.js';
import { state, player, touchState } from '../core/state.js';
import { sens } from './mouse.js';

export const moveStartPos = { x: 0, y: 0 };
export const touchMove = { x: 0, y: 0 };

export const lookLastPos = {
  get x() { return touchState.lastLookX; },
  set x(v) { touchState.lastLookX = v; },
  get y() { return touchState.lastLookY; },
  set y(v) { touchState.lastLookY = v; }
};

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
  if (e.target && e.target.closest && e.target.closest('.card')) {
    return;
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

      touchState.lookMomentumX = dX;
      touchState.lookMomentumY = dY;

      const touchSens = state.sens * 2.5;
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
    const touchSens = state.sens * 2.5;

    player.yaw -= touchState.lookMomentumX * touchSens;
    player.pitch = THREE.MathUtils.clamp(
      player.pitch - touchState.lookMomentumY * touchSens * (state.invertY ? -1 : 1),
      -0.6,
      0.55
    );

    if (player.yaw > Math.PI) player.yaw -= Math.PI * 2;
    if (player.yaw < -Math.PI) player.yaw += Math.PI * 2;

    const friction = 1 - Math.pow(0.0001, dt);
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
      if (typeof window !== 'undefined' && window.__tronThrowDisc) {
        window.__tronThrowDisc();
      }
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

export function initTouch(targetWindow = window) {
  joyBase = document.getElementById('joystickBase');
  joyThumb = document.getElementById('joystickThumb');
  targetWindow.addEventListener('touchstart', onTouchStart, { passive: false });
  targetWindow.addEventListener('touchmove', onTouchMove, { passive: false });
  targetWindow.addEventListener('touchend', onTouchEnd, { passive: false });
  targetWindow.addEventListener('touchcancel', onTouchEnd, { passive: false });
  bindMobileButtons();
}
