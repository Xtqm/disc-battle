/**
 * GridSelectorModal.js
 * Sector Carousel & Grid Selection UI for Tron Disc Arena (SPEC-CAMP-001 Phase 2).
 * Displays Grids 01 through 04 with sector color palettes, Star progress counters,
 * cumulative campaign star banner, and dynamic lock overlays for Star-gated sectors.
 */

import { campaignRegistry as defaultRegistry } from '../../campaign/CampaignRegistry.js';
import { campaignManager as defaultManager } from '../../campaign/CampaignManager.js';
import { SFX } from '../../audio/sfx.js';
import { setCursor } from '../../input/InputManager.js';

export class GridSelectorModal {
  /**
   * @param {object} [options]
   * @param {import('../../campaign/CampaignRegistry.js').CampaignRegistry} [options.registry]
   * @param {import('../../campaign/CampaignManager.js').CampaignManager} [options.manager]
   */
  constructor(options = {}) {
    this.registry = options.registry || defaultRegistry;
    this.manager = options.manager || defaultManager;
    this._containerId = 'gridSelectorModal';
    this._onSelectGrid = null;
    this._onBackToMenu = null;
  }

  get container() {
    return typeof document !== 'undefined' ? document.getElementById(this._containerId) : null;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style.display !== 'none');
  }

  /**
   * Sets callback invoked when an unlocked grid is selected.
   * @param {(gridId: string) => void} fn
   */
  setOnSelectGrid(fn) {
    this._onSelectGrid = fn;
  }

  /**
   * Sets callback invoked when navigating back to main menu.
   * @param {() => void} fn
   */
  setOnBackToMenu(fn) {
    this._onBackToMenu = fn;
  }

  /**
   * Displays the Grid Selector modal and binds interaction events.
   */
  show() {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();

    const el = this.container;
    if (!el) return;

    el.innerHTML = this.render();
    el.style.display = 'flex';
    this.bindEvents(el);
  }

  /**
   * Hides the Grid Selector modal.
   */
  hide() {
    const el = this.container;
    if (el) {
      el.style.display = 'none';
    }
  }

  /**
   * Generates the modal markup for Grids 01 through 04.
   * @returns {string} HTML markup
   */
  render() {
    const grids = this.registry.getAllGrids();
    const totalStars = this.manager.getTotalStars();
    const maxPossibleStars = this.registry.calculateMaxPossibleStars();

    const gridCardsHtml = grids.map((grid, idx) => {
      const isUnlocked = this.manager.isGridUnlocked(grid.id);
      const levels = grid.levels || [];
      const maxGridStars = levels.length * 3;
      
      let earnedGridStars = 0;
      for (const level of levels) {
        const record = this.manager.getLevelRecord(level.id);
        earnedGridStars += record?.stars || 0;
      }

      const sectorNumStr = String(idx + 1).padStart(2, '0');
      const themeClass = `sector-theme-${grid.id}`;

      if (!isUnlocked) {
        const starsNeeded = Math.max(0, grid.requiredStars - totalStars);
        return `
          <div class="sector-card locked ${themeClass}" data-grid-id="${grid.id}" data-locked="true" tabindex="0" role="button" aria-disabled="true" aria-label="${grid.name} locked">
            <div class="sector-card-header">
              <span class="sector-badge">SECTOR ${sectorNumStr}</span>
              <span class="sector-stars-badge">0 / ${maxGridStars} ★</span>
            </div>
            <div class="sector-card-title">${grid.name}</div>
            <div class="sector-card-desc">${grid.description}</div>
            <div class="sector-lock-overlay">
              <div class="sector-lock-icon">🔒</div>
              <div class="sector-lock-title">SECTOR ENCRYPTED</div>
              <div class="sector-lock-req">REQUIRES ${grid.requiredStars} STARS</div>
              <div style="font-size:10px; color:#ff9944; margin-top:2px;">(${starsNeeded} MORE NEEDED)</div>
            </div>
          </div>
        `;
      }

      return `
        <div class="sector-card ${themeClass}" data-grid-id="${grid.id}" data-locked="false" tabindex="0" role="button" aria-label="${grid.name}">
          <div class="sector-card-header">
            <span class="sector-badge">SECTOR ${sectorNumStr}</span>
            <span class="sector-stars-badge">${earnedGridStars} / ${maxGridStars} ★</span>
          </div>
          <div class="sector-card-title">${grid.name}</div>
          <div class="sector-card-desc">${grid.description}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:12px; border-top:1px solid rgba(79,242,255,0.2);">
            <span style="font-family:'Courier New',Courier,monospace; font-size:11px; color:var(--sector-color, var(--cyan)); letter-spacing:1px;">ACCESS GRANTED</span>
            <span style="font-size:14px; color:var(--sector-color, var(--cyan));">➔</span>
          </div>
        </div>
      `;
    }).join('\n');

    return `
      <div class="campaign-card">
        <div class="campaign-header-row">
          <div class="campaign-title-group">
            <h1>CAMPAIGN SECTORS</h1>
            <p>// GRID ARCHITECTURE &amp; SIMULATION CLEARANCE</p>
          </div>
          <div class="campaign-star-banner">
            <span class="star-gold-icon">★</span>
            <span>TOTAL STARS: ${totalStars} / ${maxPossibleStars}</span>
          </div>
        </div>

        <div class="grid-carousel">
          ${gridCardsHtml}
        </div>

        <div style="display:flex; justify-content:flex-start; margin-top:12px;">
          <button id="btnGridSelectorBack" class="btn" style="border-color:var(--orange); color:#ffb37a; min-width:180px;">
            ◀ RETURN TO MENU
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Binds click and interaction events for the rendered modal DOM.
   * @param {HTMLElement} root
   */
  bindEvents(root) {
    if (!root) return;

    // Back button
    const backBtn = root.querySelector('#btnGridSelectorBack');
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        this.hide();
        if (typeof this._onBackToMenu === 'function') {
          this._onBackToMenu();
        } else if (typeof window !== 'undefined' && window.__tronShowModeSelectMenu) {
          window.__tronShowModeSelectMenu();
        }
      };
    }

    // Grid cards
    const cards = root.querySelectorAll('.sector-card');
    cards.forEach(card => {
      card.onclick = (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        const gridId = card.getAttribute('data-grid-id');
        const isLocked = card.getAttribute('data-locked') === 'true';

        if (isLocked) {
          SFX.errorBuzz();
          card.classList.add('shake-card');
          setTimeout(() => card.classList.remove('shake-card'), 300);
          return;
        }

        SFX.terminalKey();
        this.hide();

        if (typeof this._onSelectGrid === 'function') {
          this._onSelectGrid(gridId);
        }
      };

      // Enter key accessibility
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      };
    });
  }
}

export const gridSelectorModal = new GridSelectorModal();
