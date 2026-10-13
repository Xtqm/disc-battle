/**
 * LevelSelectView.js
 * Level Node Matrix View for Tron Disc Arena (SPEC-CAMP-001 Phase 2).
 * Displays sequential trial nodes leading to the final Rival Arbiter boss node,
 * presenting earned stars (1 to 3), personal best telemetry, difficulty tier badges,
 * and lock states with breadcrumb navigation back to sector selection.
 */

import { campaignRegistry as defaultRegistry } from '../../campaign/CampaignRegistry.js';
import { campaignManager as defaultManager } from '../../campaign/CampaignManager.js';
import { SFX } from '../../audio/sfx.js';
import { setCursor } from '../../input/InputManager.js';

export class LevelSelectView {
  /**
   * @param {object} [options]
   * @param {import('../../campaign/CampaignRegistry.js').CampaignRegistry} [options.registry]
   * @param {import('../../campaign/CampaignManager.js').CampaignManager} [options.manager]
   */
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.manager = options.manager || defaultManager;
    this._containerId = 'levelSelectModal';
    this._currentGridId = 'grid_01';
    this._onSelectLevel = null;
    this._onBackToGridSelector = null;
  }

  get container() {
    return typeof document !== 'undefined' ? document.getElementById(this._containerId) : null;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style.display !== 'none');
  }

  /**
   * Sets callback invoked when an unlocked level node is selected.
   * @param {(levelId: string) => void} fn
   */
  setOnSelectLevel(fn) {
    this._onSelectLevel = fn;
  }

  /**
   * Sets callback invoked when navigating back to the Grid Selector.
   * @param {() => void} fn
   */
  setOnBackToGridSelector(fn) {
    this._onBackToGridSelector = fn;
  }

  /**
   * Displays the Level Node Matrix for the given Grid.
   * @param {string} [gridId]
   */
  show(gridId = null) {
    if (gridId) {
      this._currentGridId = gridId;
    }

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();

    const el = this.container;
    if (!el) return;

    el.innerHTML = this.render(this._currentGridId);
    el.style.display = 'flex';
    this.bindEvents(el);
  }

  /**
   * Hides the Level Select modal.
   */
  hide() {
    const el = this.container;
    if (el) {
      el.style.display = 'none';
    }
  }

  /**
   * Generates HTML markup for the level node matrix of the active Grid.
   * @param {string} gridId
   * @returns {string} HTML markup
   */
  render(gridId = this._currentGridId) {
    const grid = this.registry.getGrid(gridId) || this.registry.getAllGrids()[0];
    this._currentGridId = grid.id;

    const levels = grid.levels || [];
    const totalStars = this.manager.getTotalStars();
    const maxGridStars = levels.length * 3;

    let earnedGridStars = 0;
    for (const level of levels) {
      const rec = this.manager.getLevelRecord(level.id);
      earnedGridStars += rec?.stars || 0;
    }

    const themeClass = `sector-theme-${grid.id}`;

    const nodesHtml = levels.map((lvl) => {
      const isUnlocked = this.manager.isLevelUnlocked(lvl.id);
      const record = this.manager.getLevelRecord(lvl.id);
      const isCleared = Boolean(record?.completed);
      const starsEarned = record?.stars || 0;
      const isArbiter = lvl.type === 'arbiter' || lvl.difficultyTier === 'ARBITER';

      const tierClass = `tier-${(lvl.difficultyTier || 'recon').toLowerCase()}`;
      const indexStr = String(lvl.index).padStart(2, '0');

      let statusClasses = 'level-node-item';
      if (!isUnlocked) statusClasses += ' locked';
      if (isCleared) statusClasses += ' cleared';
      if (isArbiter) statusClasses += ' arbiter-boss';

      // Stars display
      const starsHtml = [1, 2, 3].map(st => `
        <span class="star-glyph ${st <= starsEarned ? 'active' : ''}">★</span>
      `).join('');

      // Telemetry readout
      let metricsHtml = '';
      if (isCleared && record) {
        const timeStr = typeof record.bestTime === 'number' ? `${record.bestTime.toFixed(1)}s` : '--';
        const hpPct = typeof record.bestIntegrity === 'number' ? `${Math.round(record.bestIntegrity * 100)}%` : '--';
        metricsHtml = `
          <div class="node-metrics-readout">
            <span>BEST: ${timeStr}</span> &nbsp;·&nbsp; <span>HP: ${hpPct}</span>
          </div>
        `;
      } else if (isUnlocked) {
        metricsHtml = `
          <div class="node-metrics-readout" style="color:var(--cyan);">
            READY FOR COMBAT
          </div>
        `;
      } else {
        metricsHtml = `
          <div class="node-metrics-readout" style="color:#7a8a9a;">
            LOCKED // CLEAR PRECEDING NODE
          </div>
        `;
      }

      return `
        <div class="${statusClasses}" data-level-id="${lvl.id}" data-locked="${!isUnlocked}" tabindex="0" role="button" aria-label="${lvl.name} ${!isUnlocked ? 'Locked' : ''}">
          <div class="node-left-group">
            <div class="node-index-circle">${indexStr}</div>
            <div class="node-info-block">
              <div style="display:flex; align-items:center; margin-bottom:4px;">
                <span class="node-tier-badge ${tierClass}">${lvl.difficultyTier}</span>
                <span style="font-size:11px; color:#8ac0d0; font-family:'Courier New',Courier,monospace;">${isArbiter ? '// FINAL ARBITER TRIAL' : '// TRIAL NODE'}</span>
              </div>
              <h3>${lvl.name}</h3>
              <div style="font-size:11px; color:#9cb8c8; margin-top:2px;">${lvl.description}</div>
            </div>
          </div>

          <div class="node-right-group">
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
              <div class="node-stars-row">
                ${starsHtml}
              </div>
              ${metricsHtml}
            </div>
            <span style="font-size:16px; color:${isUnlocked ? 'var(--cyan)' : '#556677'};">➔</span>
          </div>
        </div>
      `;
    }).join('\n');

    return `
      <div class="campaign-card ${themeClass}">
        <div class="campaign-header-row">
          <div class="campaign-title-group">
            <h1>${grid.name}</h1>
            <p>// TRIAL MATRIX &amp; ARBITER ENCOUNTER PROGRESSION</p>
          </div>
          <div class="campaign-star-banner">
            <span class="star-gold-icon">★</span>
            <span>SECTOR STARS: ${earnedGridStars} / ${maxGridStars}</span>
          </div>
        </div>

        <div class="level-node-matrix">
          ${nodesHtml}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <button id="btnLevelSelectBack" class="btn" style="border-color:var(--orange); color:#ffb37a; min-width:200px;">
            ◀ BACK TO SECTORS
          </button>
          <div style="font-family:'Courier New',Courier,monospace; font-size:11px; color:#8ac0d0; letter-spacing:1px;">
            SELECT UNLOCKED NODE TO INSPECT MISSION BRIEF
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Binds interaction events for the rendered node matrix DOM.
   * @param {HTMLElement} root
   */
  bindEvents(root) {
    if (!root) return;

    // Back to Grid Selector
    const backBtn = root.querySelector('#btnLevelSelectBack');
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hide();
        if (typeof this._onBackToGridSelector === 'function') {
          this._onBackToGridSelector();
        }
      };
    }

    // Node items
    const nodes = root.querySelectorAll('.level-node-item');
    nodes.forEach(node => {
      node.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const levelId = node.getAttribute('data-level-id');
        const isLocked = node.getAttribute('data-locked') === 'true';

        if (isLocked) {
          SFX.errorBuzz();
          node.classList.add('shake-card');
          setTimeout(() => node.classList.remove('shake-card'), 300);
          return;
        }

        SFX.terminalKey();
        this.hide();

        if (typeof this._onSelectLevel === 'function') {
          this._onSelectLevel(levelId);
        }
      };

      node.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          node.click();
        }
      };
    });
  }
}

export const levelSelectView = new LevelSelectView();
