/**
 * SwarmEconomyBridge.js
 * Swarm Defense Endurance Payout Pipeline for Tron Disc Arena (SPEC-ACHIEVE-001).
 *
 * Awards Bits and XP at the completion of each Swarm wave:
 * - Base yield of 15 Bits/wave scaled by a compound survival streak bonus.
 * - Milestone wave bonus chests every 5 waves (Wave 5, 10, 15, 20+).
 * - Monotonically updates `stats.swarmHighestWave` in StorageManager when a player sets a new record.
 */

import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';

export const SWARM_ECONOMY_CONFIG = Object.freeze({
  BASE_BITS_PER_WAVE: 15,
  BASE_XP_PER_WAVE: 40,
  STREAK_BITS_SCALING: 0.12, // +12% per consecutive wave in streak
  STREAK_XP_SCALING: 0.15,   // +15% per consecutive wave in streak
  MILESTONE_INTERVAL: 5,
  MILESTONE_BASE_BITS: 75,
  MILESTONE_BASE_XP: 150
});

export const SwarmEconomyEvents = Object.freeze({
  WAVE_PAYOUT: 'SWARM_WAVE_PAYOUT',
  MILESTONE_CHEST_UNLOCKED: 'SWARM_MILESTONE_CHEST_UNLOCKED',
  SURVIVAL_RECORD_UPDATED: 'SWARM_SURVIVAL_RECORD_UPDATED'
});

export class SwarmEconomyBridge {
  /**
   * @param {object} [options]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   */
  constructor(options = {}) {
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;
    this.streak = 0;
    this._listeners = new Map();
  }

  // ==========================================
  // Event Emitter
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
          console.error(`[SwarmEconomyBridge] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // Calculations
  // ==========================================

  /**
   * Calculates wave payout math deterministically.
   * @param {number} wave Wave number
   * @param {number} [streak] Optional streak count (defaults to wave)
   * @returns {object} Payout breakdown
   */
  calculateWavePayout(wave, streak = wave) {
    const w = Math.max(1, Math.floor(Number(wave) || 1));
    const s = Math.max(1, Math.floor(Number(streak) || 1));

    // Base wave payout scaled by streak bonus
    const streakMultiplier = 1 + (s - 1) * SWARM_ECONOMY_CONFIG.STREAK_BITS_SCALING;
    const waveBits = Math.floor(SWARM_ECONOMY_CONFIG.BASE_BITS_PER_WAVE * streakMultiplier);

    const xpMultiplier = 1 + (s - 1) * SWARM_ECONOMY_CONFIG.STREAK_XP_SCALING;
    const waveXP = Math.floor(SWARM_ECONOMY_CONFIG.BASE_XP_PER_WAVE * xpMultiplier);

    // Milestone Chest evaluation (every 5 waves)
    const isMilestone = (w % SWARM_ECONOMY_CONFIG.MILESTONE_INTERVAL === 0);
    const tier = isMilestone ? Math.floor(w / SWARM_ECONOMY_CONFIG.MILESTONE_INTERVAL) : 0;
    const milestoneBits = isMilestone ? tier * SWARM_ECONOMY_CONFIG.MILESTONE_BASE_BITS : 0;
    const milestoneXP = isMilestone ? tier * SWARM_ECONOMY_CONFIG.MILESTONE_BASE_XP : 0;

    return {
      wave: w,
      streak: s,
      waveBits,
      waveXP,
      isMilestone,
      tier,
      milestoneBits,
      milestoneXP,
      totalBits: waveBits + milestoneBits,
      totalXP: waveXP + milestoneXP
    };
  }

  /**
   * Resets active survival streak (e.g. on player death or new run).
   */
  resetStreak() {
    this.streak = 0;
  }

  /**
   * Processes completion of a Swarm wave, dispensing economy payouts and checking record milestones.
   * @param {number} wave Completed wave number
   * @returns {object} Execution report
   */
  processWaveCompletion(wave) {
    const w = Math.max(1, Math.floor(Number(wave) || 1));
    this.streak += 1;

    const payout = this.calculateWavePayout(w, this.streak);

    // Credit Bits and XP via authoritative EconomyManager
    if (this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(payout.totalBits, `swarm_wave_${w}`);
    }
    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(payout.totalXP, `swarm_wave_${w}`);
    }

    // Monotonically update stats.swarmHighestWave in StorageManager
    let newRecord = false;
    let previousRecord = 1;
    if (this.storage && typeof this.storage.get === 'function' && typeof this.storage.set === 'function') {
      previousRecord = this.storage.get('stats.swarmHighestWave', 1) || 1;
      if (w > previousRecord) {
        this.storage.set('stats.swarmHighestWave', w);
        this.storage.set('stats.highestWave', w);
        newRecord = true;
        this.emit(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, {
          previousRecord,
          newRecord: w
        });
      }
    }

    // Emit wave payout event
    this.emit(SwarmEconomyEvents.WAVE_PAYOUT, {
      wave: w,
      streak: this.streak,
      payout,
      newRecord,
      previousRecord
    });

    if (payout.isMilestone) {
      this.emit(SwarmEconomyEvents.MILESTONE_CHEST_UNLOCKED, {
        wave: w,
        tier: payout.tier,
        milestoneBits: payout.milestoneBits,
        milestoneXP: payout.milestoneXP
      });
    }

    return {
      success: true,
      wave: w,
      streak: this.streak,
      payout,
      newRecord
    };
  }
}

export const swarmEconomyBridge = new SwarmEconomyBridge();
