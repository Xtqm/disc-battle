import { state } from '../core/state.js';
import { updateHUD, message, el, updateCrosshair, updateKeyMonitor, updateLockStateBanner } from './hud.js';
import { startMode, startGame, showModeSelect, showModeSelectMenu, bindMenuButtons, bindMainMenuEvents } from './menus.js';
import { pauseGame, resumeGame, restartMatch, showGameOver, checkOrientation, requestFullScreen, exitFullScreen, toggleFullScreen, isFullScreen, bindPauseAndModalEvents } from './modals.js';

export function shake(v) {
  state.shakeAmt = Math.min(state.shakeAmt + v, 0.8);
}

export class UIManager {
  static updateHUD() {
    updateHUD();
  }

  static message(text) {
    message(text);
  }

  static showGameOver(customTitle, customSubtitle) {
    showGameOver(customTitle, customSubtitle);
  }

  static startMode(mode) {
    startMode(mode);
  }

  static pauseGame() {
    pauseGame();
  }

  static resumeGame() {
    resumeGame();
  }

  static restartMatch() {
    restartMatch();
  }

  static showModeSelect() {
    showModeSelect();
  }

  static shake(v) {
    shake(v);
  }

  static bindMenuButtons() {
    bindMenuButtons();
  }
}

export const UI = UIManager;

export {
  el,
  message,
  updateHUD,
  updateCrosshair,
  updateKeyMonitor,
  updateLockStateBanner,
  startMode,
  startGame,
  showModeSelect,
  showModeSelectMenu,
  bindMainMenuEvents,
  bindMenuButtons,
  pauseGame,
  resumeGame,
  restartMatch,
  showGameOver,
  checkOrientation,
  requestFullScreen,
  exitFullScreen,
  toggleFullScreen,
  isFullScreen,
  bindPauseAndModalEvents
};
