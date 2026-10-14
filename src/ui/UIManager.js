import { state } from '../core/state.js';
import { updateHUD, message, el, updateCrosshair, updateKeyMonitor, updateLockStateBanner, showFloatingNeonBits } from './hud.js';
export { showFloatingNeonBits };
import { startMode, startGame, showModeSelect, showModeSelectMenu, bindMenuButtons, bindMainMenuEvents } from './menus.js';
import { pauseGame, resumeGame, restartMatch, showGameOver, checkOrientation, requestFullScreen, exitFullScreen, toggleFullScreen, isFullScreen, bindPauseAndModalEvents } from './modals.js';
import { updateIdentityHeader, showAuthTerminal, hideAuthTerminal, initAuthTerminal } from './authTerminal.js';
import { gridSelectorModal, levelSelectView, campaignHUD, trialDebriefModal } from './campaign/index.js';
import { armoryModal } from './modals/ArmoryModal.js';

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

  static showCampaign() {
    gridSelectorModal.show();
  }

  static showLevelSelect(gridId) {
    levelSelectView.show(gridId);
  }

  static showMissionBrief(levelId) {
    campaignHUD.showMissionBrief(levelId);
  }

  static showTrialDebrief(result) {
    trialDebriefModal.show(result);
  }

  static showArmory(category) {
    armoryModal.show(category);
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
  bindPauseAndModalEvents,
  updateIdentityHeader,
  showAuthTerminal,
  hideAuthTerminal,
  initAuthTerminal,
  gridSelectorModal,
  levelSelectView,
  campaignHUD,
  trialDebriefModal,
  armoryModal
};


