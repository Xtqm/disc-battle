/**
 * AchievementManager.js
 * Authoritative Achievement Engine, Telemetry Bus & Reward Distribution Pipeline
 * for Tron Disc Arena (SPEC-ACHIEVE-001).
 */

import {
  getAllAchievements,
  getAchievement,
  calculateProgress
} from './AchievementRegistry.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { StorageEvents } from '../core/storage/schema.js';
import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { armoryManager as defaultArmoryManager } from '../armory/ArmoryManager.js';

export const AchievementEvents = Object.freeze({
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  PROGRESS_UPDATED: 'ACHIEVEMENT_PROGRESS_UPDATED'
});

export class AchievementManager {
  /**
   * @param {object} [options]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../armory/ArmoryManager.js').ArmoryManager} [options.armory]
   * @param {Function} [options.onUnlockToast]
   */
  constructor(options = {}) {
    this.storage = options.storage || defaultStorageManager;
    this.economy = options.economy || defaultEconomyManager;
    this.armory = options.armory || defaultArmoryManager;
    this.onUnlockToast = options.onUnlockToast || null;

    this.isInitialized = false;
    this._listeners = new Map();
    this._storageUnsubscribe = null;
  }

  // ==========================================
  // Lifecycle & Initialization
  // ==========================================

  /**
   * Initializes the Achievement Manager, hooks storage telemetry mutations,
   * and runs retroactive reconciliation on boot.
   */
  init() {
    if (this.isInitialized) return;

    if (!this.storage.isInitialized && typeof this.storage.load === 'function') {
      this.storage.load();
    }

    // Subscribe to persistent storage mutations for telemetry tracking
    if (typeof this.storage.on === 'function') {
      this._storageUnsubscribe = this.storage.on(
        StorageEvents.MUTATED,
        (mutation) => this._onStorageMutated(mutation)
      );
    }

    // Run retroactive reconciliation for veteran players
    this.reconcileAchievements({ silent: true });

    this.isInitialized = true;
  }

  teardown() {
    if (this._storageUnsubscribe && typeof this._storageUnsubscribe === 'function') {
      this._storageUnsubscribe();
      this._storageUnsubscribe = null;
    }
    this._listeners.clear();
    this.isInitialized = false;
  }

  // ==========================================
  // Event Emitter Implementation
  // ==========================================

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[AchievementManager] Error in ${event} handler:`, err);
        }
      }
    }
  }

  // ==========================================
  // Query & State Helpers
  // ==========================================

  /**
   * Checks whether an achievement is currently unlocked.
   * Handles string arrays, object arrays, and legacy aliases.
   * @param {string} achievementId
   * @returns {boolean}
   */
  isUnlocked(achievementId) {
    if (!achievementId || typeof achievementId !== 'string') return false;

    const list = this.storage.get('achievements', []);
    if (!Array.isArray(list)) return false;

    return list.some((item) => {
      const id = typeof item === 'string' ? item : item?.id;
      if (!id) return false;
      if (id === achievementId) return true;
      // Handle legacy and cross-spec aliases
      if (achievementId === 'ach_swarm_survivor' && id === 'corrupted_void_mastery') return true;
      if (achievementId === 'corrupted_void_mastery' && id === 'ach_swarm_survivor') return true;
      if (achievementId === 'ach_grid_one_master' && id === 'grid_01_mastery') return true;
      if (achievementId === 'grid_01_mastery' && id === 'ach_grid_one_master') return true;
      return false;
    });
  }

  /**
   * Returns progress details for all registered achievements.
   * @returns {Array<object>}
   */
  getMatrixStatus() {
    const fullState = this.storage.get('', {}) || {};
    const all = getAllAchievements();

    return all.map((ach) => {
      const unlocked = this.isUnlocked(ach.id);
      const progress = ach.evaluate(fullState);
      return {
        ...ach,
        unlocked,
        progress: unlocked ? { ...progress, ratio: 1.0, current: progress.target, satisfied: true } : progress
      };
    });
  }

  /**
   * Computes overall achievement completion statistics.
   * @returns {{ total: number, unlocked: number, percentage: number }}
   */
  getCompletionStats() {
    const all = getAllAchievements();
    const total = all.length;
    let unlocked = 0;

    for (const ach of all) {
      if (this.isUnlocked(ach.id)) {
        unlocked++;
      }
    }

    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    return { total, unlocked, percentage };
  }

  // ==========================================
  // Telemetry Bus & Mutation Observer
  // ==========================================

  /**
   * Atomically increments or updates a telemetry metric key in storage.
   * @param {string} metricPath e.g. 'stats.totalDerezzes'
   * @param {number} [delta=1]
   * @returns {number} New metric value
   */
  recordMetric(metricPath, delta = 1) {
    if (!metricPath || typeof metricPath !== 'string') return 0;

    const currentVal = Number(this.storage.get(metricPath, 0));
    const nextVal = currentVal + delta;
    this.storage.set(metricPath, nextVal);
    return nextVal;
  }

  /**
   * Reactive listener observing storage mutations.
   * Evaluates criteria whenever relevant stats or campaign metrics change.
   * @private
   */
  _onStorageMutated({ path }) {
    if (!path || typeof path !== 'string') return;

    // Filter relevant telemetry paths to prevent circular evaluation
    const isTelemetryPath =
      path.startsWith('stats.') ||
      path.startsWith('campaign.levelRecords') ||
      path === 'campaign.starsEarned';

    if (!isTelemetryPath) return;

    this.checkPendingAchievements({ silent: false });
  }

  /**
   * Evaluates all locked achievements against current state and triggers unlocks.
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   * @returns {Array<string>} Newly unlocked achievement IDs
   */
  checkPendingAchievements(options = {}) {
    const fullState = this.storage.get('', {}) || {};
    const newlyUnlocked = [];

    for (const ach of getAllAchievements()) {
      if (!this.isUnlocked(ach.id)) {
        const evalResult = ach.evaluate(fullState);
        if (evalResult && evalResult.satisfied) {
          const success = this.unlock(ach.id, {
            silent: options.silent ?? false,
            retroactive: options.retroactive ?? false
          });
          if (success) {
            newlyUnlocked.push(ach.id);
          }
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Reconciles locked achievements against existing player save state on boot.
   * Silently grants rewards for satisfied milestones without spamming toasts.
   * @param {object} [options]
   * @returns {Array<string>} IDs of retroactively unlocked achievements
   */
  reconcileAchievements(options = {}) {
    return this.checkPendingAchievements({
      silent: options.silent ?? true,
      retroactive: true
    });
  }

  // ==========================================
  // Unlock Execution & Reward Distribution
  // ==========================================

  /**
   * Authoritatively unlocks an achievement, credits Bits and cosmetics,
   * commits to persistent storage, and dispatches notification events.
   * @param {string} achievementId
   * @param {object} [options]
   * @param {boolean} [options.silent=false]
   * @param {boolean} [options.retroactive=false]
   * @returns {boolean} True if newly unlocked, false if already unlocked or invalid
   */
  unlock(achievementId, options = {}) {
    if (this.isUnlocked(achievementId)) {
      return false;
    }

    const ach = getAchievement(achievementId);
    if (!ach) {
      return false;
    }

    const now = Date.now();
    const unlockRecord = {
      id: ach.id,
      title: ach.title,
      unlockedAt: now,
      reward: { ...ach.reward },
      retroactive: Boolean(options.retroactive)
    };

    // 1. Distribute Bit currency via EconomyManager
    if (ach.reward?.bits > 0 && this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(ach.reward.bits, `achievement_${ach.id}`);
    }

    // 2. Distribute cosmetic skins via ArmoryManager
    if (ach.reward?.cosmetic && this.armory && typeof this.armory.unlockRewardItem === 'function') {
      this.armory.unlockRewardItem(ach.reward.cosmetic.category, ach.reward.cosmetic.itemId);
    }

    // 3. Persist unlock record to storage
    const currentList = this.storage.get('achievements', []);
    const updatedList = Array.isArray(currentList) ? [...currentList] : [];
    updatedList.push(unlockRecord);
    this.storage.set('achievements', updatedList, { immediate: true });

    // 4. Emit lifecycle event
    const eventPayload = {
      achievementId: ach.id,
      achievement: { ...ach },
      record: unlockRecord,
      silent: Boolean(options.silent),
      timestamp: now
    };
    this.emit(AchievementEvents.ACHIEVEMENT_UNLOCKED, eventPayload);

    // 5. Trigger in-game toast banner if not silenced
    if (!options.silent && typeof this.onUnlockToast === 'function') {
      try {
        this.onUnlockToast(ach);
      } catch (err) {
        console.error('[AchievementManager] Toast notification error:', err);
      }
    }

    return true;
  }
}

import { achievementToast } from '../ui/components/AchievementToast.js';

export const achievementManager = new AchievementManager({
  onUnlockToast: (ach) => achievementToast.show(ach)
});
