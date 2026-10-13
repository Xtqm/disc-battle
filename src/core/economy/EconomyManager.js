/**
 * EconomyManager.js
 * Authoritative Economy and Progression Engine for Tron Disc Arena (SPEC-ECON-001 Phase 2).
 * Governs atomic currency transactions, strict validation guards, exponential progression curves,
 * level-up milestone rewards, transaction audit logging, and developer debug console instrumentation.
 */

import { storageManager as defaultStorageManager } from '../storage/StorageManager.js';

export const EconomyEvents = Object.freeze({
  BITS_EARNED: 'BITS_EARNED',
  BITS_SPENT: 'BITS_SPENT',
  XP_GAINED: 'XP_GAINED',
  LEVEL_UP: 'LEVEL_UP'
});

export const MAX_AUDIT_LOG_SIZE = 100;

export const DEFAULT_XP_CURVE = (level) => {
  const l = Math.max(1, Math.floor(level));
  return Math.floor(250 * Math.pow(l, 1.4));
};

export const MILESTONE_REWARDS = Object.freeze({
  2: Object.freeze({ bits: 50 }),
  3: Object.freeze({ bits: 50 }),
  4: Object.freeze({ bits: 50 }),
  5: Object.freeze({ bits: 250 }),
  10: Object.freeze({ bits: 500 }),
  15: Object.freeze({ bits: 750 }),
  20: Object.freeze({ bits: 1000 }),
  25: Object.freeze({ bits: 1500 }),
  50: Object.freeze({ bits: 5000 }),
  100: Object.freeze({ bits: 10000 })
});

export class EconomyManager {
  /**
   * @param {object} [options]
   * @param {import('../storage/StorageManager.js').StorageManager} [options.storage]
   * @param {Function} [options.xpCurve]
   * @param {Record<number, { bits?: number }>} [options.milestoneRewards]
   * @param {number} [options.maxAuditLogSize]
   */
  constructor(options = {}) {
    this.storage = options.storage || defaultStorageManager;
    this.xpCurve = typeof options.xpCurve === 'function' ? options.xpCurve : DEFAULT_XP_CURVE;
    this.milestoneRewards = options.milestoneRewards || MILESTONE_REWARDS;
    this.maxAuditLogSize = options.maxAuditLogSize || MAX_AUDIT_LOG_SIZE;

    this._listeners = new Map();
    this._auditLog = [];

    // Auto-setup debug hooks if running inside a browser environment
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
   * Subscribes to economy events.
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
   * Emits an economy event.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EconomyManager] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // Audit Log & Telemetry
  // ==========================================

  /**
   * Appends an entry to the in-memory audit log.
   * @private
   * @param {object} entry
   */
  _addAuditEntry(entry) {
    const record = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      ...entry
    };
    this._auditLog.push(record);
    if (this._auditLog.length > this.maxAuditLogSize) {
      this._auditLog.shift();
    }
    return record;
  }

  /**
   * Returns a copy of the recent transaction audit log.
   * @returns {Array<object>}
   */
  getAuditLog() {
    return [...this._auditLog];
  }

  /**
   * Clears the in-memory audit log.
   */
  clearAuditLog() {
    this._auditLog = [];
  }

  // ==========================================
  // Currency Management (Bits)
  // ==========================================

  /**
   * Retrieves the current Bits balance.
   * @returns {number}
   */
  getBits() {
    this._ensureStorageReady();
    return this.storage.get('player.currency.bits', 0);
  }

  /**
   * Checks whether the player has sufficient Bits for a transaction.
   * Non-mutating and defensive against invalid inputs.
   * @param {number} cost
   * @returns {boolean}
   */
  canAfford(cost) {
    if (typeof cost !== 'number' || !Number.isFinite(cost) || Number.isNaN(cost) || cost < 0) {
      return false;
    }
    const intCost = Math.floor(cost);
    return this.getBits() >= intCost;
  }

  /**
   * Awards Bits to the player.
   * Guards against negative values, NaN, and non-numeric types.
   * Coerces fractional values to integers.
   * @param {number} amount
   * @param {string} [source='reward']
   * @returns {boolean} True if awarded, false if input was invalid
   */
  awardBits(amount, source = 'reward') {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      return false;
    }

    const intAmount = Math.floor(amount);
    if (intAmount <= 0) {
      return false;
    }

    this._ensureStorageReady();
    const currentBits = this.getBits();
    const newBits = currentBits + intAmount;

    this.storage.set('player.currency.bits', newBits, { immediate: false });

    const eventPayload = {
      amount: intAmount,
      source: String(source),
      balance: newBits,
      timestamp: Date.now()
    };

    this._addAuditEntry({
      type: EconomyEvents.BITS_EARNED,
      amount: intAmount,
      source: String(source),
      balanceAfter: newBits
    });

    this.emit(EconomyEvents.BITS_EARNED, eventPayload);
    return true;
  }

  /**
   * Spends Bits for a specified category and item.
   * Checks balance, deducts atomically, and logs the transaction.
   * Guards against negative amounts, NaN, and fractional costs.
   * @param {number} cost
   * @param {string} [category='general']
   * @param {string|null} [itemId=null]
   * @returns {boolean} True if successfully spent, false if insufficient balance or invalid input
   */
  spendBits(cost, category = 'general', itemId = null) {
    if (typeof cost !== 'number' || !Number.isFinite(cost) || Number.isNaN(cost) || cost <= 0) {
      return false;
    }

    const intCost = Math.floor(cost);
    if (intCost <= 0) {
      return false;
    }

    if (!this.canAfford(intCost)) {
      return false;
    }

    this._ensureStorageReady();
    const currentBits = this.getBits();
    const newBits = currentBits - intCost;

    this.storage.set('player.currency.bits', newBits, { immediate: false });

    const eventPayload = {
      cost: intCost,
      category: String(category),
      itemId: itemId ? String(itemId) : null,
      balance: newBits,
      timestamp: Date.now()
    };

    this._addAuditEntry({
      type: EconomyEvents.BITS_SPENT,
      amount: -intCost,
      category: String(category),
      itemId: itemId ? String(itemId) : null,
      balanceAfter: newBits
    });

    this.emit(EconomyEvents.BITS_SPENT, eventPayload);
    return true;
  }

  // ==========================================
  // Progression & XP Engine
  // ==========================================

  /**
   * Retrieves the current player level.
   * @returns {number}
   */
  getLevel() {
    this._ensureStorageReady();
    return this.storage.get('player.level', 1);
  }

  /**
   * Retrieves current player XP in the active level tier.
   * @returns {number}
   */
  getXP() {
    this._ensureStorageReady();
    return this.storage.get('player.xp', 0);
  }

  /**
   * Calculates the XP threshold required to complete a given level.
   * Formula: floor(250 * L^1.4)
   * @param {number} [level] Defaults to current player level
   * @returns {number}
   */
  getXPForNextLevel(level) {
    const l = level !== undefined ? level : this.getLevel();
    return this.xpCurve(l);
  }

  /**
   * Computes normalized progress [0.0, 1.0] towards the next level.
   * @returns {number}
   */
  getProgressToNextLevel() {
    const currentXP = this.getXP();
    const threshold = this.getXPForNextLevel();
    if (threshold <= 0) return 1.0;
    return Math.min(1.0, Math.max(0.0, currentXP / threshold));
  }

  /**
   * Computes milestone rewards for leveling up across range (oldLevel, newLevel].
   * @private
   * @param {number} oldLevel
   * @param {number} newLevel
   * @returns {{ bits: number, milestones: Array<{ level: number, reward: object }> }}
   */
  _calculateMilestoneRewards(oldLevel, newLevel) {
    let totalBits = 0;
    const milestones = [];

    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      const reward = this.milestoneRewards[lvl] || { bits: 50 };
      if (reward.bits) {
        totalBits += reward.bits;
      }
      milestones.push({ level: lvl, reward });
    }

    return { bits: totalBits, milestones };
  }

  /**
   * Awards combat/gameplay XP to the player.
   * Computes leveling thresholds, supports multi-level jumps, grants milestone rewards,
   * updates save state, and dispatches XP_GAINED and LEVEL_UP events.
   * @param {number} amount
   * @param {string} [source='combat']
   * @returns {boolean} True if awarded, false if input invalid
   */
  awardXP(amount, source = 'combat') {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      return false;
    }

    const intAmount = Math.floor(amount);
    if (intAmount <= 0) {
      return false;
    }

    this._ensureStorageReady();
    let currentLevel = this.getLevel();
    let currentXP = this.getXP() + intAmount;
    const oldLevel = currentLevel;
    let leveledUp = false;

    // Resolve multi-level threshold jumps
    while (currentXP >= this.getXPForNextLevel(currentLevel)) {
      currentXP -= this.getXPForNextLevel(currentLevel);
      currentLevel++;
      leveledUp = true;
    }

    this.storage.set('player.level', currentLevel, { immediate: false });
    this.storage.set('player.xp', currentXP, { immediate: false });

    const progress = this.getProgressToNextLevel();

    this._addAuditEntry({
      type: EconomyEvents.XP_GAINED,
      amount: intAmount,
      source: String(source),
      levelAfter: currentLevel,
      xpAfter: currentXP
    });

    this.emit(EconomyEvents.XP_GAINED, {
      amount: intAmount,
      source: String(source),
      xp: currentXP,
      level: currentLevel,
      progress,
      timestamp: Date.now()
    });

    if (leveledUp) {
      const rewards = this._calculateMilestoneRewards(oldLevel, currentLevel);
      if (rewards.bits > 0) {
        this.awardBits(rewards.bits, 'level_up_milestone');
      }

      this._addAuditEntry({
        type: EconomyEvents.LEVEL_UP,
        oldLevel,
        newLevel: currentLevel,
        rewards
      });

      this.emit(EconomyEvents.LEVEL_UP, {
        oldLevel,
        newLevel: currentLevel,
        rewards,
        timestamp: Date.now()
      });
    }

    return true;
  }

  // ==========================================
  // Developer Debug Suite
  // ==========================================

  /**
   * Binds safe developer console hooks on window.gameDebug or custom target.
   * @param {object} [targetWindow]
   */
  setupDebugSuite(targetWindow = (typeof window !== 'undefined' ? window : null)) {
    if (!targetWindow || typeof targetWindow !== 'object') {
      return;
    }

    targetWindow.gameDebug = targetWindow.gameDebug || {};

    targetWindow.gameDebug.addBits = (amount) => {
      const res = this.awardBits(Number(amount), 'debug_console');
      this.storage.save({ immediate: true });
      return res;
    };

    targetWindow.gameDebug.setXP = (amount) => {
      const intXP = Math.max(0, Math.floor(Number(amount) || 0));
      this._ensureStorageReady();
      this.storage.set('player.xp', intXP, { immediate: true });
      this._addAuditEntry({
        type: 'DEBUG_SET_XP',
        amount: intXP,
        levelAfter: this.getLevel(),
        xpAfter: intXP
      });
      return intXP;
    };

    targetWindow.gameDebug.setLevel = (targetLevel) => {
      const intLevel = Math.max(1, Math.floor(Number(targetLevel) || 1));
      this._ensureStorageReady();
      this.storage.set('player.level', intLevel, { immediate: true });
      this.storage.set('player.xp', 0, { immediate: true });
      this._addAuditEntry({
        type: 'DEBUG_SET_LEVEL',
        levelAfter: intLevel,
        xpAfter: 0
      });
      return intLevel;
    };

    targetWindow.gameDebug.resetEconomy = () => {
      this._ensureStorageReady();
      this.storage.set('player.currency.bits', 0, { immediate: true });
      this.storage.set('player.level', 1, { immediate: true });
      this.storage.set('player.xp', 0, { immediate: true });
      this.clearAuditLog();
      return true;
    };
  }
}

// Global authoritative singleton instance
export const economyManager = new EconomyManager();
