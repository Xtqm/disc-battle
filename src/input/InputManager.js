import * as THREE from '../../vendor/three.module.js';
import { state } from '../core/state.js';
import { initKeyboard, onDown, onUp, codeOf, EAT, getPlayerCurveIntent } from './keyboard.js';
import { initMouse, tryLock, isLocked, lockFailed, setCursor, focusGame, look, showSens, sens } from './mouse.js';
import { initTouch, touchMove, moveStartPos, lookLastPos, joyBase, joyThumb, R_STICK, showJoystick, updateJoystick, hideJoystick, updateCurveButtons, updateTouchMomentum, bindMobileButtons } from './touch.js';

export class InputManager {
  static initInput(canvas) {
    initKeyboard(window);
    initMouse(canvas);
    initTouch(window);
  }

  static getMovementWish(fwd, right) {
    const wish = new THREE.Vector3();
    if (state.countdownTimer > 0) return wish;

    if (state.keys.KeyW) wish.add(fwd);
    if (state.keys.KeyS) wish.sub(fwd);
    if (state.keys.KeyD) wish.add(right);
    if (state.keys.KeyA) wish.sub(right);

    if (touchMove.x !== 0 || touchMove.y !== 0) {
      wish.addScaledVector(fwd, -touchMove.y);
      wish.addScaledVector(right, touchMove.x);
    }

    if (wish.lengthSq() > 0) wish.normalize();
    return wish;
  }

  static getStickDeflection() {
    return Math.hypot(touchMove.x, touchMove.y);
  }

  static hasKeyboardMovement() {
    return !!(state.keys.KeyW || state.keys.KeyS || state.keys.KeyA || state.keys.KeyD);
  }

  static getPlayerCurveIntent() {
    return getPlayerCurveIntent();
  }

  static isLocked() {
    return isLocked();
  }

  static tryLock() {
    tryLock();
  }

  static focusGame() {
    focusGame();
  }
}

export const initInput = InputManager.initInput;
export {
  getPlayerCurveIntent,
  codeOf,
  EAT,
  onDown,
  onUp,
  tryLock,
  isLocked,
  lockFailed,
  setCursor,
  focusGame,
  look,
  showSens,
  sens,
  moveStartPos,
  touchMove,
  lookLastPos,
  joyBase,
  joyThumb,
  R_STICK,
  showJoystick,
  updateJoystick,
  hideJoystick,
  updateCurveButtons,
  updateTouchMomentum,
  bindMobileButtons
};
