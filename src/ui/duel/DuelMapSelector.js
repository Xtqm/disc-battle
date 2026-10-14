/**
 * DuelMapSelector.js
 * Dynamic Duel Arena Map Selection Lobby for Tron Disc Arena (SPEC-ACHIEVE-001).
 *
 * Integrates an interactive card-based map picker into the Host Match, Practice, and
 * Solo Duel lobbies. Reads `inventory.unlockedMaps` from StorageManager and displays
 * Campaign Sector arenas and Armory Exotic arenas with explicit unlock directives.
 */

import { state } from '../../core/state.js';
import { defaultStorageManager } from '../../core/storage/StorageManager.js';
import { selectArenaMap } from '../arenaSelector.js';

export const DUEL_ARENA_REGISTRY = Object.freeze({
  arena_grid_01: Object.freeze({
    id: 'arena_grid_01',
    gridId: 'grid_01',
    name: 'Outlands Boot-Sector',
    category: 'campaign',
    categoryLabel: 'CAMPAIGN SECTOR',
    color: '#00e5ff',
    glowColor: '#00aaff',
    description: 'Reflective slate floor with static ricochet pillars.',
    unlockInstruction: 'UNLOCKED BY DEFAULT',
    defaultUnlocked: true
  }),
  arena_solar_sail: Object.freeze({
    id: 'arena_solar_sail',
    gridId: 'grid_02',
    name: 'Solar Sail Junction',
    category: 'campaign',
    categoryLabel: 'CAMPAIGN SECTOR',
    color: '#ffaa00',
    glowColor: '#ff6600',
    description: 'Amber lattice floor with vertical jump pads & elevated platforms.',
    unlockInstruction: 'DEFEAT GRID 02 ARBITER',
    defaultUnlocked: false
  }),
  arena_sea_sim: Object.freeze({
    id: 'arena_sea_sim',
    gridId: 'grid_03',
    name: 'Sea of Simulation',
    category: 'campaign',
    categoryLabel: 'CAMPAIGN SECTOR',
    color: '#9d4edd',
    glowColor: '#7b2cbf',
    description: 'Deep cobalt/violet floor with oscillating forcefields & laser gates.',
    unlockInstruction: 'DEFEAT GRID 03 ARBITER',
    defaultUnlocked: false
  }),
  arena_core_pinnacle: Object.freeze({
    id: 'arena_core_pinnacle',
    gridId: 'grid_04',
    name: 'The Core Pinnacle',
    category: 'campaign',
    categoryLabel: 'CAMPAIGN SECTOR',
    color: '#ff0055',
    glowColor: '#ffd700',
    description: 'Crimson/gold floor with lethal floor de-rez void zones.',
    unlockInstruction: 'DEFEAT GRID 04 ARBITER',
    defaultUnlocked: false
  }),
  arena_zero_g_nexus: Object.freeze({
    id: 'arena_zero_g_nexus',
    gridId: 'grid_01',
    name: 'Zero-G Nexus',
    category: 'exotic',
    categoryLabel: 'ARMORY EXOTIC',
    color: '#00ffcc',
    glowColor: '#0044ff',
    description: 'Floating hexagonal platforms with low-gravity trajectory dynamics.',
    unlockInstruction: 'UNLOCK IN ARMORY',
    defaultUnlocked: false
  }),
  arena_derez_chasm: Object.freeze({
    id: 'arena_derez_chasm',
    gridId: 'grid_01',
    name: 'De-rez Chasm',
    category: 'exotic',
    categoryLabel: 'ARMORY EXOTIC',
    color: '#ff3366',
    glowColor: '#880022',
    description: 'Narrow high-velocity bridges suspended over an endless de-rez void.',
    unlockInstruction: 'UNLOCK IN ARMORY',
    defaultUnlocked: false
  })
});

export class DuelMapSelector {
  /**
   * @param {object} [options]
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [options.storage]
   */
  constructor(options = {}) {
    this.storage = options.storage || defaultStorageManager;
    this.selectedMapId = 'arena_grid_01';
    this._listeners = new Map();
  }

  // ==========================================
  // Queries
  // ==========================================

  /**
   * Retrieves array of unlocked arena map IDs from storage.
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [storage=this.storage]
   * @returns {string[]}
   */
  getUnlockedMaps(storage = this.storage) {
    if (storage && !storage.isInitialized && typeof storage.load === 'function') {
      storage.load();
    }
    const unlocked = storage && typeof storage.get === 'function' ? storage.get('inventory.unlockedMaps') : null;
    if (Array.isArray(unlocked) && unlocked.length > 0) {
      return unlocked;
    }
    return ['arena_grid_01'];
  }

  /**
   * Checks whether a specific map is unlocked.
   * @param {string} mapId
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [storage=this.storage]
   * @returns {boolean}
   */
  isMapUnlocked(mapId, storage = this.storage) {
    if (mapId === 'arena_grid_01') return true;
    const unlocked = this.getUnlockedMaps(storage);
    return unlocked.includes(mapId);
  }

  /**
   * Returns metadata for a map ID.
   * @param {string} mapId
   * @returns {object}
   */
  getMapMetadata(mapId) {
    return DUEL_ARENA_REGISTRY[mapId] || {
      id: mapId,
      gridId: 'grid_01',
      name: mapId,
      category: 'custom',
      categoryLabel: 'ARENA',
      color: '#00e5ff',
      glowColor: '#00aaff',
      description: 'Standard combat grid.',
      unlockInstruction: 'CUSTOM ARENA',
      defaultUnlocked: true
    };
  }

  /**
   * Returns all registered maps in order.
   * @returns {Array<object>}
   */
  getAllMaps() {
    return Object.values(DUEL_ARENA_REGISTRY);
  }

  // ==========================================
  // HTML Rendering
  // ==========================================

  /**
   * Generates card layout HTML for the map picker.
   * @param {string} [currentSelection]
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [storage=this.storage]
   * @returns {string} HTML markup
   */
  renderHtml(currentSelection = state.selectedArenaMap || 'arena_grid_01', storage = this.storage) {
    const unlockedMaps = this.getUnlockedMaps(storage);
    const maps = this.getAllMaps();

    const cardsHtml = maps.map(m => {
      const isUnlocked = m.defaultUnlocked || unlockedMaps.includes(m.id);
      const isSelected = m.id === currentSelection;

      const borderStyle = isSelected
        ? `border: 2px solid ${m.color}; box-shadow: 0 0 16px ${m.color}, inset 0 0 12px rgba(0, 229, 255, 0.2);`
        : (isUnlocked
          ? `border: 1px solid rgba(255, 255, 255, 0.2); hover-border: 1px solid ${m.color};`
          : `border: 1px solid #2a2a2a; opacity: 0.55;`);

      const statusTag = isSelected
        ? `<span style="color:${m.color};font-size:9px;font-weight:bold;letter-spacing:1.5px;">[ ACTIVE ]</span>`
        : (isUnlocked
          ? `<span style="color:#00ffaa;font-size:9px;letter-spacing:1px;">AVAILABLE</span>`
          : `<span style="color:#ff3366;font-size:9px;letter-spacing:1px;font-weight:bold;">🔒 ${m.unlockInstruction}</span>`);

      return `
        <div class="duel-map-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}"
             data-map-id="${m.id}"
             data-unlocked="${isUnlocked ? 'true' : 'false'}"
             style="background: rgba(4, 20, 28, 0.88); border-radius: 4px; padding: 10px; margin-bottom: 8px; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; ${borderStyle} transition: all 0.2s ease;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:10px; letter-spacing:1.5px; color:${m.color}; font-weight:bold;">${m.categoryLabel}</span>
            ${statusTag}
          </div>
          <div style="font-size:13px; font-weight:bold; letter-spacing:1px; color:#ffffff; margin-bottom:4px;">
            ${m.name}
          </div>
          <div style="font-size:10px; color:#88a0b0; line-height:1.3;">
            ${m.description}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="duel-map-selector-wrapper" style="width:100%; max-height:260px; overflow-y:auto; padding-right:4px; margin-top:8px; margin-bottom:12px;">
        ${cardsHtml}
      </div>
    `;
  }

  // ==========================================
  // DOM Mounting & Interactive Binding
  // ==========================================

  /**
   * Mounts the card-based map selector into a target DOM container.
   * @param {HTMLElement} container
   * @param {object} [options]
   * @param {Function} [options.onSelect]
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @returns {HTMLElement} The mounted selector element
   */
  mount(container, options = {}) {
    if (!container) return null;
    const storage = options.storage || this.storage;
    const currentSelection = state.selectedArenaMap || this.getUnlockedMaps(storage)[0] || 'arena_grid_01';
    this.selectedMapId = currentSelection;

    container.innerHTML = this.renderHtml(currentSelection, storage);

    const cards = container.querySelectorAll('.duel-map-card');
    cards.forEach(card => {
      const mapId = card.getAttribute('data-map-id');
      const isUnlocked = card.getAttribute('data-unlocked') === 'true';

      if (isUnlocked) {
        card.addEventListener('click', (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          this.selectedMapId = mapId;
          selectArenaMap(mapId);

          // Synchronize dropdown if present in DOM
          const select = container.ownerDocument ? container.ownerDocument.getElementById('arenaSelect') : null;
          if (select && select.value !== mapId) {
            select.value = mapId;
          }

          // Re-render highlight
          this.mount(container, options);

          if (typeof options.onSelect === 'function') {
            options.onSelect(mapId);
          }
        });
      }
    });

    return container;
  }
}

export const duelMapSelector = new DuelMapSelector();
