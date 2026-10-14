/**
 * CampaignManager.js
 * Authoritative Campaign Manager & Progression Engine for Tron Disc Arena (SPEC-CAMP-001).
 * Orchestrates trial lifecycles, telemetry metrics, monotonic star progression,
 * differentiated first-time vs repeat economy payouts, and persistent storage synchronization.
 */

import { campaignRegistry as defaultCampaignRegistry } from './CampaignRegistry.js';
import { starEvaluator as defaultStarEvaluator } from './StarEvaluator.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';

export const CampaignEvents = Object.freeze({
  TRIAL_STARTED: 'CAMPAIGN_TRIAL_STARTED',
  TRIAL_COMPLETED: 'CAMPAIGN_TRIAL_COMPLETED',
  TRIAL_FAILED: 'CAMPAIGN_TRIAL_FAILED',
  METRIC_RECORDED: 'CAMPAIGN_METRIC_RECORDED',
  GRID_UNLOCKED: 'CAMPAIGN_GRID_UNLOCKED',
  STARS_UPDATED: 'CAMPAIGN_STARS_UPDATED',
  ARENA_MAP_UNLOCKED: 'CAMPAIGN_ARENA_MAP_UNLOCKED'
});

export const ARBITER_MAP_IDS = Object.freeze({
  level_01_06: 'arena_grid_01',
  level_02_07: 'arena_solar_sail',
  level_03_07: 'arena_sea_sim',
  level_04_08: 'arena_core_pinnacle'
});

export class CampaignManager {
  /**
   * @param {object} [options]
   * @param {import('./CampaignRegistry.js').CampaignRegistry} [options.registry]
   * @param {import('./StarEvaluator.js').StarEvaluator} [options.evaluator]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   */
  constructor(options = {}) {
    this.registry = options.registry || defaultCampaignRegistry;
    this.evaluator = options.evaluator || defaultStarEvaluator;
    this.storage = options.storage || defaultStorageManager;
    this.economy = options.economy || defaultEconomyManager;

    this._listeners = new Map();
    /** @type {object|null} */
    this._activeTrial = null;

    this._ensureStorageInitialized();
  }

  // ==========================================
  // Storage State Synchronization
  // ==========================================

  _ensureStorageInitialized() {
    if (!this.storage.isInitialized) {
      this.storage.load();
    }

    // Ensure baseline campaign persistence keys exist
    const levelRecords = this.storage.get('campaign.levelRecords');
    if (!levelRecords || typeof levelRecords !== 'object') {
      this.storage.set('campaign.levelRecords', {}, { autoSave: false });
    }

    const unlockedGrids = this.storage.get('campaign.unlockedGrids');
    if (!Array.isArray(unlockedGrids) || unlockedGrids.length === 0) {
      this.storage.set('campaign.unlockedGrids', ['grid_01'], { autoSave: false });
    }

    const completedNodes = this.storage.get('campaign.completedNodes');
    if (!Array.isArray(completedNodes)) {
      this.storage.set('campaign.completedNodes', [], { autoSave: false });
    }

    const unlockedNodes = this.storage.get('campaign.unlockedNodes');
    if (!Array.isArray(unlockedNodes) || unlockedNodes.length === 0) {
      this.storage.set('campaign.unlockedNodes', ['level_01_01'], { autoSave: false });
    }

    const unlockedMaps = this.storage.get('inventory.unlockedMaps');
    if (!Array.isArray(unlockedMaps) || unlockedMaps.length === 0) {
      this.storage.set('inventory.unlockedMaps', ['arena_grid_01'], { autoSave: false });
    }
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  /**
   * Subscribes to campaign events.
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
   * Unsubscribes from campaign events.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  /**
   * Emits a campaign event.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[CampaignManager] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // Trial Lifecycle Management
  // ==========================================

  /**
   * Initiates a new campaign trial session.
   * @param {string} levelId
   * @returns {object} The active trial session
   */
  startTrial(levelId) {
    this._ensureStorageInitialized();

    const level = this.registry.getLevel(levelId);
    if (!level) {
      throw new Error(`[CampaignManager] Level "${levelId}" not found in CampaignRegistry.`);
    }

    if (!this.isLevelUnlocked(levelId)) {
      throw new Error(`[CampaignManager] Level "${levelId}" is currently locked.`);
    }

    this._activeTrial = {
      levelId,
      levelConfig: level,
      startTime: Date.now(),
      metrics: {
        curveHits: 0,
        ricochetHits: 0,
        enemiesKilled: 0,
        damageTaken: 0,
        finalHp: 100,
        maxHp: 100
      }
    };

    const payload = {
      levelId,
      levelConfig: level,
      startTime: this._activeTrial.startTime
    };

    this.emit(CampaignEvents.TRIAL_STARTED, payload);
    return { ...this._activeTrial };
  }

  /**
   * Records active gameplay combat telemetry during a trial.
   * @param {string} type Metric identifier (e.g. 'curveHit', 'ricochetHit', 'damageTaken', 'finalHp')
   * @param {number} [amount=1] Amount or value
   * @returns {boolean} True if recorded
   */
  recordMetric(type, amount = 1) {
    if (!this._activeTrial) {
      return false;
    }

    const numericAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 1;

    switch (type) {
      case 'curveHit':
      case 'curveHits':
        this._activeTrial.metrics.curveHits += Math.max(0, Math.floor(numericAmount));
        break;
      case 'ricochetHit':
      case 'ricochetHits':
        this._activeTrial.metrics.ricochetHits += Math.max(0, Math.floor(numericAmount));
        break;
      case 'enemyKilled':
      case 'enemiesKilled':
        this._activeTrial.metrics.enemiesKilled += Math.max(0, Math.floor(numericAmount));
        break;
      case 'damageTaken':
        this._activeTrial.metrics.damageTaken += Math.max(0, numericAmount);
        break;
      case 'finalHp':
        this._activeTrial.metrics.finalHp = Math.max(0, numericAmount);
        break;
      case 'maxHp':
        this._activeTrial.metrics.maxHp = Math.max(1, numericAmount);
        break;
      default:
        this._activeTrial.metrics[type] = (this._activeTrial.metrics[type] || 0) + numericAmount;
        break;
    }

    this.emit(CampaignEvents.METRIC_RECORDED, {
      type,
      amount: numericAmount,
      metrics: { ...this._activeTrial.metrics }
    });

    return true;
  }

  /**
   * Completes the active trial, evaluating Stars, awarding payouts, and persisting records.
   * @param {object} [overrideTelemetry={}] Optional explicit telemetry overrides
   * @returns {object} Comprehensive trial outcome summary
   */
  completeTrial(overrideTelemetry = {}) {
    if (!this._activeTrial) {
      throw new Error('[CampaignManager] No active trial to complete.');
    }

    this._ensureStorageInitialized();

    const trial = this._activeTrial;
    const levelId = trial.levelId;
    const levelConfig = trial.levelConfig;
    const elapsedSeconds = overrideTelemetry.elapsedSeconds ?? Math.max(0.1, (Date.now() - trial.startTime) / 1000);

    const telemetry = {
      cleared: true,
      finalHp: overrideTelemetry.finalHp ?? trial.metrics.finalHp,
      maxHp: overrideTelemetry.maxHp ?? trial.metrics.maxHp,
      finalIntegrity: overrideTelemetry.finalIntegrity,
      elapsedSeconds,
      curveHits: overrideTelemetry.curveHits ?? trial.metrics.curveHits,
      ricochetHits: overrideTelemetry.ricochetHits ?? trial.metrics.ricochetHits,
      precisionHits: overrideTelemetry.precisionHits
    };

    // Evaluate 1-3 Stars via pure evaluator
    const evaluation = this.evaluator.evaluate(levelConfig, telemetry);
    const newStars = evaluation.stars;

    // Retrieve previous level record
    const existingRecord = this.getLevelRecord(levelId);
    const previousStars = existingRecord?.stars ?? 0;
    const wasCompleted = Boolean(existingRecord?.completed);
    const firstTimeClear = !wasCompleted;

    // Monotonic Star Upgrade: only award delta stars when beating previous record
    const deltaStars = Math.max(0, newStars - previousStars);
    const effectiveStars = Math.max(previousStars, newStars);
    const currentTotalStars = this.getTotalStars();
    const newTotalStars = currentTotalStars + deltaStars;

    // Determine Economy Payouts
    const bitsAwarded = firstTimeClear
      ? levelConfig.payouts.firstClearBits
      : levelConfig.payouts.repeatClearBits;

    const xpAwarded = firstTimeClear
      ? levelConfig.payouts.firstClearXp
      : levelConfig.payouts.repeatClearXp;

    // Dispatch payouts via EconomyManager
    const bitSource = firstTimeClear ? `campaign_first_clear_${levelId}` : `campaign_repeat_clear_${levelId}`;
    const xpSource = firstTimeClear ? `campaign_first_clear_${levelId}` : `campaign_repeat_clear_${levelId}`;

    if (bitsAwarded > 0) {
      this.economy.awardBits(bitsAwarded, bitSource);
    }
    if (xpAwarded > 0) {
      this.economy.awardXP(xpAwarded, xpSource);
    }

    // Persist Updated Level Record
    const bestTime = existingRecord?.bestTime
      ? Math.min(existingRecord.bestTime, elapsedSeconds)
      : elapsedSeconds;
    const bestIntegrity = existingRecord?.bestIntegrity
      ? Math.max(existingRecord.bestIntegrity, evaluation.metrics.integrityRatio)
      : evaluation.metrics.integrityRatio;

    const updatedRecord = {
      levelId,
      gridId: levelConfig.gridId,
      stars: effectiveStars,
      bestTime,
      bestIntegrity,
      completed: true,
      clears: (existingRecord?.clears || 0) + 1,
      lastClearedAt: Date.now()
    };

    // Store records in StorageManager
    this.storage.set(`campaign.levelRecords.${levelId}`, updatedRecord, { autoSave: false });
    this.storage.set('campaign.starsEarned', newTotalStars, { autoSave: false });

    // Update completedNodes array
    const completedNodes = new Set(this.storage.get('campaign.completedNodes', []));
    completedNodes.add(levelId);
    this.storage.set('campaign.completedNodes', Array.from(completedNodes), { autoSave: false });

    // Check newly unlocked levels (next sequential level)
    const unlockedNodes = new Set(this.storage.get('campaign.unlockedNodes', ['level_01_01']));
    const nextLevel = this.registry.getNextLevel(levelId);
    if (nextLevel && this.registry.isGridUnlocked(nextLevel.gridId, newTotalStars)) {
      unlockedNodes.add(nextLevel.id);
    }
    this.storage.set('campaign.unlockedNodes', Array.from(unlockedNodes), { autoSave: false });

    // Evaluate Grid unlock progression
    const unlockedGrids = new Set(this.storage.get('campaign.unlockedGrids', ['grid_01']));
    const newlyUnlockedGrids = [];
    for (const grid of this.registry.getAllGrids()) {
      if (!unlockedGrids.has(grid.id) && this.registry.isGridUnlocked(grid.id, newTotalStars)) {
        unlockedGrids.add(grid.id);
        newlyUnlockedGrids.push(grid.id);
        // Also unlock the first level of the newly unlocked grid
        if (grid.levels.length > 0) {
          unlockedNodes.add(grid.levels[0].id);
        }
        this.emit(CampaignEvents.GRID_UNLOCKED, {
          gridId: grid.id,
          gridName: grid.name,
          totalStars: newTotalStars
        });
      }
    }
    this.storage.set('campaign.unlockedGrids', Array.from(unlockedGrids), { autoSave: false });
    this.storage.set('campaign.unlockedNodes', Array.from(unlockedNodes), { autoSave: false });

    // Check Arena Map unlock for Arbiter first-time clears
    let newlyUnlockedMap = null;
    const arbiterMapId = ARBITER_MAP_IDS[levelId];
    if (arbiterMapId) {
      const currentUnlockedMaps = new Set(this.storage.get('inventory.unlockedMaps', ['arena_grid_01']));
      if (!currentUnlockedMaps.has(arbiterMapId)) {
        currentUnlockedMaps.add(arbiterMapId);
        this.storage.set('inventory.unlockedMaps', Array.from(currentUnlockedMaps), { autoSave: false });
        newlyUnlockedMap = arbiterMapId;
        this.emit(CampaignEvents.ARENA_MAP_UNLOCKED, {
          mapId: arbiterMapId,
          levelId,
          gridId: levelConfig.gridId
        });
      }
    }

    // Persist all state updates immediately
    this.storage.save({ immediate: true });

    // Prepare result payload
    const result = {
      levelId,
      gridId: levelConfig.gridId,
      success: true,
      stars: newStars,
      previousStars,
      deltaStars,
      effectiveStars,
      firstTimeClear,
      rewards: {
        bits: bitsAwarded,
        xp: xpAwarded
      },
      evaluation,
      newlyUnlockedGrids,
      newlyUnlockedMap,
      totalStars: newTotalStars
    };

    if (deltaStars > 0) {
      this.emit(CampaignEvents.STARS_UPDATED, {
        totalStars: newTotalStars,
        deltaStars,
        levelId
      });
    }

    this.emit(CampaignEvents.TRIAL_COMPLETED, result);

    // Reset active trial
    this._activeTrial = null;

    return result;
  }

  /**
   * Concludes an active trial in defeat without awarding progression or payouts.
   * @param {string} [reason='player_de_rez']
   * @returns {object} Defeat summary
   */
  failTrial(reason = 'player_de_rez') {
    if (!this._activeTrial) {
      return null;
    }

    const trial = this._activeTrial;
    const elapsedSeconds = Math.max(0.1, (Date.now() - trial.startTime) / 1000);

    const result = {
      levelId: trial.levelId,
      gridId: trial.levelConfig.gridId,
      success: false,
      reason,
      elapsedSeconds,
      metrics: { ...trial.metrics }
    };

    this.emit(CampaignEvents.TRIAL_FAILED, result);
    this._activeTrial = null;
    return result;
  }

  // ==========================================
  // Query & Progress Accessors
  // ==========================================

  /**
   * Returns active in-flight trial if one is running.
   * @returns {object|null}
   */
  getActiveTrial() {
    return this._activeTrial ? { ...this._activeTrial } : null;
  }

  /**
   * Returns the player's cumulative total Stars earned across all levels.
   * @returns {number}
   */
  getTotalStars() {
    this._ensureStorageInitialized();
    const storedTotal = this.storage.get('campaign.starsEarned');
    if (typeof storedTotal === 'number' && Number.isFinite(storedTotal)) {
      return Math.max(0, Math.floor(storedTotal));
    }

    // Fallback: calculate from levelRecords
    return this.recalculateTotalStars();
  }

  /**
   * Recalculates and updates total stars from levelRecords dictionary.
   * @returns {number}
   */
  recalculateTotalStars() {
    const records = this.getAllLevelRecords();
    let sum = 0;
    for (const record of Object.values(records)) {
      if (typeof record?.stars === 'number') {
        sum += Math.max(0, Math.floor(record.stars));
      }
    }
    this.storage.set('campaign.starsEarned', sum, { immediate: false });
    return sum;
  }

  /**
   * Returns the completion record for a specific level.
   * @param {string} levelId
   * @returns {object|null}
   */
  getLevelRecord(levelId) {
    this._ensureStorageInitialized();
    const records = this.storage.get('campaign.levelRecords', {});
    return records[levelId] || null;
  }

  /**
   * Returns all level completion records.
   * @returns {Record<string, object>}
   */
  getAllLevelRecords() {
    this._ensureStorageInitialized();
    return this.storage.get('campaign.levelRecords', {}) || {};
  }

  /**
   * Returns list of completed level IDs.
   * @returns {Array<string>}
   */
  getCompletedLevels() {
    this._ensureStorageInitialized();
    return this.storage.get('campaign.completedNodes', []) || [];
  }

  /**
   * Checks if a level is unlocked for play.
   * @param {string} levelId
   * @returns {boolean}
   */
  isLevelUnlocked(levelId) {
    const level = this.registry.getLevel(levelId);
    if (!level) return false;

    const totalStars = this.getTotalStars();
    if (!this.registry.isGridUnlocked(level.gridId, totalStars)) {
      return false;
    }

    // Check unlockedNodes in storage
    const unlockedNodes = new Set(this.storage.get('campaign.unlockedNodes', ['level_01_01']));
    if (unlockedNodes.has(levelId)) {
      return true;
    }

    // Dynamic registry unlock evaluation
    const completedNodes = this.getCompletedLevels();
    return this.registry.isLevelUnlocked(levelId, completedNodes, totalStars);
  }

  /**
   * Checks if a Grid is unlocked.
   * @param {string} gridId
   * @returns {boolean}
   */
  isGridUnlocked(gridId) {
    const totalStars = this.getTotalStars();
    return this.registry.isGridUnlocked(gridId, totalStars);
  }

  /**
   * Returns progress overview for a Grid.
   * @param {string} gridId
   * @returns {object|null}
   */
  getGridProgress(gridId) {
    const grid = this.registry.getGrid(gridId);
    if (!grid) return null;

    const totalStars = this.getTotalStars();
    const isUnlocked = this.registry.isGridUnlocked(gridId, totalStars);
    const levels = grid.levels;
    const records = this.getAllLevelRecords();

    let completedCount = 0;
    let earnedStars = 0;

    for (const level of levels) {
      const rec = records[level.id];
      if (rec?.completed) {
        completedCount += 1;
      }
      if (rec?.stars) {
        earnedStars += rec.stars;
      }
    }

    return {
      gridId: grid.id,
      name: grid.name,
      description: grid.description,
      requiredStars: grid.requiredStars,
      isUnlocked,
      totalLevels: levels.length,
      completedLevels: completedCount,
      earnedStars,
      maxStars: levels.length * 3
    };
  }

  /**
   * Retrieves unlocked arena map IDs.
   * @returns {string[]}
   */
  getUnlockedMaps() {
    this._ensureStorageInitialized();
    return this.storage.get('inventory.unlockedMaps', ['arena_grid_01']);
  }
}

export const campaignManager = new CampaignManager();
