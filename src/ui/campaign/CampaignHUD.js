/**
 * CampaignHUD.js
 * Tactical Mission Brief & Live Combat HUD for Tron Disc Arena (SPEC-CAMP-001 Phase 2).
 * Handles the pre-launch mission brief overlay with 3-Star criteria,
 * top-screen in-combat mission objective header with real-time integrity thresholding,
 * and kinetic floating `+Bits` accrual particle indicators on precision trickshot eliminations.
 */

import { campaignRegistry as defaultRegistry } from '../../campaign/CampaignRegistry.js';
import { campaignManager as defaultManager, CampaignEvents } from '../../campaign/CampaignManager.js';
import { SFX } from '../../audio/sfx.js';
import { state, player } from '../../core/state.js';
import { tryLock, focusGame, setCursor } from '../../input/InputManager.js';

export class CampaignHUD {
  /**
   * @param {object} [options]
   * @param {import('../../campaign/CampaignRegistry.js').CampaignRegistry} [options.registry]
   * @param {import('../../campaign/CampaignManager.js').CampaignManager} [options.manager]
   */
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.manager = options.manager || defaultManager;

    this._briefContainerId = 'missionBriefModal';
    this._headerContainerId = 'campaignObjectiveHeader';
    this._floatingContainerId = 'floatingIndicators';

    this._activeLevelId = null;
    this._activeLevelConfig = null;
    this._onCancelBrief = null;
    this._onLaunchTrial = null;

    this._bindCampaignEvents();
  }

  get briefContainer() {
    return typeof document !== 'undefined' ? document.getElementById(this._briefContainerId) : null;
  }

  get headerContainer() {
    return typeof document !== 'undefined' ? document.getElementById(this._headerContainerId) : null;
  }

  get floatingContainer() {
    return typeof document !== 'undefined' ? document.getElementById(this._floatingContainerId) : null;
  }

  /**
   * Sets callback invoked when mission brief is cancelled.
   * @param {() => void} fn
   */
  setOnCancelBrief(fn) {
    this._onCancelBrief = fn;
  }

  /**
   * Sets callback invoked when a trial is launched.
   * @param {(levelId: string) => void} fn
   */
  setOnLaunchTrial(fn) {
    this._onLaunchTrial = fn;
  }

  // ==========================================
  // Tactical Pre-Launch Mission Brief
  // ==========================================

  /**
   * Displays the pre-launch tactical mission brief overlay for a level.
   * @param {string} levelId
   */
  showMissionBrief(levelId) {
    this._activeLevelId = levelId;
    const level = this.registry.getLevel(levelId);
    if (!level) return;
    this._activeLevelConfig = level;

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();

    const el = this.briefContainer;
    if (!el) return;

    el.innerHTML = this.renderMissionBrief(level);
    el.style.display = 'flex';
    this.bindBriefEvents(el);
  }

  /**
   * Hides the mission brief overlay.
   */
  hideMissionBrief() {
    const el = this.briefContainer;
    if (el) {
      el.style.display = 'none';
    }
  }

  /**
   * Generates HTML markup for the mission brief overlay.
   * @param {object} level
   * @returns {string} HTML markup
   */
  renderMissionBrief(level) {
    const grid = this.registry.getGrid(level.gridId) || { name: 'SECTOR' };
    const tierClass = `tier-${(level.difficultyTier || 'recon').toLowerCase()}`;
    const thresholds = level.starThresholds || {};
    const integrityPct = Math.round((thresholds.minIntegrityRatio || 0.75) * 100);
    const targetSeconds = thresholds.targetTimeSeconds || 60;
    const minPrecisionHits = thresholds.minPrecisionHits || 3;

    // Calculate total enemies and wave breakdown
    const waves = level.waves || [];
    let totalEnemies = 0;
    const waveSummary = waves.map(w => {
      const count = (w.enemies || []).reduce((sum, e) => sum + (e.count || 1), 0);
      totalEnemies += count;
      return `WAVE ${w.waveNumber}: ${count} UNITS`;
    }).join(' · ');

    const payouts = level.payouts || {};

    return `
      <div class="campaign-card mission-brief-card sector-theme-${level.gridId}">
        <div class="campaign-header-row" style="margin-bottom:14px;">
          <div class="campaign-title-group">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="node-tier-badge ${tierClass}">${level.difficultyTier}</span>
              <span style="font-size:11px; color:#8ac0d0; font-family:'Courier New',Courier,monospace;">${grid.name}</span>
            </div>
            <h1>${level.name}</h1>
          </div>
          <div style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#ffd700; border:1px solid rgba(255,215,0,0.4); padding:4px 8px; border-radius:4px;">
            FIRST CLEAR: +${payouts.firstClearBits || 100} BITS
          </div>
        </div>

        <p style="font-size:12px; letter-spacing:1px; line-height:1.6; color:#b0d4e4; margin:0 0 16px;">
          ${level.description}
        </p>

        <!-- Wave Composition Intel -->
        <div style="background:rgba(0,10,18,0.7); border:1px solid rgba(79,242,255,0.2); border-radius:6px; padding:10px 14px; margin-bottom:16px; font-family:'Courier New',Courier,monospace; font-size:11px;">
          <span style="color:var(--cyan); font-weight:bold;">HOSTILE SUB-ROUTINES:</span> ${totalEnemies} TOTAL &nbsp;·&nbsp; 
          <span style="color:#8ac0d0;">${waveSummary || '1 WAVE'}</span>
        </div>

        <!-- 3-Star Criteria Breakdown -->
        <div class="brief-criteria-box">
          <div class="brief-criteria-title">// THREE-STAR OBJECTIVE CLEARANCE CRITERIA</div>

          <div class="criteria-item">
            <span class="criteria-star">★</span>
            <div style="flex:1;">
              <b style="color:#fff;">STAR 1: DE-REZ OBJECTIVE</b>
              <div style="font-size:11px; color:#8ac0d0; margin-top:2px;">Neutralize and de-rez all hostile sub-routines in the trial sector.</div>
            </div>
          </div>

          <div class="criteria-item">
            <span class="criteria-star">★</span>
            <div style="flex:1;">
              <b style="color:#fff;">STAR 2: INTEGRITY THRESHOLD</b>
              <div style="font-size:11px; color:#8ac0d0; margin-top:2px;">Complete trial while maintaining at least <b>${integrityPct}%</b> Program Integrity.</div>
            </div>
          </div>

          <div class="criteria-item">
            <span class="criteria-star">★</span>
            <div style="flex:1;">
              <b style="color:#fff;">STAR 3: MASTERY BENCHMARK</b>
              <div style="font-size:11px; color:#8ac0d0; margin-top:2px;">Clear trial in under <b>${targetSeconds}s</b> OR confirm &ge; <b>${minPrecisionHits}</b> Curve/Ricochet hits.</div>
            </div>
          </div>
        </div>

        <!-- Action Controls -->
        <div style="display:flex; justify-content:space-between; gap:16px; margin-top:20px;">
          <button id="btnCancelBrief" class="btn" style="border-color:var(--orange); color:#ffb37a; min-width:160px;">
            CANCEL
          </button>
          <button id="btnLaunchTrial" class="mode-btn campaign-btn" style="flex:1; max-width:320px; font-size:14px; letter-spacing:3px;">
            LAUNCH TRIAL ➔
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Binds interaction events for the mission brief overlay.
   * @param {HTMLElement} root
   */
  bindBriefEvents(root) {
    if (!root) return;

    const cancelBtn = root.querySelector('#btnCancelBrief');
    if (cancelBtn) {
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hideMissionBrief();
        if (typeof this._onCancelBrief === 'function') {
          this._onCancelBrief();
        }
      };
    }

    const launchBtn = root.querySelector('#btnLaunchTrial');
    if (launchBtn) {
      launchBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hideMissionBrief();
        if (this._activeLevelId) {
          this.launchTrial(this._activeLevelId);
        }
      };
    }
  }

  /**
   * Launches the selected campaign trial session.
   * @param {string} levelId
   */
  launchTrial(levelId) {
    SFX.missionBriefSweep();

    // Initialize active trial in CampaignManager
    this.manager.startTrial(levelId);
    state.gameMode = 'campaign';
    state.campaignLevelId = levelId;

    const level = this.registry.getLevel(levelId);
    this._activeLevelConfig = level;

    // Reset Three.js arena / round for campaign mode
    if (typeof window !== 'undefined' && window.__tronResetCampaignRound) {
      window.__tronResetCampaignRound(level);
    } else if (typeof window !== 'undefined' && window.__tronResetGame) {
      window.__tronResetGame();
    }

    // Show tactical in-combat objective header
    this.showObjectiveHeader(levelId);

    // Request pointer lock and start 3.0s countdown
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

    if (typeof this._onLaunchTrial === 'function') {
      this._onLaunchTrial(levelId);
    }
  }

  // ==========================================
  // In-Combat Top Objective Header
  // ==========================================

  /**
   * Displays and initializes the in-combat objective header.
   * @param {string} levelId
   */
  showObjectiveHeader(levelId) {
    const el = this.headerContainer;
    if (!el) return;

    this._activeLevelId = levelId;
    const level = this.registry.getLevel(levelId);
    this._activeLevelConfig = level;

    el.innerHTML = this.renderObjectiveHeader(level);
    el.style.display = 'flex';
  }

  /**
   * Hides the in-combat objective header.
   */
  hideObjectiveHeader() {
    const el = this.headerContainer;
    if (el) {
      el.style.display = 'none';
    }
  }

  /**
   * Generates HTML markup for the in-combat header.
   * @param {object} level
   * @returns {string} HTML markup
   */
  renderObjectiveHeader(level) {
    const totalEnemies = (level?.waves || []).reduce(
      (sum, w) => sum + (w.enemies || []).reduce((s, e) => s + (e.count || 1), 0),
      0
    );

    return `
      <div class="objective-stat-item">
        <span>HOSTILES:</span>
        <span id="objHostiles" class="objective-stat-val">${totalEnemies}</span>
      </div>
      <div style="color:rgba(79,242,255,0.4);">|</div>
      <div class="objective-stat-item">
        <span>INTEGRITY:</span>
        <span id="objIntegrity" class="objective-stat-val objective-integrity-val integrity-safe">100%</span>
      </div>
      <div style="color:rgba(79,242,255,0.4);">|</div>
      <div class="objective-stat-item">
        <span>TRICKSHOTS:</span>
        <span id="objTrickshots" class="objective-stat-val">0 / ${level?.starThresholds?.minPrecisionHits || 3}</span>
      </div>
      <div style="color:rgba(79,242,255,0.4);">|</div>
      <div class="objective-stat-item">
        <span>TIME:</span>
        <span id="objTime" class="objective-stat-val">0.0s</span>
      </div>
    `;
  }

  /**
   * Updates hostiles count in the HUD header.
   * @param {number} remaining
   */
  updateHostiles(remaining) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('objHostiles');
    if (el) {
      el.textContent = Math.max(0, Math.floor(remaining));
    }
  }

  /**
   * Updates live Program Integrity % in the HUD header with threshold coloring.
   * @param {number} hp
   * @param {number} [maxHp=100]
   */
  updateIntegrity(hp, maxHp = 100) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('objIntegrity');
    if (!el) return;

    const ratio = Math.max(0, Math.min(1, hp / (maxHp || 100)));
    const pct = Math.round(ratio * 100);
    el.textContent = `${pct}%`;

    const minRatio = this._activeLevelConfig?.starThresholds?.minIntegrityRatio || 0.75;
    if (ratio >= minRatio) {
      el.classList.add('integrity-safe');
      el.classList.remove('integrity-warning');
    } else {
      el.classList.remove('integrity-safe');
      el.classList.add('integrity-warning');
    }
  }

  /**
   * Updates precision trickshot count and elapsed timer in HUD header.
   * @param {number} precisionHits
   * @param {number} elapsedSeconds
   */
  updateMastery(precisionHits = 0, elapsedSeconds = 0) {
    if (typeof document === 'undefined') return;
    const targetHits = this._activeLevelConfig?.starThresholds?.minPrecisionHits || 3;
    const targetTime = this._activeLevelConfig?.starThresholds?.targetTimeSeconds || 60;

    const elHits = document.getElementById('objTrickshots');
    if (elHits) {
      elHits.textContent = `${precisionHits} / ${targetHits}`;
      if (precisionHits >= targetHits) {
        elHits.style.color = 'var(--star-gold)';
        elHits.style.textShadow = '0 0 10px var(--star-gold)';
      }
    }

    const elTime = document.getElementById('objTime');
    if (elTime) {
      elTime.textContent = `${elapsedSeconds.toFixed(1)}s`;
      if (elapsedSeconds > targetTime && precisionHits < targetHits) {
        elTime.style.color = 'var(--orange)';
      }
    }
  }

  // ==========================================
  // Kinetic Floating +Bits Accrual Indicator
  // ==========================================

  /**
   * Spawns a floating kinetic +Bits accrual indicator.
   * @param {number} amount Number of Bits accrued
   * @param {number|null} [screenX=null] X coordinate or center
   * @param {number|null} [screenY=null] Y coordinate or center
   * @param {string|null} [label=null] Optional trickshot label (e.g. 'CURVE ELIMINATION')
   */
  spawnFloatingBits(amount = 25, screenX = null, screenY = null, label = null) {
    if (typeof document === 'undefined') return;
    const container = this.floatingContainer;
    if (!container) return;

    SFX.bitAccrual();

    const indicator = document.createElement('div');
    indicator.className = 'kinetic-bit-pop';

    const text = label ? `${label} +${amount} BITS` : `+${amount} BITS`;
    indicator.textContent = text;

    const posX = typeof screenX === 'number' ? screenX : (window.innerWidth / 2);
    const posY = typeof screenY === 'number' ? screenY : (window.innerHeight * 0.42);

    indicator.style.left = `${posX}px`;
    indicator.style.top = `${posY}px`;

    // Bound maximum active indicators to 8 to avoid DOM congestion
    if (container.children.length >= 8) {
      container.removeChild(container.firstChild);
    }

    container.appendChild(indicator);

    // Auto-remove on animation completion
    indicator.addEventListener('animationend', () => {
      if (indicator.parentNode === container) {
        container.removeChild(indicator);
      }
    });

    // Fallback cleanup
    setTimeout(() => {
      if (indicator.parentNode === container) {
        container.removeChild(indicator);
      }
    }, 900);
  }

  // ==========================================
  // Campaign Event Binding
  // ==========================================

  _bindCampaignEvents() {
    this.manager.on(CampaignEvents.METRIC_RECORDED, (payload) => {
      if (state.gameMode !== 'campaign') return;

      const metrics = payload?.metrics || {};
      const precisionHits = (metrics.curveHits || 0) + (metrics.ricochetHits || 0);
      const elapsed = this.manager._activeTrial?.startTime
        ? (Date.now() - this.manager._activeTrial.startTime) / 1000
        : 0;

      this.updateMastery(precisionHits, elapsed);
      this.updateIntegrity(metrics.finalHp || player.hp, metrics.maxHp || 100);

      if (payload.type === 'enemyKilled') {
        const remaining = Math.max(0, state.foes.filter(f => f.alive).length);
        this.updateHostiles(remaining);

        // Check trickshot elimination bonus for floating bits
        if (state.lastEliminationTrickshot) {
          const trick = state.lastEliminationTrickshot;
          const bits = trick === 'parry' ? 50 : 25;
          const label = trick.toUpperCase();
          this.spawnFloatingBits(bits, null, null, label);
          state.lastEliminationTrickshot = null;
        }
      }
    });

    this.manager.on(CampaignEvents.TRIAL_COMPLETED, () => {
      this.hideObjectiveHeader();
    });

    this.manager.on(CampaignEvents.TRIAL_FAILED, () => {
      this.hideObjectiveHeader();
    });
  }
}

export const campaignHUD = new CampaignHUD();
