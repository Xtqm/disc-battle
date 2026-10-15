/**
 * DuelEconomyBridge.js
 * Duel Arena Match Payouts & Tactical Maneuver Economy Bridge for Tron Disc Arena (SPEC-ACHIEVE-001).
 *
 * Deliverables:
 * - 50 Bits + XP for 1v1/2v2 AI duel victories.
 * - 100 Bits + XP for multiplayer duel victories.
 * - Bounded participation XP on defeat (0 Bits) to prevent anti-farming while respecting player time.
 * - Kinetic floating neon +Bits HUD indicators for high-skill maneuvers:
 *   * Confirmed disc parries (+10 Bits)
 *   * Multi-ricochet hits with 2+ bounces (+15+ Bits)
 *   * Curve eliminations (+25 Bits)
 */

import { economyManager as defaultEconomyManager } from '../core/economy/EconomyManager.js';
import { storageManager as defaultStorageManager } from '../core/storage/StorageManager.js';
import { showFloatingNeonBits } from '../ui/hud.js';

export const DUEL_PAYOUT_CONFIG = Object.freeze({
  AI_VICTORY_BITS: 50,
  AI_VICTORY_XP: 150,
  MULTIPLAYER_VICTORY_BITS: 100,
  MULTIPLAYER_VICTORY_XP: 300,
  AI_DEFEAT_XP: 40,
  MULTIPLAYER_DEFEAT_XP: 75,
  PARRY_BITS: 10,
  PARRY_XP: 20,
  RICOCHET_BASE_BITS: 15,
  RICOCHET_EXTRA_BITS_PER_BOUNCE: 5,
  RICOCHET_XP: 30,
  CURVE_KILL_BITS: 25,
  CURVE_KILL_XP: 50
});

export const DuelEconomyEvents = Object.freeze({
  MATCH_PAYOUT: 'DUEL_MATCH_PAYOUT',
  MANEUVER_REWARD: 'DUEL_MANEUVER_REWARD'
});

export class DuelEconomyBridge {
  /**
   * @param {object} [options]
   * @param {import('../core/economy/EconomyManager.js').EconomyManager} [options.economy]
   * @param {import('../core/storage/StorageManager.js').StorageManager} [options.storage]
   * @param {Function} [options.floatingIndicatorFn]
   */
  constructor(options = {}) {
    this.economy = options.economy || defaultEconomyManager;
    this.storage = options.storage || defaultStorageManager;
    this.floatingIndicatorFn = typeof options.floatingIndicatorFn === 'function'
      ? options.floatingIndicatorFn
      : showFloatingNeonBits;
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
          console.error(`[DuelEconomyBridge] Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  // ==========================================
  // In-Combat Skill Maneuver Rewards
  // ==========================================

  /**
   * Awards Bits + XP for a confirmed incoming disc parry.
   * Spawns a cyan floating HUD indicator.
   * @param {object} [details]
   * @returns {object} Reward payload
   */
  rewardParry(details = {}) {
    const bits = DUEL_PAYOUT_CONFIG.PARRY_BITS;
    const xp = DUEL_PAYOUT_CONFIG.PARRY_XP;

    if (this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(bits, 'maneuver_parry');
    }
    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, 'maneuver_parry');
    }

    if (this.storage && typeof this.storage.get === 'function') {
      try {
        const curParries = Number(this.storage.get('stats.parriesExecuted', 0));
        this.storage.set('stats.parriesExecuted', curParries + 1);
      } catch (_) {}
    }

    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(bits, 'PARRY', {
          color: '#ffffff',
          glow: '#00f3ff',
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'parry', bits, xp, details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  /**
   * Awards Bits + XP for a disc strike executing 2 or more ricochet bounces.
   * Spawns an amber/gold floating HUD indicator.
   * @param {number} bounces
   * @param {object} [details]
   * @returns {object|null} Reward payload or null if bounces < 2
   */
  rewardRicochetHit(bounces, details = {}) {
    const b = Math.max(0, Math.floor(Number(bounces) || 0));
    if (b < 2) return null;

    const extraBounces = b - 2;
    const bits = DUEL_PAYOUT_CONFIG.RICOCHET_BASE_BITS + (extraBounces * DUEL_PAYOUT_CONFIG.RICOCHET_EXTRA_BITS_PER_BOUNCE);
    const xp = DUEL_PAYOUT_CONFIG.RICOCHET_XP;

    if (this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(bits, `maneuver_ricochet_${b}`);
    }
    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, `maneuver_ricochet_${b}`);
    }

    const label = b === 2 ? 'DOUBLE BANK' : `${b}x BANK SHOT`;
    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(bits, label, {
          color: '#ffaa00',
          glow: '#ff5500',
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'ricochet_hit', bounces: b, bits, xp, details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  /**
   * Awards Bits + XP for eliminating a foe using a curved disc throw.
   * Spawns a plasma violet floating HUD indicator.
   * @param {number} [curveIntensity=0]
   * @param {object} [details]
   * @returns {object} Reward payload
   */
  rewardCurveElimination(curveIntensity = 0, details = {}) {
    const bits = DUEL_PAYOUT_CONFIG.CURVE_KILL_BITS;
    const xp = DUEL_PAYOUT_CONFIG.CURVE_KILL_XP;

    if (this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(bits, 'maneuver_curve_kill');
    }
    if (this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, 'maneuver_curve_kill');
    }

    if (this.storage && typeof this.storage.get === 'function') {
      try {
        const curCurves = Number(this.storage.get('stats.curveEliminations', 0));
        this.storage.set('stats.curveEliminations', curCurves + 1);
      } catch (_) {}
    }

    if (typeof this.floatingIndicatorFn === 'function') {
      try {
        this.floatingIndicatorFn(bits, 'CURVE KILL', {
          color: '#bd00ff',
          glow: '#7700ff',
          ...details
        });
      } catch (_) {}
    }

    const payload = { maneuver: 'curve_elimination', curveIntensity, bits, xp, details };
    this.emit(DuelEconomyEvents.MANEUVER_REWARD, payload);
    return payload;
  }

  // ==========================================
  // Match Termination Payouts
  // ==========================================

  /**
   * Processes final match economy payouts based on victory/defeat and match mode.
   * @param {'victory'|'defeat'} outcome
   * @param {'ai'|'multiplayer'} [mode='ai']
   * @param {object} [context={}]
   * @returns {object} Payout summary
   */
  processMatchOutcome(outcome, mode = 'ai', context = {}) {
    const isVictory = outcome === 'victory';
    const isMultiplayer = mode === 'multiplayer';

    let bits = 0;
    let xp = 0;

    if (isVictory) {
      if (isMultiplayer) {
        bits = DUEL_PAYOUT_CONFIG.MULTIPLAYER_VICTORY_BITS;
        xp = DUEL_PAYOUT_CONFIG.MULTIPLAYER_VICTORY_XP;
      } else {
        bits = DUEL_PAYOUT_CONFIG.AI_VICTORY_BITS;
        xp = DUEL_PAYOUT_CONFIG.AI_VICTORY_XP;
      }
    } else {
      // Defeat participation credit (0 Bits, bounded XP)
      bits = 0;
      xp = isMultiplayer
        ? DUEL_PAYOUT_CONFIG.MULTIPLAYER_DEFEAT_XP
        : DUEL_PAYOUT_CONFIG.AI_DEFEAT_XP;
    }

    if (bits > 0 && this.economy && typeof this.economy.awardBits === 'function') {
      this.economy.awardBits(bits, `duel_${mode}_${outcome}`);
    }
    if (xp > 0 && this.economy && typeof this.economy.awardXP === 'function') {
      this.economy.awardXP(xp, `duel_${mode}_${outcome}`);
    }

    const payload = {
      outcome,
      mode,
      bits,
      xp,
      isVictory,
      context
    };

    this.emit(DuelEconomyEvents.MATCH_PAYOUT, payload);
    return payload;
  }
}

export const duelEconomyBridge = new DuelEconomyBridge();
