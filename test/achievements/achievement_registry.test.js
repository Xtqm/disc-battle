/**
 * achievement_registry.test.js
 * Unit test suite for AchievementRegistry & Launch Matrix (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  ACHIEVEMENT_CATEGORIES,
  LAUNCH_ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  GRID_01_LEVEL_IDS,
  getAchievement,
  getAllAchievements,
  getAchievementsByCategory,
  calculateProgress
} from '../../src/achievements/AchievementRegistry.js';

console.log('--- Running Achievement Registry Test Suite (SPEC-ACHIEVE-001) ---');

// =========================================================================
// Test Group 1: Registry Completeness & Structure
// =========================================================================
console.log('\n[Group 1] Testing Launch Achievement Matrix Metadata...');

assert.strictEqual(LAUNCH_ACHIEVEMENTS.length, 6, 'Launch matrix must have exactly 6 achievements');
assert.strictEqual(getAllAchievements().length, 6);

const expectedIds = [
  'ach_first_blood',
  'ach_curve_god',
  'ach_parry_king',
  'ach_untouchable',
  'ach_swarm_survivor',
  'ach_grid_one_master'
];

for (const id of expectedIds) {
  const ach = getAchievement(id);
  assert.ok(ach, `Achievement ${id} must exist in registry`);
  assert.strictEqual(ach.id, id);
  assert.ok(typeof ach.title === 'string' && ach.title.length > 0, `${id} must have non-empty title`);
  assert.ok(typeof ach.description === 'string' && ach.description.length > 0, `${id} must have non-empty description`);
  assert.ok(Object.values(ACHIEVEMENT_CATEGORIES).includes(ach.category), `${id} must have valid category`);
  assert.ok(typeof ach.target === 'number' && ach.target > 0, `${id} target must be positive number`);
  assert.ok(ach.reward, `${id} must have reward object`);
  assert.ok(typeof ach.reward.bits === 'number' && ach.reward.bits > 0, `${id} bits reward must be > 0`);
  assert.ok(typeof ach.evaluate === 'function', `${id} must have an evaluate function`);
}

// Check specific reward amounts per specification
assert.strictEqual(getAchievement('ach_first_blood').reward.bits, 100);
assert.strictEqual(getAchievement('ach_first_blood').reward.cosmetic, null);

assert.strictEqual(getAchievement('ach_curve_god').reward.bits, 300);
assert.strictEqual(getAchievement('ach_curve_god').reward.cosmetic, null);

assert.strictEqual(getAchievement('ach_parry_king').reward.bits, 250);
assert.strictEqual(getAchievement('ach_parry_king').reward.cosmetic, null);

assert.strictEqual(getAchievement('ach_untouchable').reward.bits, 500);
assert.strictEqual(getAchievement('ach_untouchable').reward.cosmetic, null);

const swarmAch = getAchievement('ach_swarm_survivor');
assert.strictEqual(swarmAch.reward.bits, 750);
assert.ok(swarmAch.reward.cosmetic);
assert.strictEqual(swarmAch.reward.cosmetic.category, 'discSkins');
assert.strictEqual(swarmAch.reward.cosmetic.itemId, 'disc_corrupted_void');

const grid1Ach = getAchievement('ach_grid_one_master');
assert.strictEqual(grid1Ach.reward.bits, 1000);
assert.ok(grid1Ach.reward.cosmetic);
assert.strictEqual(grid1Ach.reward.cosmetic.category, 'chassisSkins');
assert.strictEqual(grid1Ach.reward.cosmetic.itemId, 'chassis_arbiter');

console.log('✓ Group 1: Launch matrix metadata and rewards validated.');

// =========================================================================
// Test Group 2: Categorization & Lookup
// =========================================================================
console.log('\n[Group 2] Testing Category Filtering and Map Lookup...');

const combatAchs = getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.COMBAT);
assert.strictEqual(combatAchs.length, 3, 'Combat should have 3 achievements');
assert.ok(combatAchs.some(a => a.id === 'ach_first_blood'));
assert.ok(combatAchs.some(a => a.id === 'ach_curve_god'));
assert.ok(combatAchs.some(a => a.id === 'ach_parry_king'));

const campaignAchs = getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.CAMPAIGN);
assert.strictEqual(campaignAchs.length, 2, 'Campaign should have 2 achievements');
assert.ok(campaignAchs.some(a => a.id === 'ach_untouchable'));
assert.ok(campaignAchs.some(a => a.id === 'ach_grid_one_master'));

const survivalAchs = getAchievementsByCategory(ACHIEVEMENT_CATEGORIES.SURVIVAL);
assert.strictEqual(survivalAchs.length, 1, 'Survival should have 1 achievement');
assert.ok(survivalAchs.some(a => a.id === 'ach_swarm_survivor'));

assert.strictEqual(getAchievement('non_existent'), null);
assert.strictEqual(getAchievement(null), null);
assert.strictEqual(getAchievement(''), null);
assert.deepStrictEqual(getAchievementsByCategory('invalid_category'), []);

console.log('✓ Group 2: Category filtering and lookups verified.');

// =========================================================================
// Test Group 3: Criteria Evaluators and Progress Calculation
// =========================================================================
console.log('\n[Group 3] Testing Evaluators & Progress Functions...');

// 3.1 Initial Execution (ach_first_blood)
const stateEmpty = { stats: {} };
const progBlood0 = calculateProgress('ach_first_blood', stateEmpty);
assert.strictEqual(progBlood0.current, 0);
assert.strictEqual(progBlood0.target, 1);
assert.strictEqual(progBlood0.ratio, 0);
assert.strictEqual(progBlood0.satisfied, false);

const stateBlood1 = { stats: { totalDerezzes: 1 } };
const progBlood1 = calculateProgress('ach_first_blood', stateBlood1);
assert.strictEqual(progBlood1.current, 1);
assert.strictEqual(progBlood1.ratio, 1);
assert.strictEqual(progBlood1.satisfied, true);

// 3.2 Geometric Curved Path (ach_curve_god)
const stateCurve10 = { stats: { curveEliminations: 10 } };
const progCurve10 = calculateProgress('ach_curve_god', stateCurve10);
assert.strictEqual(progCurve10.current, 10);
assert.strictEqual(progCurve10.target, 25);
assert.strictEqual(progCurve10.ratio, 10 / 25);
assert.strictEqual(progCurve10.satisfied, false);

const stateCurve30 = { stats: { curveEliminations: 30 } };
const progCurve30 = calculateProgress('ach_curve_god', stateCurve30);
assert.strictEqual(progCurve30.current, 30);
assert.strictEqual(progCurve30.ratio, 1); // clamped to 1.0
assert.strictEqual(progCurve30.satisfied, true);

// 3.3 Deflective Protocol (ach_parry_king)
const stateParry25 = { stats: { parriesExecuted: 25 } };
const progParry25 = calculateProgress('ach_parry_king', stateParry25);
assert.strictEqual(progParry25.current, 25);
assert.strictEqual(progParry25.ratio, 0.5);
assert.strictEqual(progParry25.satisfied, false);

const stateParry50 = { stats: { parriesExecuted: 50 } };
const progParry50 = calculateProgress('ach_parry_king', stateParry50);
assert.strictEqual(progParry50.satisfied, true);

// 3.4 Flawless Subroutine (ach_untouchable)
const stateTrialImperfect = {
  campaign: {
    levelRecords: {
      level_01_01: { completed: true, bestIntegrity: 0.85 }
    }
  }
};
assert.strictEqual(calculateProgress('ach_untouchable', stateTrialImperfect).satisfied, false);

const stateTrialPerfect = {
  campaign: {
    levelRecords: {
      level_01_01: { completed: true, bestIntegrity: 0.85 },
      level_01_02: { completed: true, bestIntegrity: 1.0 }
    }
  }
};
const progUntouchable = calculateProgress('ach_untouchable', stateTrialPerfect);
assert.strictEqual(progUntouchable.satisfied, true);
assert.strictEqual(progUntouchable.ratio, 1);

// 3.5 Endless Firewall (ach_swarm_survivor)
const stateSwarm10 = { stats: { swarmHighestWave: 10 } };
const progSwarm10 = calculateProgress('ach_swarm_survivor', stateSwarm10);
assert.strictEqual(progSwarm10.current, 10);
assert.strictEqual(progSwarm10.satisfied, false);

const stateSwarm15 = { stats: { swarmHighestWave: 15 } };
assert.strictEqual(calculateProgress('ach_swarm_survivor', stateSwarm15).satisfied, true);

// 3.6 Outlands Conqueror (ach_grid_one_master - all 18 stars across Grid 01)
const stateGrid1Partial = {
  campaign: {
    levelRecords: {
      level_01_01: { stars: 3 },
      level_01_02: { stars: 3 },
      level_01_03: { stars: 3 },
      level_01_04: { stars: 2 },
      level_01_05: { stars: 3 },
      level_01_06: { stars: 3 }
    }
  }
};
const progGridPart = calculateProgress('ach_grid_one_master', stateGrid1Partial);
assert.strictEqual(progGridPart.current, 17);
assert.strictEqual(progGridPart.satisfied, false);

const stateGrid1Full = {
  campaign: {
    levelRecords: {
      level_01_01: { stars: 3 },
      level_01_02: { stars: 3 },
      level_01_03: { stars: 3 },
      level_01_04: { stars: 3 },
      level_01_05: { stars: 3 },
      level_01_06: { stars: 3 }
    }
  }
};
const progGridFull = calculateProgress('ach_grid_one_master', stateGrid1Full);
assert.strictEqual(progGridFull.current, 18);
assert.strictEqual(progGridFull.ratio, 1);
assert.strictEqual(progGridFull.satisfied, true);

console.log('✓ Group 3: Criteria evaluation and progress functions verified.');

console.log('\n======================================================');
console.log('ALL ACHIEVEMENT REGISTRY TESTS PASSED CLEANLY (100%)');
console.log('======================================================');
