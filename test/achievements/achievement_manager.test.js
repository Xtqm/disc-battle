/**
 * achievement_manager.test.js
 * Integration test suite for AchievementManager (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  AchievementManager,
  AchievementEvents
} from '../../src/achievements/AchievementManager.js';
import { StorageEvents } from '../../src/core/storage/schema.js';

console.log('--- Running Achievement Manager Test Suite (SPEC-ACHIEVE-001) ---');

// Mock in-memory storage manager
function createMockStorage(initialState = {}) {
  const state = {
    version: '1.0.0',
    player: {
      currency: { bits: 0, sparks: 0 }
    },
    inventory: {
      discSkins: ['disc_default'],
      chassisSkins: ['chassis_default'],
      discs: ['disc_default'],
      cosmetics: ['chassis_default']
    },
    achievements: [],
    stats: {
      totalDerezzes: 0,
      parriesExecuted: 0,
      curveEliminations: 0,
      swarmHighestWave: 1,
      highestWave: 1
    },
    campaign: {
      levelRecords: {},
      starsEarned: 0
    },
    ...initialState
  };

  const listeners = new Map();

  return {
    isInitialized: true,
    state,
    load() { return state; },
    get(path, defaultValue) {
      if (!path) return state;
      const parts = path.split('.');
      let curr = state;
      for (const p of parts) {
        if (curr === null || curr === undefined) return defaultValue;
        curr = curr[p];
      }
      return curr !== undefined ? curr : defaultValue;
    },
    set(path, value) {
      const parts = path.split('.');
      let curr = state;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      if (listeners.has(StorageEvents.MUTATED)) {
        for (const fn of listeners.get(StorageEvents.MUTATED)) {
          fn({ path, value });
        }
      }
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    }
  };
}

// Mock Economy Manager
function createMockEconomy() {
  let bits = 0;
  const history = [];
  return {
    getBits: () => bits,
    awardBits: (amount, source) => {
      bits += amount;
      history.push({ amount, source });
      return true;
    },
    getHistory: () => [...history]
  };
}

// Mock Armory Manager
function createMockArmory() {
  const unlocked = new Set();
  return {
    unlockRewardItem: (category, itemId) => {
      unlocked.add(`${category}:${itemId}`);
      return true;
    },
    isUnlocked: (category, itemId) => unlocked.has(`${category}:${itemId}`),
    getUnlocked: () => Array.from(unlocked)
  };
}

// =========================================================================
// Test Group 1: Boot-Time Retroactive Reconciliation
// =========================================================================
console.log('\n[Group 1] Testing Boot-Time Retroactive Reconciliation...');

const initialStorage = createMockStorage({
  stats: {
    totalDerezzes: 10,
    parriesExecuted: 5,
    curveEliminations: 0,
    swarmHighestWave: 16
  },
  campaign: {
    levelRecords: {
      level_01_01: { stars: 3, completed: true, bestIntegrity: 0.9 },
      level_01_02: { stars: 3, completed: true, bestIntegrity: 0.8 },
      level_01_03: { stars: 3, completed: true, bestIntegrity: 0.75 },
      level_01_04: { stars: 3, completed: true, bestIntegrity: 0.95 },
      level_01_05: { stars: 3, completed: true, bestIntegrity: 0.8 },
      level_01_06: { stars: 3, completed: true, bestIntegrity: 0.85 }
    }
  }
});

const economy1 = createMockEconomy();
const armory1 = createMockArmory();
let toastCount = 0;

const manager1 = new AchievementManager({
  storage: initialStorage,
  economy: economy1,
  armory: armory1,
  onUnlockToast: () => { toastCount++; }
});

// Boot the manager
manager1.init();

// ach_first_blood (10 derezzes >= 1), ach_swarm_survivor (wave 16 >= 15), ach_grid_one_master (18 stars)
assert.strictEqual(manager1.isUnlocked('ach_first_blood'), true);
assert.strictEqual(manager1.isUnlocked('ach_swarm_survivor'), true);
assert.strictEqual(manager1.isUnlocked('ach_grid_one_master'), true);

// ach_curve_god and ach_parry_king should still be locked
assert.strictEqual(manager1.isUnlocked('ach_curve_god'), false);
assert.strictEqual(manager1.isUnlocked('ach_parry_king'), false);
assert.strictEqual(manager1.isUnlocked('ach_untouchable'), false);

// Rewards: 100 + 750 + 1000 = 1850 Bits
assert.strictEqual(economy1.getBits(), 1850);

// Cosmetic rewards
assert.ok(armory1.isUnlocked('discSkins', 'disc_corrupted_void'));
assert.ok(armory1.isUnlocked('chassisSkins', 'chassis_arbiter'));

// Toast suppressed on boot-time retroactive reconciliation
assert.strictEqual(toastCount, 0, 'No toasts should be shown during silent boot reconciliation');

console.log('✓ Group 1: Retroactive boot reconciliation and reward distribution verified.');

// =========================================================================
// Test Group 2: Idempotence & Duplicate Prevention
// =========================================================================
console.log('\n[Group 2] Testing Duplicate Unlock & Reward Prevention...');

const historyLengthBefore = economy1.getHistory().length;
const newlyReconciled = manager1.reconcileAchievements();
assert.strictEqual(newlyReconciled.length, 0, 'No new achievements should be unlocked');
assert.strictEqual(economy1.getHistory().length, historyLengthBefore, 'No duplicate rewards should be granted');

// Explicit duplicate unlock call returns false
assert.strictEqual(manager1.unlock('ach_first_blood'), false);

console.log('✓ Group 2: Duplicate prevention verified.');

// =========================================================================
// Test Group 3: Runtime Reactive Mutation Evaluation
// =========================================================================
console.log('\n[Group 3] Testing Runtime Reactive Telemetry Mutation...');

const economy2 = createMockEconomy();
const armory2 = createMockArmory();
const storage2 = createMockStorage();
const toastEvents = [];
const unlockEvents = [];

const manager2 = new AchievementManager({
  storage: storage2,
  economy: economy2,
  armory: armory2,
  onUnlockToast: (ach) => { toastEvents.push(ach); }
});

manager2.on(AchievementEvents.ACHIEVEMENT_UNLOCKED, (e) => {
  unlockEvents.push(e);
});

manager2.init();
assert.strictEqual(manager2.getCompletionStats().unlocked, 0);

// Execute 50 parries in combat
storage2.set('stats.parriesExecuted', 50);

assert.strictEqual(manager2.isUnlocked('ach_parry_king'), true);
assert.strictEqual(economy2.getBits(), 250);
assert.strictEqual(toastEvents.length, 1);
assert.strictEqual(toastEvents[0].id, 'ach_parry_king');
assert.strictEqual(unlockEvents.length, 1);
assert.strictEqual(unlockEvents[0].achievementId, 'ach_parry_king');

// Complete a trial with 100% integrity
storage2.set('campaign.levelRecords.level_01_01', {
  completed: true,
  bestIntegrity: 1.0,
  stars: 3
});

assert.strictEqual(manager2.isUnlocked('ach_untouchable'), true);
assert.strictEqual(economy2.getBits(), 250 + 500); // 750 Bits total
assert.strictEqual(toastEvents.length, 2);
assert.strictEqual(toastEvents[1].id, 'ach_untouchable');

console.log('✓ Group 3: Runtime reactive unlocks, rewards, and toast dispatch verified.');

// =========================================================================
// Test Group 4: Matrix Status & Completion Percentage
// =========================================================================
console.log('\n[Group 4] Testing Matrix Status and Completion Stats...');

const stats = manager2.getCompletionStats();
assert.strictEqual(stats.total, 6);
assert.strictEqual(stats.unlocked, 2); // ach_parry_king and ach_untouchable
assert.strictEqual(stats.percentage, 33); // 2/6 = 33%

const matrix = manager2.getMatrixStatus();
assert.strictEqual(matrix.length, 6);

const parryStatus = matrix.find(a => a.id === 'ach_parry_king');
assert.ok(parryStatus);
assert.strictEqual(parryStatus.unlocked, true);
assert.strictEqual(parryStatus.progress.ratio, 1.0);

const curveStatus = matrix.find(a => a.id === 'ach_curve_god');
assert.ok(curveStatus);
assert.strictEqual(curveStatus.unlocked, false);
assert.strictEqual(curveStatus.progress.ratio, 0);

console.log('✓ Group 4: Matrix status and completion percentage validated.');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENT MANAGER TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
