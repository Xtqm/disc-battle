/**
 * ArmoryModal.js
 * Diegetic Armory UI, Split-Pane Catalog Grid, 3D Preview Bay & Contextual Action Bar
 * for Tron Disc Arena (SPEC-ARMORY-001 Phase 3).
 */

import {
  ARMORY_CATEGORIES,
  UNLOCK_TYPES,
  getCatalogByCategory,
  getCatalogItem
} from '../../armory/ArmoryCatalog.js';
import {
  armoryManager as defaultArmoryManager
} from '../../armory/ArmoryManager.js';
import { ArmoryPreviewScene } from '../../armory/ArmoryPreviewScene.js';
import { economyManager as defaultEconomyManager } from '../../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../../core/storage/StorageManager.js';
import { SFX } from '../../audio/sfx.js';
import { state } from '../../core/state.js';
import { setCursor } from '../../input/InputManager.js';

export const CATEGORY_TABS = Object.freeze([
  { id: ARMORY_CATEGORIES.DISC_SKINS, label: 'IDENTITY DISCS' },
  { id: ARMORY_CATEGORIES.CHASSIS_SKINS, label: 'PROGRAM CHASSIS' },
  { id: ARMORY_CATEGORIES.UNLOCKED_MAPS, label: 'EXOTIC ARENAS' }
]);

export class ArmoryModal {
  /**
   * @param {object} [options]
   * @param {import('../../armory/ArmoryManager.js').ArmoryManager} [options.armory]
   * @param {import('../../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {typeof ArmoryPreviewScene} [options.PreviewSceneClass]
   */
  constructor(options = {}) {
    this.armory = options.armory || defaultArmoryManager;
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;
    this.PreviewSceneClass = options.PreviewSceneClass || ArmoryPreviewScene;

    this._containerId = 'armoryModal';
    this.activeCategory = ARMORY_CATEGORIES.DISC_SKINS;
    this.selectedItemId = null;
    this.previewScene = null;
    this._onBackToMenu = null;

    if (typeof window !== 'undefined') {
      window.__tronCloseArmory = () => this.hide();
    }
  }

  get container() {
    return typeof document !== 'undefined' ? (this._customContainer || document.getElementById(this._containerId)) : null;
  }

  isOpen() {
    const el = this.container;
    return Boolean(el && el.style.display !== 'none');
  }

  setOnBackToMenu(fn) {
    this._onBackToMenu = fn;
  }

  /**
   * Shows the Armory modal and mounts UI and preview scene.
   */
  show(initialCategory = ARMORY_CATEGORIES.DISC_SKINS) {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    setCursor();
    state.armoryModalOpen = true;

    const el = this.container;
    if (!el) return;

    this.activeCategory = initialCategory;
    const items = this.armory.getCatalogByCategory(this.activeCategory);
    const equipped = this.armory.getEquippedLoadout();

    // Select equipped item in category by default, or first item
    let defaultItem = items[0];
    if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
      const found = items.find((i) => i.id === equipped.discSkin);
      if (found) defaultItem = found;
    } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      const found = items.find((i) => i.id === equipped.chassisSkin);
      if (found) defaultItem = found;
    } else if (this.activeCategory === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
      const found = items.find((i) => i.id === equipped.unlockedMap);
      if (found) defaultItem = found;
    }

    this.selectedItemId = defaultItem ? defaultItem.id : null;

    el.innerHTML = this.render();
    el.style.display = 'flex';

    this._initPreviewScene();
    this.bindEvents(el);
  }

  /**
   * Hides the Armory modal and cleanly disposes WebGL preview resources.
   */
  hide(options = {}) {
    const wasOpen = state.armoryModalOpen;
    state.armoryModalOpen = false;

    if (this._isHiding) return;
    this._isHiding = true;

    try {
      if (this.previewScene) {
        try {
          this.previewScene.dispose();
        } catch (err) {
          console.warn('[ArmoryModal] Error disposing preview scene:', err);
        }
        this.previewScene = null;
      }

      const el = this.container;
      if (el) {
        el.style.display = 'none';
        el.innerHTML = '';
      }

      if (wasOpen && !options.skipMenuCallback && typeof this._onBackToMenu === 'function') {
        this._onBackToMenu();
      }
    } finally {
      this._isHiding = false;
    }
  }

  /**
   * Complete teardown and resource disposal.
   */
  dispose() {
    this.hide();
  }

  /**
   * Initializes or updates the 3D preview scene.
   * @private
   */
  _initPreviewScene() {
    if (typeof document === 'undefined') return;

    const mountPoint = document.getElementById('armoryPreviewMount');
    if (!mountPoint) return;

    if (!this.previewScene) {
      try {
        this.previewScene = new this.PreviewSceneClass({
          container: mountPoint,
          width: 340,
          height: 300,
          autoRotate: true,
          autoRotateSpeed: 0.9
        });
      } catch (err) {
        console.warn('[ArmoryModal] Failed to instantiate ArmoryPreviewScene:', err);
      }
    }

    this._updatePreviewSceneModel();
  }

  /**
   * Staged model in preview scene matching current selection.
   * @private
   */
  _updatePreviewSceneModel() {
    if (!this.previewScene || !this.selectedItemId) return;

    const item = this.armory.getItem(this.selectedItemId);
    if (!item) return;

    try {
      if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
        this.previewScene.previewDisc(item.id);
      } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
        const equipped = this.armory.getEquippedLoadout();
        this.previewScene.previewChassis(item.id, equipped.discSkin);
      } else if (this.activeCategory === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
        // Arenas display scenic ambient disc showcase
        this.previewScene.previewDisc('disc_default');
      }
    } catch (err) {
      console.warn('[ArmoryModal] Error updating preview model:', err);
    }
  }

  /**
   * Generates complete HTML markup for the modal.
   * @returns {string}
   */
  render() {
    const balance = typeof this.economy.getBalance === 'function'
      ? this.economy.getBalance()
      : (typeof this.economy.getBits === 'function' ? this.economy.getBits() : 0);
    const formattedBits = `$B ${balance.toLocaleString()}`;

    return `
      <div class="armory-card" id="armoryCard">
        <!-- Top Navigation Bar -->
        <div class="armory-top-nav">
          <div class="armory-title-section">
            <h1>ARMORY</h1>
            <div class="armory-nav-tabs" id="armoryNavTabs">
              ${CATEGORY_TABS.map((tab) => `
                <button class="armory-tab-btn ${tab.id === this.activeCategory ? 'active' : ''}" 
                        data-category="${tab.id}">
                  ${tab.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="armory-header-right">
            <div class="armory-bits-counter" id="armoryBitsCounter">
              <span style="color:#ffaa00;font-size:14px;">◆</span>
              <span id="armoryBitsValue">${formattedBits}</span>
            </div>
            <button class="armory-close-btn" id="armoryCloseBtn" title="Return to Grid (ESC)">[ESC // RETURN]</button>
          </div>
        </div>

        <!-- Split-Pane Layout -->
        <div class="armory-split-pane">
          <!-- Left: Scrollable Item Grid -->
          <div class="armory-catalog-pane">
            <div class="armory-items-grid" id="armoryItemsGrid">
              ${this.renderItemsGrid()}
            </div>
          </div>

          <!-- Right: 3D Turntable Preview Bay & Lore Dossier -->
          <div class="armory-inspection-pane" id="armoryInspectionPane">
            <div class="armory-preview-bay" id="armoryPreviewBay">
              <div class="armory-preview-canvas-mount" id="armoryPreviewMount"></div>
              <div class="armory-turntable-hint">DRAG TO ROTATE // AUTO-SPIN ACTIVE</div>
            </div>

            <div class="armory-dossier" id="armoryDossier">
              ${this.renderItemDossier()}
            </div>

            <div class="armory-action-bar" id="armoryActionBar">
              ${this.renderActionBar()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the item cards for the active category.
   * @returns {string}
   */
  renderItemsGrid() {
    const items = this.armory.getCatalogByCategory(this.activeCategory);
    const equipped = this.armory.getEquippedLoadout();

    let equippedId = null;
    if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
      equippedId = equipped.discSkin;
    } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      equippedId = equipped.chassisSkin;
    } else if (this.activeCategory === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
      equippedId = equipped.unlockedMap;
    }

    return items.map((item) => {
      const isSelected = item.id === this.selectedItemId;
      const isUnlocked = this.armory.isUnlocked(item.category, item.id);
      const isEquipped = item.id === equippedId;
      const primaryHex = item.shader?.primaryHex || '#00f3ff';

      let badgeHtml = '';
      if (isEquipped) {
        badgeHtml = `<span class="armory-card-badge badge-equipped">EQUIPPED</span>`;
      } else if (isUnlocked) {
        badgeHtml = `<span class="armory-card-badge badge-owned">OWNED</span>`;
      } else if (item.unlockType === UNLOCK_TYPES.BITS) {
        badgeHtml = `<span class="armory-card-badge badge-cost">${item.cost} BITS</span>`;
      } else {
        badgeHtml = `<span class="armory-card-badge badge-locked">LOCKED</span>`;
      }

      return `
        <div class="armory-item-card ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped-border' : ''}"
             data-item-id="${item.id}" id="armoryCard_${item.id}">
          <div class="armory-card-swatch" style="background:${primaryHex}; color:${primaryHex};"></div>
          <div class="armory-card-name">${item.displayName}</div>
          ${badgeHtml}
        </div>
      `;
    }).join('');
  }

  /**
   * Renders item description and technical specs dossier.
   * @returns {string}
   */
  renderItemDossier() {
    const item = this.armory.getItem(this.selectedItemId);
    if (!item) {
      return `<div class="armory-dossier-desc">NO ITEM SELECTED</div>`;
    }

    const tab = CATEGORY_TABS.find((t) => t.id === item.category);
    const categoryName = tab ? tab.label : item.category.toUpperCase();
    const shader = item.shader || {};

    const specPills = [];
    if (shader.glowIntensity) {
      specPills.push(`GLOW: ${shader.glowIntensity}X`);
    }
    if (shader.wireframeToggle) {
      specPills.push(`WIREFRAME: RETRO`);
    }
    if (shader.primaryHex) {
      specPills.push(`HEX: ${shader.primaryHex}`);
    }
    if (shader.trailOpacity) {
      specPills.push(`TRAIL: ${Math.round(shader.trailOpacity * 100)}%`);
    }

    return `
      <div class="armory-dossier-header">
        <h2 class="armory-dossier-title">${item.displayName}</h2>
        <span class="armory-dossier-category">${categoryName}</span>
      </div>
      <p class="armory-dossier-desc">${item.description}</p>
      <div class="armory-dossier-specs">
        ${specPills.map((pill) => `<span class="armory-spec-pill">${pill}</span>`).join('')}
      </div>
    `;
  }

  /**
   * Evaluates item state and renders the contextual action bar.
   * @returns {string}
   */
  renderActionBar() {
    const item = this.armory.getItem(this.selectedItemId);
    if (!item) return '';

    const equipped = this.armory.getEquippedLoadout();
    let isEquipped = false;
    if (this.activeCategory === ARMORY_CATEGORIES.DISC_SKINS) {
      isEquipped = equipped.discSkin === item.id;
    } else if (this.activeCategory === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      isEquipped = equipped.chassisSkin === item.id;
    } else if (this.activeCategory === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
      isEquipped = equipped.unlockedMap === item.id;
    }

    // 1. Owned & Equipped
    if (isEquipped) {
      return `<div class="armory-action-badge badge-active-protocol">[ ACTIVE PROTOCOL ]</div>`;
    }

    // 2. Owned & Unequipped
    const isUnlocked = this.armory.isUnlocked(item.category, item.id);
    if (isUnlocked) {
      return `
        <button class="armory-action-btn btn-equip" id="armoryActionBtn" data-action="equip" data-item-id="${item.id}">
          [ EQUIP TO LOADOUT ]
        </button>
      `;
    }

    // 3. Milestone Locked (Achievement)
    if (item.unlockType === UNLOCK_TYPES.ACHIEVEMENT) {
      const milestoneLabel = item.achievementId
        ? item.achievementId.toUpperCase().replace(/_/g, ' ')
        : 'CLASSIFIED MILESTONE';
      return `
        <button class="armory-action-btn btn-locked" id="armoryActionBtn" disabled>
          [ LOCKED // REQUIRES: ${milestoneLabel} ]
        </button>
      `;
    }

    // 4. Bit Purchasable: check affordability
    const canAfford = this.armory.canPurchase(item.id);
    if (canAfford) {
      return `
        <button class="armory-action-btn btn-fabricate" id="armoryActionBtn" data-action="fabricate" data-item-id="${item.id}">
          [ FABRICATE // ${item.cost} BITS ]
        </button>
      `;
    } else {
      return `
        <button class="armory-action-btn btn-fabricate" id="armoryActionBtn" disabled>
          [ FABRICATE // ${item.cost} BITS ]
        </button>
        <div class="armory-action-warning">INSUFFICIENT BITS // HARVEST MORE ON THE GRID</div>
      `;
    }
  }

  /**
   * Binds DOM interaction handlers.
   * @param {HTMLElement} root
   */
  bindEvents(root) {
    if (!root) return;

    // Close button
    const closeBtn = root.querySelector('#armoryCloseBtn');
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

    // Category Tabs
    const tabBtns = root.querySelectorAll ? root.querySelectorAll('.armory-tab-btn') : [];
    tabBtns.forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const cat = btn.getAttribute('data-category');
        if (cat && cat !== this.activeCategory) {
          this.switchCategory(cat);
        }
      };
    });

    // Item Cards
    this._bindCardClicks(root);

    // Action button
    this._bindActionButton(root);
  }

  _bindCardClicks(root) {
    const cards = root.querySelectorAll ? root.querySelectorAll('.armory-item-card') : [];
    cards.forEach((card) => {
      card.onclick = (e) => {
        e.stopPropagation();
        const itemId = card.getAttribute('data-item-id');
        if (itemId && itemId !== this.selectedItemId) {
          this.selectItem(itemId);
        }
      };
    });
  }

  _bindActionButton(root) {
    const actionBtn = root.querySelector('#armoryActionBtn');
    if (!actionBtn || actionBtn.disabled) return;

    actionBtn.onclick = (e) => {
      e.stopPropagation();
      const action = actionBtn.getAttribute('data-action');
      const itemId = actionBtn.getAttribute('data-item-id');

      if (action === 'fabricate') {
        this.handleFabricate(itemId);
      } else if (action === 'equip') {
        this.handleEquip(itemId);
      }
    };
  }

  /**
   * Changes the active category tab and selects the first item.
   * @param {string} category
   */
  switchCategory(category) {
    this.activeCategory = category;
    const items = this.armory.getCatalogByCategory(category);
    this.selectedItemId = items[0] ? items[0].id : null;

    // Update Tab UI
    const tabBtns = this.container?.querySelectorAll('.armory-tab-btn');
    tabBtns?.forEach((b) => {
      if (b.getAttribute('data-category') === category) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Re-render items grid
    const grid = this.container?.querySelector('#armoryItemsGrid');
    if (grid) {
      grid.innerHTML = this.renderItemsGrid();
      this._bindCardClicks(this.container);
    }

    // Update dossier & action bar
    this._refreshDossierAndAction();
    this._updatePreviewSceneModel();
  }

  /**
   * Selects an item for inspection and 3D preview.
   * @param {string} itemId
   */
  selectItem(itemId) {
    this.selectedItemId = itemId;

    // Update selected class on item cards
    const cards = this.container?.querySelectorAll('.armory-item-card');
    cards?.forEach((c) => {
      if (c.getAttribute('data-item-id') === itemId) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    this._refreshDossierAndAction();
    this._updatePreviewSceneModel();
  }

  _refreshDossierAndAction() {
    const dossier = this.container?.querySelector('#armoryDossier');
    if (dossier) {
      dossier.innerHTML = this.renderItemDossier();
    }

    const actionBar = this.container?.querySelector('#armoryActionBar');
    if (actionBar) {
      actionBar.innerHTML = this.renderActionBar();
      if (this.container) {
        this._bindActionButton(this.container);
      }
    }
  }

  /**
   * Executes atomic fabrication purchase with audio-visual fanfare.
   * @param {string} itemId
   */
  handleFabricate(itemId) {
    const success = this.armory.purchaseItem(itemId);
    if (!success) {
      SFX.errorBuzz?.();
      return;
    }

    // 1. Procedural audio compilation sweep & chime
    SFX.fabricate();

    // 2. Visual Fanfare: Neon Border Pulse Animation
    const previewBay = this.container?.querySelector('#armoryPreviewBay');
    if (previewBay) {
      previewBay.classList.remove('fabricate-pulse');
      // Trigger reflow to restart animation
      void previewBay.offsetWidth;
      previewBay.classList.add('fabricate-pulse');
      setTimeout(() => previewBay.classList.remove('fabricate-pulse'), 1000);
    }

    const card = this.container?.querySelector(`#armoryCard_${itemId}`);
    if (card) {
      card.classList.remove('fabricate-pulse');
      void card.offsetWidth;
      card.classList.add('fabricate-pulse');
      setTimeout(() => card.classList.remove('fabricate-pulse'), 1000);
    }

    // 3. Live Bit Balance Flash & Counter Update
    this._refreshBitsCounter(true);

    // 4. Update Catalog Grid card badge
    const grid = this.container?.querySelector('#armoryItemsGrid');
    if (grid) {
      grid.innerHTML = this.renderItemsGrid();
      this._bindCardClicks(this.container);
    }

    // 5. Update Action Bar to [ EQUIP TO LOADOUT ]
    this._refreshDossierAndAction();
  }

  /**
   * Equips an unlocked item with audio click feedback and state persistence.
   * @param {string} itemId
   */
  handleEquip(itemId) {
    const success = this.armory.equipItem(this.activeCategory, itemId);
    if (!success) {
      SFX.errorBuzz?.();
      return;
    }

    // 1. Tactical digital confirmation audio
    SFX.equip();

    // 2. Visual card pulse
    const card = this.container?.querySelector(`#armoryCard_${itemId}`);
    if (card) {
      card.classList.remove('fabricate-pulse');
      void card.offsetWidth;
      card.classList.add('fabricate-pulse');
      setTimeout(() => card.classList.remove('fabricate-pulse'), 1000);
    }

    // 3. Update Catalog Grid badges
    const grid = this.container?.querySelector('#armoryItemsGrid');
    if (grid) {
      grid.innerHTML = this.renderItemsGrid();
      this._bindCardClicks(this.container);
    }

    // 4. Update Action Bar to [ ACTIVE PROTOCOL ]
    this._refreshDossierAndAction();
  }

  /**
   * Refreshes the top-bar Bit counter and flashes on currency change.
   * @param {boolean} [flash=false]
   * @private
   */
  _refreshBitsCounter(flash = false) {
    const counterEl = this.container?.querySelector('#armoryBitsCounter');
    const valEl = this.container?.querySelector('#armoryBitsValue');
    const balance = typeof this.economy.getBalance === 'function'
      ? this.economy.getBalance()
      : (typeof this.economy.getBits === 'function' ? this.economy.getBits() : 0);
    const formattedBits = `$B ${balance.toLocaleString()}`;

    if (valEl) {
      valEl.textContent = formattedBits;
    }

    if (flash && counterEl) {
      counterEl.classList.add('counter-flash');
      setTimeout(() => counterEl.classList.remove('counter-flash'), 650);
    }
  }
}

// Global authoritative ArmoryModal singleton
export const armoryModal = new ArmoryModal();
