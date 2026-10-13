/**
 * TrialDebriefModal.js
 * Post-Trial Victory & Debrief Modal for Tron Disc Arena (SPEC-CAMP-001 Phase 2).
 * Displays trial outcome, sequential animated Star ignition (Star 1 -> Star 2 -> Star 3)
 * with procedural audio chimes, itemized Bit & XP payout breakdowns,
 * and direct navigation action controls (NEXT TRIAL, RETRY TRIAL, RETURN TO GRID).
 */

import { campaignRegistry as defaultRegistry } from '../../campaign/CampaignRegistry.js';
import { campaignManager as defaultManager } from '../../campaign/CampaignManager.js';
import { SFX } from '../../audio/sfx.js';
import { state, player } from '../../core/state.js';
import { tryLock, focusGame, setCursor } from '../../input/InputManager.js';

export class TrialDebriefModal {
  /**
   * @param {object} [options]
   * @param {import('../../campaign/CampaignRegistry.js').CampaignRegistry} [options.registry]
   * @param {import('../../campaign/CampaignManager.js').CampaignManager} [options.manager]
   */
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.manager = options.manager || defaultManager;
    this._containerId = 'trialDebriefModal';
    this._activeResult = null;
    this._animationTimers = [];

    this._onNextTrial = null;
    this._onRetryTrial = null;
    this._onReturnToGrid = null;
  }

  get container() {
    return typeof document !== 'undefined' ? document.getElementById(this._containerId) : null;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style.display !== 'none');
  }

  /**
   * Sets callback invoked when NEXT TRIAL is activated.
   * @param {(nextLevelId: string) => void} fn
   */
  setOnNextTrial(fn) {
    this._onNextTrial = fn;
  }

  /**
   * Sets callback invoked when RETRY TRIAL is activated.
   * @param {(levelId: string) => void} fn
   */
  setOnRetryTrial(fn) {
    this._onRetryTrial = fn;
  }

  /**
   * Sets callback invoked when RETURN TO GRID is activated.
   * @param {(gridId: string) => void} fn
   */
  setOnReturnToGrid(fn) {
    this._onReturnToGrid = fn;
  }

  /**
   * Displays the post-trial debrief modal with result telemetry and payouts.
   * @param {object} result Outcome summary from CampaignManager
   */
  show(result) {
    this.clearAnimationTimers();
    this._activeResult = result;

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();

    const el = this.container;
    if (!el) return;

    el.innerHTML = this.render(result);
    el.style.display = 'flex';
    this.bindEvents(el, result);

    // Trigger sequential animated star ignition if victorious
    if (result.success && result.stars > 0) {
      this.animateStarIgnition(result.stars);
    }
  }

  /**
   * Hides the debrief modal and clears pending animation timers.
   */
  hide() {
    this.clearAnimationTimers();
    const el = this.container;
    if (el) {
      el.style.display = 'none';
    }
  }

  clearAnimationTimers() {
    for (const timer of this._animationTimers) {
      clearTimeout(timer);
    }
    this._animationTimers = [];
  }

  /**
   * Generates HTML markup for the debrief modal.
   * @param {object} result
   * @returns {string} HTML markup
   */
  render(result) {
    const levelId = result.levelId;
    const level = this.registry.getLevel(levelId) || { name: 'TRIAL', gridId: 'grid_01' };
    const grid = this.registry.getGrid(level.gridId) || { name: 'SECTOR' };

    const isSuccess = Boolean(result.success);
    const title = isSuccess ? 'TRIAL CLEARED' : 'DEREZZED // SIMULATION FAILED';
    const subtitle = isSuccess
      ? `${level.name} // SECTOR PROTOCOL CONFIRMED`
      : 'PROGRAM INTEGRITY DEPLETED';

    const evalData = result.evaluation || {};
    const metrics = evalData.metrics || {};
    const elapsedSeconds = metrics.elapsedSeconds || result.elapsedSeconds || 0;
    const integrityPercent = typeof metrics.integrityPercent === 'number'
      ? metrics.integrityPercent
      : Math.round((metrics.integrityRatio || 1) * 100);
    const precisionHits = metrics.precisionHits || (metrics.curveHits || 0) + (metrics.ricochetHits || 0);

    const rewards = result.rewards || { bits: 0, xp: 0 };
    const firstTimeClear = Boolean(result.firstTimeClear);
    const totalStars = result.totalStars || this.manager.getTotalStars();

    // Check if next level is available and unlocked
    const nextLevel = this.registry.getNextLevel(levelId);
    const hasNextUnlocked = nextLevel && (
      this.manager.isLevelUnlocked(nextLevel.id) ||
      result.newlyUnlockedGrids?.includes(nextLevel.gridId)
    );

    // Compute itemized rewards breakdown
    const baseBits = rewards.bits;
    const integrityBonusBits = evalData.star2 ? Math.round(baseBits * 0.25) : 0;
    const masteryBonusBits = evalData.star3 ? Math.round(baseBits * 0.35) : 0;
    const totalBitsPayout = baseBits + integrityBonusBits + masteryBonusBits;

    return `
      <div class="campaign-card debrief-card sector-theme-${level.gridId}">
        <div class="campaign-title-group" style="text-align:center; margin-bottom:8px;">
          <h1 style="color:${isSuccess ? 'var(--cyan)' : 'var(--orange)'};">${title}</h1>
          <p>${subtitle}</p>
        </div>

        <!-- Sequential Star Ignition Row -->
        <div class="debrief-stars-row">
          <div id="debriefStar1" class="debrief-star-slot" data-star="1">★</div>
          <div id="debriefStar2" class="debrief-star-slot" data-star="2">★</div>
          <div id="debriefStar3" class="debrief-star-slot" data-star="3">★</div>
        </div>

        <!-- Telemetry Metrics Summary -->
        <div style="display:flex; justify-content:center; gap:24px; margin-bottom:18px; font-family:'Courier New',Courier,monospace; font-size:12px; letter-spacing:1px; color:#8ac0d0;">
          <div>TIME: <b style="color:#fff;">${elapsedSeconds.toFixed(1)}s</b></div>
          <div>INTEGRITY: <b style="color:#fff;">${integrityPercent}%</b></div>
          <div>TRICKSHOTS: <b style="color:#fff;">${precisionHits}</b></div>
        </div>

        <!-- Itemized Payout Breakdown -->
        <div class="debrief-payout-box">
          <div style="font-size:11px; color:var(--cyan); margin-bottom:8px; text-transform:uppercase;">
            // ITEMIZE REWARDS &amp; ACCRUAL
          </div>
          <div class="payout-row">
            <span>BASE CLEAR (${firstTimeClear ? 'FIRST CLEAR' : 'REPEAT CLEAR'}):</span>
            <span>+${baseBits} BITS &nbsp; +${rewards.xp} XP</span>
          </div>
          <div class="payout-row">
            <span>INTEGRITY BONUS (&ge; 75% HP):</span>
            <span style="color:${evalData.star2 ? '#00ffcc' : '#667788'};">+${integrityBonusBits} BITS</span>
          </div>
          <div class="payout-row">
            <span>MASTERY BONUS (TIME/TRICKSHOT):</span>
            <span style="color:${evalData.star3 ? '#00ffcc' : '#667788'};">+${masteryBonusBits} BITS</span>
          </div>
          <div class="payout-row">
            <span>TOTAL YIELD ACCRUED:</span>
            <span>+${totalBitsPayout} BITS</span>
          </div>
        </div>

        <div style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#8ac0d0; margin-bottom:20px;">
          CAMPAIGN PROGRESSION: <b style="color:var(--star-gold);">${totalStars} STARS TOTAL</b>
        </div>

        <!-- Navigation Action Buttons -->
        <div class="debrief-actions" style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          ${isSuccess && hasNextUnlocked ? `
            <button id="btnDebriefNext" class="mode-btn campaign-btn" style="min-width:160px; font-size:13px;">
              NEXT TRIAL ➔
            </button>
          ` : ''}
          <button id="btnDebriefRetry" class="btn" style="border-color:var(--cyan); color:#fff; min-width:140px;">
            RETRY TRIAL
          </button>
          <button id="btnDebriefReturn" class="btn" style="border-color:var(--orange); color:#ffb37a; min-width:160px;">
            RETURN TO GRID
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Executes the sequential star ignition animation with audio chimes.
   * @param {number} earnedStars 1 to 3
   */
  animateStarIgnition(earnedStars) {
    const clampedStars = Math.max(0, Math.min(3, Math.floor(earnedStars)));
    const delays = [250, 650, 1050];

    for (let i = 1; i <= clampedStars; i++) {
      const timer = setTimeout(() => {
        if (typeof document === 'undefined') return;
        const starEl = document.getElementById(`debriefStar${i}`);
        if (starEl) {
          starEl.classList.add('ignited');
          SFX.starIgnite(i);
        }
      }, delays[i - 1]);

      this._animationTimers.push(timer);
    }
  }

  /**
   * Binds interaction events to action buttons.
   * @param {HTMLElement} root
   * @param {object} result
   */
  bindEvents(root, result) {
    if (!root) return;

    const levelId = result.levelId;
    const level = this.registry.getLevel(levelId);
    const gridId = level ? level.gridId : 'grid_01';

    // NEXT TRIAL
    const nextBtn = root.querySelector('#btnDebriefNext');
    if (nextBtn) {
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hide();

        const nextLevel = this.registry.getNextLevel(levelId);
        if (nextLevel && typeof this._onNextTrial === 'function') {
          this._onNextTrial(nextLevel.id);
        } else if (nextLevel) {
          this.executeSceneResetAndLaunch(nextLevel.id);
        }
      };
    }

    // RETRY TRIAL
    const retryBtn = root.querySelector('#btnDebriefRetry');
    if (retryBtn) {
      retryBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hide();

        if (typeof this._onRetryTrial === 'function') {
          this._onRetryTrial(levelId);
        } else {
          this.executeSceneResetAndLaunch(levelId);
        }
      };
    }

    // RETURN TO GRID
    const returnBtn = root.querySelector('#btnDebriefReturn');
    if (returnBtn) {
      returnBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hide();

        if (typeof this._onReturnToGrid === 'function') {
          this._onReturnToGrid(gridId);
        } else if (typeof window !== 'undefined' && window.__tronShowLevelSelectView) {
          window.__tronShowLevelSelectView(gridId);
        }
      };
    }
  }

  /**
   * Resets Three.js arena tiles, disc & bot entities, and launches trial.
   * @param {string} levelId
   */
  executeSceneResetAndLaunch(levelId) {
    const level = this.registry.getLevel(levelId);
    if (!level) return;

    if (typeof window !== 'undefined' && window.__tronResetCampaignRound) {
      window.__tronResetCampaignRound(level);
    } else if (typeof window !== 'undefined' && window.__tronResetGame) {
      window.__tronResetGame();
    }

    this.manager.startTrial(levelId);
    state.gameMode = 'campaign';
    state.campaignLevelId = levelId;

    state.paused = false;
    state.justResumed = true;
    tryLock();
    focusGame();

    if (typeof window !== 'undefined' && window.__tronStartCountdown) {
      window.__tronStartCountdown(3.0, () => {
        if (typeof window !== 'undefined' && window.__tronSpawnCampaignWave) {
          window.__tronSpawnCampaignWave(level, 1);
        }
      });
    }
  }
}

export const trialDebriefModal = new TrialDebriefModal();
