/**
 * AchievementsModal.js
 * Diegetic Trophy Matrix & Achievement Progression Screen
 * for Tron Disc Arena (SPEC-ACHIEVE-001 Phase 2).
 */

import { achievementManager as defaultAchievementManager } from '../../achievements/AchievementManager.js';
import { storageManager as defaultStorageManager } from '../../core/storage/StorageManager.js';
import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';

export class AchievementsModal {
  /**
   * @param {object} [options]
   * @param {import('../../achievements/AchievementManager.js').AchievementManager} [options.achievements]
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [options.storage]
   */
  constructor(options = {}) {
    this.achievements = options.achievements || defaultAchievementManager;
    this.storage = options.storage || defaultStorageManager;

    this._containerId = 'achievementsModal';
    this._onBackToMenu = null;
    this._keyHandler = null;

    if (typeof window !== 'undefined') {
      window.__tronCloseAchievements = () => this.hide();
    }
  }

  get container() {
    if (typeof document === 'undefined') return null;
    if (this._customContainer) return this._customContainer;
    let el = document.getElementById(this._containerId);
    if (!el && typeof document.createElement === 'function') {
      el = document.createElement('div');
      el.id = this._containerId;
      el.className = 'achievements-modal modal-overlay';
      el.style.display = 'none';
      if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style && el.style.display !== 'none');
  }

  setOnBackToMenu(callback) {
    this._onBackToMenu = callback;
  }

  /**
   * Displays the Achievements screen and binds interactions.
   */
  show() {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();
    state.achievementsModalOpen = true;

    const el = this.container;
    if (!el) return;

    el.innerHTML = this.render();
    el.style.display = 'flex';

    this.bindEvents(el);
  }

  /**
   * Dismisses the modal and notifies listeners.
   */
  hide(options = {}) {
    const wasOpen = state.achievementsModalOpen;
    state.achievementsModalOpen = false;
    const el = this.container;
    if (el) {
      el.style.display = 'none';
    }

    if (this._keyHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    if (wasOpen && !options.skipMenuCallback && typeof this._onBackToMenu === 'function') {
      this._onBackToMenu();
    }
  }

  /**
   * Renders the complete HTML string for the Trophy Matrix modal.
   * @returns {string}
   */
  render() {
    const stats = this.achievements.getCompletionStats();
    const matrix = this.achievements.getMatrixStatus();

    // Render cards
    const cardsHtml = matrix.map((ach) => this.renderAchievementCard(ach)).join('');

    return `
      <div class="trophy-matrix-card" style="
        width: min(92vw, 920px);
        max-height: 88vh;
        background: rgba(0, 10, 20, 0.95);
        border: 2px solid #00f3ff;
        border-radius: 8px;
        box-shadow: 0 0 35px rgba(0, 243, 255, 0.45), inset 0 0 20px rgba(0, 243, 255, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #ffffff;
      ">
        <!-- Header -->
        <div style="
          padding: 18px 24px;
          border-bottom: 1px solid rgba(0, 243, 255, 0.3);
          background: rgba(0, 243, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div>
            <div style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #00f3ff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.6);">
              TROPHY MATRIX // ACHIEVEMENTS
            </div>
            <div style="font-size: 11px; color: #88bbcc; letter-spacing: 1px; margin-top: 3px;">
              SYSTEM SUBSYSTEM MILESTONES &amp; PERFORMANCE RECOGNITION
            </div>
          </div>
          ${!this._inHub ? `
          <button id="achievementsCloseBtn" style="
            background: rgba(255, 0, 85, 0.15);
            border: 1px solid #ff0055;
            color: #ff3377;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            letter-spacing: 1px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(255,0,85,0.3)'" onmouseout="this.style.background='rgba(255,0,85,0.15)'">
            [ ESC // CLOSE ]
          </button>
          ` : ''}
        </div>

        <!-- Completion Summary Bar -->
        <div style="
          padding: 14px 24px;
          background: rgba(0, 18, 32, 0.7);
          border-bottom: 1px solid rgba(0, 243, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 8px;
        ">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; letter-spacing: 1px;">
            <span style="color: #00f3ff;">OVERALL SYNCHRONIZATION: ${stats.unlocked} / ${stats.total} PROTOCOLS</span>
            <span style="color: #ffaa00;">${stats.percentage}% COMPLETED</span>
          </div>
          <div style="
            width: 100%;
            height: 10px;
            background: rgba(0, 243, 255, 0.15);
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid rgba(0, 243, 255, 0.3);
          ">
            <div style="
              width: ${stats.percentage}%;
              height: 100%;
              background: linear-gradient(90deg, #00f3ff, #ffaa00);
              box-shadow: 0 0 10px #00f3ff;
              transition: width 0.4s ease;
            "></div>
          </div>
        </div>

        <!-- Trophy Matrix Grid Scrollable Content -->
        <div id="trophyCardsList" style="
          flex: 1;
          overflow-y: auto;
          padding: 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        ">
          ${cardsHtml}
        </div>

        <!-- Footer / Return Button -->
        <div style="
          padding: 14px 24px;
          border-top: 1px solid rgba(0, 243, 255, 0.3);
          background: rgba(0, 14, 26, 0.9);
          display: flex;
          justify-content: flex-end;
        ">
          <button id="achievementsReturnBtn" class="mode-btn" style="
            background: rgba(0, 243, 255, 0.12);
            border: 1px solid #00f3ff;
            color: #00f3ff;
            padding: 8px 22px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 1.5px;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(0, 243, 255, 0.2);
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(0,243,255,0.25)'" onmouseout="this.style.background='rgba(0,243,255,0.12)'">
            RETURN TO MAIN MENU
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renders an individual achievement item row/card.
   * @param {object} ach
   * @returns {string}
   */
  renderAchievementCard(ach) {
    const isUnlocked = Boolean(ach.unlocked);
    const progress = ach.progress || { current: 0, target: 1, ratio: 0, satisfied: false };
    const pct = Math.round(progress.ratio * 100);

    const borderColor = isUnlocked ? '#00f3ff' : 'rgba(0, 243, 255, 0.25)';
    const bgColor = isUnlocked ? 'rgba(0, 243, 255, 0.08)' : 'rgba(0, 15, 25, 0.6)';
    const titleColor = isUnlocked ? '#ffffff' : '#99bbcc';

    // Reward preview pills
    let rewardPreview = '';
    if (ach.reward?.bits > 0) {
      rewardPreview += `<span style="background:rgba(255,170,0,0.15); border:1px solid #ffaa00; color:#ffaa00; padding:2px 8px; border-radius:3px; font-size:11px; font-weight:bold;">+${ach.reward.bits} BITS</span>`;
    }
    if (ach.reward?.cosmetic) {
      const cosmeticTitle = ach.reward.cosmetic.displayName || ach.reward.cosmetic.itemId;
      rewardPreview += `<span style="background:rgba(255,0,85,0.15); border:1px solid #ff0055; color:#ff3377; padding:2px 8px; border-radius:3px; font-size:11px; font-weight:bold;">SKIN: ${cosmeticTitle.toUpperCase()}</span>`;
    }

    const statusBadge = isUnlocked
      ? `<span style="color:#00f3ff; font-weight:bold; font-size:11px; letter-spacing:1px; background:rgba(0,243,255,0.15); padding:3px 8px; border-radius:3px; border:1px solid #00f3ff;">[ UNLOCKED ]</span>`
      : `<span style="color:#668899; font-weight:bold; font-size:11px; letter-spacing:1px; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:3px; border:1px solid rgba(255,255,255,0.15);">[ LOCKED ]</span>`;

    return `
      <div class="achievement-card" style="
        border: 1px solid ${borderColor};
        background: ${bgColor};
        border-radius: 6px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: ${isUnlocked ? '0 0 14px rgba(0,243,255,0.2)' : 'none'};
      ">
        <!-- Icon Glyph -->
        <div style="
          font-size: 26px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${isUnlocked ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
          border: 1px solid ${isUnlocked ? '#00f3ff' : 'rgba(255, 255, 255, 0.15)'};
          border-radius: 6px;
          flex-shrink: 0;
        ">
          ${ach.icon || '⚡'}
        </div>

        <!-- Details -->
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 15px; font-weight: bold; color: ${titleColor}; letter-spacing: 0.5px;">
              ${ach.title}
            </span>
            ${statusBadge}
          </div>
          <div style="font-size: 12px; color: #77aacc; margin-bottom: 8px;">
            ${ach.description}
          </div>

          <!-- Progress Bar & Target Display -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="
              flex: 1;
              height: 6px;
              background: rgba(0, 243, 255, 0.1);
              border-radius: 3px;
              overflow: hidden;
              border: 1px solid rgba(0, 243, 255, 0.2);
            ">
              <div style="
                width: ${pct}%;
                height: 100%;
                background: ${isUnlocked ? '#00f3ff' : '#00aaee'};
                box-shadow: ${isUnlocked ? '0 0 6px #00f3ff' : 'none'};
              "></div>
            </div>
            <span style="font-size: 11px; color: ${isUnlocked ? '#00f3ff' : '#668899'}; font-weight: bold; min-width: 65px; text-align: right;">
              ${progress.current} / ${progress.target}
            </span>
          </div>
        </div>

        <!-- Reward Preview Column -->
        <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0;">
          ${rewardPreview}
        </div>
      </div>
    `;
  }

  /**
   * Binds click and keyboard events.
   * @param {HTMLElement} root
   */
  bindEvents(root) {
    const closeBtn = root.querySelector('#achievementsCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        if (this._inHub && typeof this._onHubClose === 'function') {
          this._onHubClose();
        } else {
          this.hide();
        }
      };
    }

    const returnBtn = root.querySelector('#achievementsReturnBtn');
    if (returnBtn) {
      returnBtn.onclick = (e) => {
        e.stopPropagation();
        if (this._inHub && typeof this._onHubClose === 'function') {
          this._onHubClose();
        } else {
          this.hide();
        }
      };
    }

    if (typeof window !== 'undefined') {
      if (this._keyHandler) {
        window.removeEventListener('keydown', this._keyHandler);
      }
      this._keyHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          e.preventDefault();
          this.hide();
        }
      };
      window.addEventListener('keydown', this._keyHandler);
    }
  }
}

export const achievementsModal = new AchievementsModal();
