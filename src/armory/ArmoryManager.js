/**
 * ArmoryManager.js
 * Authoritative Armory Purchase Pipeline & Loadout Controller for Tron Disc Arena (SPEC-ARMORY-001).
 * Coordinates catalog verification, atomic currency debits via EconomyManager, persistent
 * entitlement unlocks via StorageManager, loadout configuration, and event emission.
 */

import {
  ARMORY_CATALOG,
  ARMORY_CATEGORIES,
  UNLOCK_TYPES,
  getCatalogByCategory as defaultGetCatalogByCategory,
  getCatalogItem as defaultGetCatalogItem,
  isValidCategory
} from './ArmoryCatalog.js';
import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';

export const ArmoryEvents = Object.freeze({
  ITEM_UNLOCKED: 'ARMORY_ITEM_UNLOCKED',
  LOADOUT_CHANGED: 'LOADOUT_CHANGED'
});

/**
 * Maps Armory category keys to StorageManager inventory dot-paths.
 */
export const CATEGORY_INVENTORY_PATHS = Object.freeze({
  [ARMORY_CATEGORIES.DISC_SKINS]: 'inventory.discSkins',
  [ARMORY_CATEGORIES.CHASSIS_SKINS]: 'inventory.chassisSkins',
  [ARMORY_CATEGORIES.UNLOCKED_MAPS]: 'inventory.unlockedMaps',
  [ARMORY_CATEGORIES.DISC_TYPES]: 'inventory.discTypes'
});

/**
 * Maps Armory category keys to StorageManager loadout slot paths.
 */
export const CATEGORY_LOADOUT_PATHS = Object.freeze({
  [ARMORY_CATEGORIES.DISC_SKINS]: 'loadout.activeDisc',
  [ARMORY_CATEGORIES.CHASSIS_SKINS]: 'loadout.activeChassis',
  [ARMORY_CATEGORIES.UNLOCKED_MAPS]: 'loadout.activeArenaSkin',
  [ARMORY_CATEGORIES.DISC_TYPES]: 'loadout.activeDiscType'
});

/**
 * Fallback baseline defaults when slot is unpopulated or in initial state.
 */
export const DEFAULT_LOADOUT_SLOTS = Object.freeze({
  discSkin: 'disc_default',
  chassisSkin: 'chassis_default',
  unlockedMap: 'arena_grid_01',
  discType: 'disc_standard'
});

export class ArmoryManager {
  /**
   * @param {object} [options]
   * @param {object} [options.catalog]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   */
  constructor(options = {}) {
    this.catalog = options.catalog || ARMORY_CATALOG;
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;

    this._listeners = new Map();

    // Auto-mount debug suite if running in browser window
    if (typeof window !== 'undefined') {
      this.setupDebugSuite(window);
    }
  }

  // ==========================================
  // Helper: Storage State Guard
  // ==========================================

  _ensureStorageReady() {
    if (!this.storage.isInitialized) {
      this.storage.load();
    }
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  /**
   * Subscribes to armory lifecycle events.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribes a listener.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  /**
   * Dispatches an armory event.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[ArmoryManager] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // Catalog Queries
  // ==========================================

  /**
   * Returns catalog item definition for a given itemId across all categories.
   * @param {string} itemId
   * @returns {object|null}
   */
  getItem(itemId) {
    if (!itemId || typeof itemId !== 'string') {
      return null;
    }
    for (const cat of Object.values(ARMORY_CATEGORIES)) {
      const items = this.catalog[cat] || [];
      const found = items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }

  /**
   * Retrieves all catalog items for a given category.
   * @param {string} category e.g. 'discSkins', 'chassisSkins', 'unlockedMaps', 'discTypes'
   * @returns {Array<object>}
   */
  getCatalogByCategory(category) {
    if (!isValidCategory(category) || !this.catalog[category]) {
      return [];
    }
    return [...this.catalog[category]];
  }

  // ==========================================
  // Ownership & Unlock Verification
  // ==========================================

  /**
   * Checks whether an item is unlocked for the active player profile.
   * Accounts for free items, stored inventory arrays, achievement milestones, and legacy aliases.
   * @param {string} category
   * @param {string} itemId
   * @returns {boolean}
   */
  isUnlocked(category, itemId) {
    if (!category || !itemId || typeof category !== 'string' || typeof itemId !== 'string') {
      return false;
    }

    const item = this.getItem(itemId);
    if (!item) {
      // Legacy backward-compatibility check: disc_identity_default resolves to disc_default
      if (itemId === 'disc_identity_default' && category === ARMORY_CATEGORIES.DISC_SKINS) {
        return true;
      }
      return false;
    }

    if (item.category !== category) {
      return false;
    }

    // 1. Free items are inherently unlocked
    if (item.unlockType === UNLOCK_TYPES.FREE) {
      return true;
    }

    this._ensureStorageReady();

    // 2. Achievement-gated items: check player.achievements
    if (item.unlockType === UNLOCK_TYPES.ACHIEVEMENT && item.achievementId) {
      const achievements = this.storage.get('achievements', []);
      if (Array.isArray(achievements)) {
        // Can be stored as array of strings or array of objects with id
        const hasAchievement = achievements.some((a) =>
          typeof a === 'string' ? a === item.achievementId : a?.id === item.achievementId
        );
        if (hasAchievement) {
          return true;
        }
      }
    }

    // 3. Stored Inventory Checks
    const inventoryPath = CATEGORY_INVENTORY_PATHS[category] || `inventory.${category}`;
    const storedList = this.storage.get(inventoryPath, []);
    if (Array.isArray(storedList) && storedList.includes(itemId)) {
      return true;
    }

    // 4. Backwards-compatibility checks with pre-existing schema arrays
    if (category === ARMORY_CATEGORIES.DISC_SKINS) {
      const legacyDiscs = this.storage.get('inventory.discs', []);
      if (Array.isArray(legacyDiscs)) {
        if (legacyDiscs.includes(itemId)) return true;
        if (itemId === 'disc_default' && legacyDiscs.includes('disc_identity_default')) return true;
      }
    }

    if (category === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      const legacyCosmetics = this.storage.get('inventory.cosmetics', []);
      if (Array.isArray(legacyCosmetics) && legacyCosmetics.includes(itemId)) {
        return true;
      }
    }

    if (category === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
      const maps = this.storage.get('inventory.unlockedMaps', []);
      if (Array.isArray(maps) && maps.includes(itemId)) {
        return true;
      }
    }

    return false;
  }

  // ==========================================
  // Purchase Feasibility & Execution
  // ==========================================

  /**
   * Verifies if an item is eligible for purchase by the active player.
   * Checks item validity, existing ownership, Bits price, and balance affordability.
   * @param {string} itemId
   * @returns {boolean}
   */
  canPurchase(itemId) {
    if (!itemId || typeof itemId !== 'string') {
      return false;
    }

    const item = this.getItem(itemId);
    if (!item) {
      return false;
    }

    // Already unlocked items cannot be re-purchased
    if (this.isUnlocked(item.category, item.id)) {
      return false;
    }

    // Free items or achievement rewards cannot be bought with Bits
    if (item.unlockType !== UNLOCK_TYPES.BITS) {
      return false;
    }

    if (typeof item.cost !== 'number' || item.cost <= 0) {
      return false;
    }

    return this.economy.canAfford(item.cost);
  }

  /**
   * Executes atomic purchase of an item using Bits.
   * Deducts currency via EconomyManager, records ownership in StorageManager,
   * flushes persistence, and broadcasts ARMORY_ITEM_UNLOCKED event.
   * @param {string} itemId
   * @returns {boolean} True if successfully purchased and unlocked, false otherwise
   */
  purchaseItem(itemId) {
    if (!this.canPurchase(itemId)) {
      return false;
    }

    const item = this.getItem(itemId);
    if (!item) {
      return false;
    }

    // 1. Atomic currency spend through EconomyManager
    const spendSuccess = this.economy.spendBits(item.cost, item.category, item.id);
    if (!spendSuccess) {
      return false;
    }

    this._ensureStorageReady();

    // 2. Append item to primary inventory array
    const inventoryPath = CATEGORY_INVENTORY_PATHS[item.category] || `inventory.${item.category}`;
    const currentList = this.storage.get(inventoryPath, []);
    const updatedSet = new Set(Array.isArray(currentList) ? currentList : []);
    updatedSet.add(item.id);
    this.storage.set(inventoryPath, Array.from(updatedSet), { immediate: true });

    // 3. Keep parallel legacy inventory arrays in sync if applicable
    if (item.category === ARMORY_CATEGORIES.DISC_SKINS) {
      const discsList = this.storage.get('inventory.discs', []);
      const discsSet = new Set(Array.isArray(discsList) ? discsList : []);
      discsSet.add(item.id);
      this.storage.set('inventory.discs', Array.from(discsSet), { immediate: true });
    } else if (item.category === ARMORY_CATEGORIES.CHASSIS_SKINS) {
      const cosmeticsList = this.storage.get('inventory.cosmetics', []);
      const cosmeticsSet = new Set(Array.isArray(cosmeticsList) ? cosmeticsList : []);
      cosmeticsSet.add(item.id);
      this.storage.set('inventory.cosmetics', Array.from(cosmeticsSet), { immediate: true });
    } else if (item.category === ARMORY_CATEGORIES.UNLOCKED_MAPS) {
      const mapsList = this.storage.get('inventory.unlockedMaps', []);
      const mapsSet = new Set(Array.isArray(mapsList) ? mapsList : []);
      mapsSet.add(item.id);
      this.storage.set('inventory.unlockedMaps', Array.from(mapsSet), { immediate: true });
    }

    // 4. Emit ARMORY_ITEM_UNLOCKED event
    const eventPayload = {
      category: item.category,
      itemId: item.id,
      item: { ...item },
      cost: item.cost,
      timestamp: Date.now()
    };
    this.emit(ArmoryEvents.ITEM_UNLOCKED, eventPayload);

    return true;
  }

  // ==========================================
  // Loadout Controller & Equipment Management
  // ==========================================

  /**
   * Equips an unlocked item to its designated loadout slot.
   * Validates ownership before mutating state and dispatches LOADOUT_CHANGED.
   * @param {string} category e.g. 'discSkins', 'chassisSkins', 'unlockedMaps', 'discTypes'
   * @param {string} itemId
   * @returns {boolean} True if successfully equipped, false if locked or invalid
   */
  equipItem(category, itemId) {
    if (!isValidCategory(category) || !itemId || typeof itemId !== 'string') {
      return false;
    }

    const item = this.getItem(itemId);
    if (!item || item.category !== category) {
      return false;
    }

    if (!this.isUnlocked(category, itemId)) {
      return false;
    }

    this._ensureStorageReady();

    const slotPath = CATEGORY_LOADOUT_PATHS[category];
    if (!slotPath) {
      return false;
    }

    let previousItemId = this.storage.get(slotPath, null);
    if (category === ARMORY_CATEGORIES.DISC_SKINS && (!previousItemId || previousItemId === 'disc_identity_default')) {
      previousItemId = DEFAULT_LOADOUT_SLOTS.discSkin;
    } else if (category === ARMORY_CATEGORIES.UNLOCKED_MAPS && (!previousItemId || previousItemId === 'grid_default')) {
      previousItemId = DEFAULT_LOADOUT_SLOTS.unlockedMap;
    }

    // Persist new equipped item
    this.storage.set(slotPath, itemId, { immediate: true });

    // Emit LOADOUT_CHANGED event
    const eventPayload = {
      category,
      itemId,
      previousItemId,
      loadout: this.getEquippedLoadout(),
      timestamp: Date.now()
    };
    this.emit(ArmoryEvents.LOADOUT_CHANGED, eventPayload);

    return true;
  }

  /**
   * Retrieves the current equipped loadout object.
   * Resolves active items across all four categories with fallback defaults.
   * @returns {{ discSkin: string, chassisSkin: string, unlockedMap: string, discType: string }}
   */
  getEquippedLoadout() {
    this._ensureStorageReady();

    // Check loadout slots with fallbacks to defaults and schema defaults
    let activeDisc = this.storage.get(
      CATEGORY_LOADOUT_PATHS[ARMORY_CATEGORIES.DISC_SKINS],
      DEFAULT_LOADOUT_SLOTS.discSkin
    );
    if (!activeDisc || activeDisc === 'disc_identity_default') {
      activeDisc = DEFAULT_LOADOUT_SLOTS.discSkin;
    }

    let activeChassis = this.storage.get(
      CATEGORY_LOADOUT_PATHS[ARMORY_CATEGORIES.CHASSIS_SKINS],
      DEFAULT_LOADOUT_SLOTS.chassisSkin
    );
    if (!activeChassis) {
      activeChassis = DEFAULT_LOADOUT_SLOTS.chassisSkin;
    }

    let activeMap = this.storage.get(
      CATEGORY_LOADOUT_PATHS[ARMORY_CATEGORIES.UNLOCKED_MAPS],
      DEFAULT_LOADOUT_SLOTS.unlockedMap
    );
    if (!activeMap || activeMap === 'grid_default') {
      activeMap = DEFAULT_LOADOUT_SLOTS.unlockedMap;
    }

    let activeDiscType = this.storage.get(
      CATEGORY_LOADOUT_PATHS[ARMORY_CATEGORIES.DISC_TYPES],
      DEFAULT_LOADOUT_SLOTS.discType
    );
    if (!activeDiscType) {
      activeDiscType = DEFAULT_LOADOUT_SLOTS.discType;
    }

    return {
      discSkin: activeDisc,
      chassisSkin: activeChassis,
      unlockedMap: activeMap,
      discType: activeDiscType
    };
  }

  // ==========================================
  // Developer Debug Suite
  // ==========================================

  /**
   * Binds debugging helpers to window.gameDebug.armory.
   * @param {object} targetWindow
   */
  setupDebugSuite(targetWindow) {
    if (!targetWindow || typeof targetWindow !== 'object') {
      return;
    }

    targetWindow.gameDebug = targetWindow.gameDebug || {};
    targetWindow.gameDebug.armory = {
      unlockAll: () => {
        this._ensureStorageReady();
        for (const cat of Object.values(ARMORY_CATEGORIES)) {
          const items = this.catalog[cat] || [];
          const ids = items.map((i) => i.id);
          const path = CATEGORY_INVENTORY_PATHS[cat] || `inventory.${cat}`;
          const current = this.storage.get(path, []);
          const merged = Array.from(new Set([...(Array.isArray(current) ? current : []), ...ids]));
          this.storage.set(path, merged, { immediate: true });
        }
        return true;
      },
      getLoadout: () => this.getEquippedLoadout(),
      equip: (category, itemId) => this.equipItem(category, itemId),
      purchase: (itemId) => this.purchaseItem(itemId),
      isUnlocked: (category, itemId) => this.isUnlocked(category, itemId),
      canPurchase: (itemId) => this.canPurchase(itemId)
    };
  }
}

// Global authoritative singleton instance
export const armoryManager = new ArmoryManager();
