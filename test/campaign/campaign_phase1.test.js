/**
 * test_campaign_phase1.js
 * Comprehensive unit and integration test suite for:
 * Phase 1 Campaign Data Registry, Star Gating & Objective Evaluator (SPEC-CAMP-001).
 */

import assert from 'assert';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import {
  CampaignRegistry,
  campaignRegistry,
  CAMPAIGN_GRIDS,
  DIFFICULTY_TIERS,
  LEVEL_TYPES
} from '../../src/campaign/CampaignRegistry.js';
import {
  StarEvaluator,
  starEvaluator,
  DEFAULT_STAR_THRESHOLDS
} from '../../src/campaign/StarEvaluator.js';
import {
  CampaignManager,
  campaignManager,
  CampaignEvents
} from '../../src/campaign/CampaignManager.js';

console.log('--- Running Campaign Phase 1 (SPEC-CAMP-001) Test Suite ---');

// =========================================================================
// [Group 1] CampaignRegistry Data Integrity & Query API
// =========================================================================
console.log('\n[Group 1] Testing CampaignRegistry Data Integrity & Query API...');

const registry = new CampaignRegistry();
const allGrids = registry.getAllGrids();
assert.strictEqual(allGrids.length, 4, 'Should register exactly 4 Grids');

// Grid Level Counts
const grid1 = registry.getGrid('grid_01');
const grid2 = registry.getGrid('grid_02');
const grid3 = registry.getGrid('grid_03');
const grid4 = registry.getGrid('grid_04');

assert(grid1, 'Grid 01 exists');
assert(grid2, 'Grid 02 exists');
assert(grid3, 'Grid 03 exists');
assert(grid4, 'Grid 04 exists');

assert.strictEqual(grid1.levels.length, 6, 'Grid 01 must have 6 levels');
assert.strictEqual(grid2.levels.length, 7, 'Grid 02 must have 7 levels');
assert.strictEqual(grid3.levels.length, 7, 'Grid 03 must have 7 levels');
assert.strictEqual(grid4.levels.length, 8, 'Grid 04 must have 8 levels');

// Cumulative Star Unlock Thresholds
assert.strictEqual(grid1.requiredStars, 0, 'Grid 01 requires 0 stars');
assert.strictEqual(grid2.requiredStars, 10, 'Grid 02 requires 10 stars');
assert.strictEqual(grid3.requiredStars, 22, 'Grid 03 requires 22 stars');
assert.strictEqual(grid4.requiredStars, 36, 'Grid 04 requires 36 stars');

// Total levels and max stars calculation
const totalLevels = grid1.levels.length + grid2.levels.length + grid3.levels.length + grid4.levels.length;
assert.strictEqual(totalLevels, 28, 'Campaign must span 28 levels across 4 Grids');
assert.strictEqual(registry.calculateMaxPossibleStars(), 84, 'Max possible stars must equal 84 (28 * 3)');

// Verify each level has valid structure, wave compositions, star thresholds, and payouts
for (const grid of allGrids) {
  for (const level of grid.levels) {
    assert(level.id, `Level in ${grid.id} has valid ID`);
    assert(level.name, `Level ${level.id} has valid name`);
    assert(Array.isArray(level.waves) && level.waves.length > 0, `Level ${level.id} has waves`);
    assert(level.starThresholds, `Level ${level.id} has starThresholds`);
    assert.strictEqual(level.starThresholds.minIntegrityRatio, 0.75, `Level ${level.id} minIntegrity is 0.75`);
    assert(level.starThresholds.targetTimeSeconds > 0, `Level ${level.id} has positive targetTimeSeconds`);
    assert(level.starThresholds.minPrecisionHits > 0, `Level ${level.id} has positive minPrecisionHits`);
    assert(level.payouts, `Level ${level.id} has payouts`);

    if (level.type === LEVEL_TYPES.ARBITER) {
      assert.strictEqual(level.payouts.firstClearBits, 500, `Arbiter ${level.id} pays 500 firstClearBits`);
      assert.strictEqual(level.payouts.repeatClearBits, 100, `Arbiter ${level.id} pays 100 repeatClearBits`);
    } else {
      assert(level.payouts.firstClearBits >= 100 && level.payouts.firstClearBits <= 250, `Trial ${level.id} pays 100-250 Bits on first clear`);
      assert(level.payouts.repeatClearBits >= 25 && level.payouts.repeatClearBits <= 50, `Trial ${level.id} pays 25-50 Bits on repeat clear`);
    }
  }
}

// Query Helpers & Bounds
assert.strictEqual(registry.getGrid('non_existent'), null);
assert.strictEqual(registry.getLevel('non_existent'), null);
assert.strictEqual(registry.getLevelsForGrid('non_existent').length, 0);

// Sequential level navigation
const firstLevel = registry.getLevel('level_01_01');
const nextLevel = registry.getNextLevel('level_01_01');
assert.strictEqual(nextLevel.id, 'level_01_02');

// Level transition across grid boundary
const lastLevelGrid1 = registry.getLevel('level_01_06');
const firstLevelGrid2 = registry.getNextLevel('level_01_06');
assert.strictEqual(firstLevelGrid2.id, 'level_02_01');

// Last level in campaign has no next level
const finalLevel = registry.getLevel('level_04_08');
assert.strictEqual(registry.getNextLevel('level_04_08'), null);

// Grid Unlock check
assert.strictEqual(registry.isGridUnlocked('grid_01', 0), true);
assert.strictEqual(registry.isGridUnlocked('grid_02', 9), false);
assert.strictEqual(registry.isGridUnlocked('grid_02', 10), true);
assert.strictEqual(registry.isGridUnlocked('grid_03', 21), false);
assert.strictEqual(registry.isGridUnlocked('grid_03', 22), true);
assert.strictEqual(registry.isGridUnlocked('grid_04', 35), false);
assert.strictEqual(registry.isGridUnlocked('grid_04', 36), true);

console.log('✓ CampaignRegistry 28 levels, wave structures, thresholds, and unlock criteria verified');

// =========================================================================
// [Group 2] StarEvaluator Deterministic Scoring
// =========================================================================
console.log('\n[Group 2] Testing StarEvaluator Deterministic Scoring Engine...');

const evalConfig = {
  starThresholds: {
    minIntegrityRatio: 0.75,
    targetTimeSeconds: 60,
    minPrecisionHits: 3
  }
};

// Case 1: Trial not cleared (e.g. player died or fell into void) -> 0 stars
const evalFailed = StarEvaluator.evaluate(evalConfig, { cleared: false, finalHp: 80, elapsedSeconds: 30, precisionHits: 5 });
assert.strictEqual(evalFailed.stars, 0);
assert.strictEqual(evalFailed.star1, false);
assert.strictEqual(evalFailed.star2, false);
assert.strictEqual(evalFailed.star3, false);
assert.strictEqual(evalFailed.breakdown.deRez, false);

// Case 2: Cleared, but low integrity (50%) and slow (80s), 0 precision hits -> 1 Star (Star 1 De-Rez only)
const evalStar1 = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalHp: 50,
  maxHp: 100,
  elapsedSeconds: 80,
  curveHits: 0,
  ricochetHits: 0
});
assert.strictEqual(evalStar1.stars, 1);
assert.strictEqual(evalStar1.star1, true);
assert.strictEqual(evalStar1.star2, false);
assert.strictEqual(evalStar1.star3, false);
assert.strictEqual(evalStar1.breakdown.integrity, false);
assert.strictEqual(evalStar1.breakdown.mastery, false);

// Case 3: Cleared with high integrity (90%), but slow (75s) and low precision (1) -> 2 Stars (Star 1 + Star 2)
const evalStar2Integrity = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 75,
  curveHits: 1,
  ricochetHits: 0
});
assert.strictEqual(evalStar2Integrity.stars, 2);
assert.strictEqual(evalStar2Integrity.star1, true);
assert.strictEqual(evalStar2Integrity.star2, true);
assert.strictEqual(evalStar2Integrity.star3, false);

// Case 4: Cleared with low integrity (60%), but fast time (45s <= 60s) -> 2 Stars (Star 1 + Star 3 via time)
const evalStar2Time = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalHp: 60,
  maxHp: 100,
  elapsedSeconds: 45,
  precisionHits: 1
});
assert.strictEqual(evalStar2Time.stars, 2);
assert.strictEqual(evalStar2Time.star1, true);
assert.strictEqual(evalStar2Time.star2, false);
assert.strictEqual(evalStar2Time.star3, true);
assert.strictEqual(evalStar2Time.breakdown.masteryViaTime, true);
assert.strictEqual(evalStar2Time.breakdown.masteryViaPrecision, false);

// Case 5: Cleared with low integrity (60%), slow (75s), but high precision (2 curve + 2 ricochet = 4 >= 3) -> 2 Stars (Star 1 + Star 3 via precision)
const evalStar2Precision = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalHp: 60,
  maxHp: 100,
  elapsedSeconds: 75,
  curveHits: 2,
  ricochetHits: 2
});
assert.strictEqual(evalStar2Precision.stars, 2);
assert.strictEqual(evalStar2Precision.star1, true);
assert.strictEqual(evalStar2Precision.star2, false);
assert.strictEqual(evalStar2Precision.star3, true);
assert.strictEqual(evalStar2Precision.breakdown.masteryViaPrecision, true);

// Case 6: Full 3 Stars (cleared, 85% HP, fast time 50s, 4 precision hits)
const evalFull3 = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalHp: 85,
  maxHp: 100,
  elapsedSeconds: 50,
  curveHits: 2,
  ricochetHits: 2
});
assert.strictEqual(evalFull3.stars, 3);
assert.strictEqual(evalFull3.star1, true);
assert.strictEqual(evalFull3.star2, true);
assert.strictEqual(evalFull3.star3, true);
assert.strictEqual(evalFull3.breakdown.deRez, true);
assert.strictEqual(evalFull3.breakdown.integrity, true);
assert.strictEqual(evalFull3.breakdown.mastery, true);

// Case 7: Epsilon floating integrity tolerance (74.999% HP vs 75%)
const evalEpsilon = StarEvaluator.evaluate(evalConfig, {
  cleared: true,
  finalIntegrity: 0.749995,
  elapsedSeconds: 80,
  precisionHits: 0
});
assert.strictEqual(evalEpsilon.star2, true, 'Epsilon guard awards Star 2 for floating point precision');

console.log('✓ StarEvaluator pure calculations and all condition permutations verified');

// =========================================================================
// [Group 3] CampaignManager Trial Lifecycle & Telemetry
// =========================================================================
console.log('\n[Group 3] Testing CampaignManager Trial Lifecycle & Telemetry...');

const testStorage = new StorageManager({
  storageKey: 'tron_test_campaign_storage',
  backupKey: 'tron_test_campaign_storage.bak',
  debounceMs: 10
});
testStorage.load();

const testEconomy = new EconomyManager({
  storage: testStorage
});

const testManager = new CampaignManager({
  registry,
  evaluator: starEvaluator,
  storage: testStorage,
  economy: testEconomy
});

// Initial campaign state
assert.strictEqual(testManager.getTotalStars(), 0);
assert.strictEqual(testManager.isLevelUnlocked('level_01_01'), true);
assert.strictEqual(testManager.isLevelUnlocked('level_01_02'), false);
assert.strictEqual(testManager.isGridUnlocked('grid_02'), false);

// Cannot start non-existent level
assert.throws(() => {
  testManager.startTrial('invalid_level');
});

// Cannot start locked level
assert.throws(() => {
  testManager.startTrial('level_01_02');
});

// Start valid trial
let trialStartedEmitted = false;
testManager.on(CampaignEvents.TRIAL_STARTED, (payload) => {
  if (payload.levelId === 'level_01_01') trialStartedEmitted = true;
});

const trialSession = testManager.startTrial('level_01_01');
assert(trialStartedEmitted, 'TRIAL_STARTED event emitted');
assert.strictEqual(trialSession.levelId, 'level_01_01');
assert.strictEqual(testManager.getActiveTrial()?.levelId, 'level_01_01');

// Record telemetry metrics
testManager.recordMetric('curveHit', 1);
testManager.recordMetric('curveHit', 1);
testManager.recordMetric('ricochetHit', 2);
testManager.recordMetric('damageTaken', 20);
testManager.recordMetric('finalHp', 80);

const activeTrial = testManager.getActiveTrial();
assert.strictEqual(activeTrial.metrics.curveHits, 2);
assert.strictEqual(activeTrial.metrics.ricochetHits, 2);
assert.strictEqual(activeTrial.metrics.finalHp, 80);

// Test failTrial
let trialFailedEmitted = false;
testManager.on(CampaignEvents.TRIAL_FAILED, () => {
  trialFailedEmitted = true;
});
const failOutcome = testManager.failTrial('void_plunge');
assert(trialFailedEmitted, 'TRIAL_FAILED emitted on failure');
assert.strictEqual(failOutcome.success, false);
assert.strictEqual(failOutcome.reason, 'void_plunge');
assert.strictEqual(testManager.getActiveTrial(), null, 'Active trial cleared after fail');
assert.strictEqual(testManager.getTotalStars(), 0, 'No stars awarded on failure');

console.log('✓ CampaignManager trial initialization, telemetry recording, and fail handling verified');

// =========================================================================
// [Group 4] Monotonic Star Upgrades & Gating
// =========================================================================
console.log('\n[Group 4] Testing Monotonic Star Upgrades & Delta Progression...');

// Step 1: Clear level_01_01 with 1 Star (low HP, slow time, low precision)
testManager.startTrial('level_01_01');
const run1 = testManager.completeTrial({
  finalHp: 50,
  maxHp: 100,
  elapsedSeconds: 70,
  curveHits: 0,
  ricochetHits: 0
});
assert.strictEqual(run1.stars, 1);
assert.strictEqual(run1.previousStars, 0);
assert.strictEqual(run1.deltaStars, 1);
assert.strictEqual(run1.effectiveStars, 1);
assert.strictEqual(run1.firstTimeClear, true);
assert.strictEqual(testManager.getTotalStars(), 1);

// Step 2: Replay level_01_01 and achieve 1 Star again -> 0 delta stars awarded
testManager.startTrial('level_01_01');
const run2 = testManager.completeTrial({
  finalHp: 50,
  maxHp: 100,
  elapsedSeconds: 70,
  curveHits: 0,
  ricochetHits: 0
});
assert.strictEqual(run2.stars, 1);
assert.strictEqual(run2.previousStars, 1);
assert.strictEqual(run2.deltaStars, 0);
assert.strictEqual(run2.effectiveStars, 1);
assert.strictEqual(run2.firstTimeClear, false);
assert.strictEqual(testManager.getTotalStars(), 1, 'Total stars must remain 1');

// Step 3: Upgrade level_01_01 from 1 Star to 3 Stars (high HP, fast time)
testManager.startTrial('level_01_01');
const run3 = testManager.completeTrial({
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 20,
  curveHits: 2,
  ricochetHits: 2
});
assert.strictEqual(run3.stars, 3);
assert.strictEqual(run3.previousStars, 1);
assert.strictEqual(run3.deltaStars, 2, 'Delta stars must equal 3 - 1 = 2');
assert.strictEqual(run3.effectiveStars, 3);
assert.strictEqual(run3.firstTimeClear, false);
assert.strictEqual(testManager.getTotalStars(), 3, 'Total stars must update from 1 to 3');

// Step 4: Replay level_01_01 with a worse score (0 stars on defeat or 1 star) -> effective stars remain 3
testManager.startTrial('level_01_01');
const run4 = testManager.completeTrial({
  finalHp: 50,
  maxHp: 100,
  elapsedSeconds: 80,
  curveHits: 0,
  ricochetHits: 0
});
assert.strictEqual(run4.stars, 1);
assert.strictEqual(run4.previousStars, 3);
assert.strictEqual(run4.deltaStars, 0, 'No delta stars awarded on lower score');
assert.strictEqual(run4.effectiveStars, 3, 'Effective stars must remain highest achieved (3)');
assert.strictEqual(testManager.getTotalStars(), 3, 'Total stars must not regress');

console.log('✓ Monotonic star updates verified: previous score preserved, delta accurately calculated');

// =========================================================================
// [Group 5] Tiered Economy Payouts via EconomyManager
// =========================================================================
console.log('\n[Group 5] Testing Tiered Economy Payouts (First-Time vs Repeat Clears)...');

const initialBits = testEconomy.getBits();
const initialXp = testEconomy.getXP();

// Level 01_02 first clear: payouts are 120 Bits, 175 XP
testManager.startTrial('level_01_02');
const clear01_02 = testManager.completeTrial({
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 25,
  curveHits: 2,
  ricochetHits: 1
});
assert.strictEqual(clear01_02.firstTimeClear, true);
assert.strictEqual(clear01_02.rewards.bits, 120);
assert.strictEqual(clear01_02.rewards.xp, 175);
// Level 01_02 first clear awards 120 Bits and 175 XP.
// Reaching 325 XP triggers level up to Level 2 (threshold: 250 XP), granting 50 bonus milestone Bits!
assert.strictEqual(testEconomy.getLevel(), 2, 'Player reached level 2');
assert.strictEqual(testEconomy.getBits(), initialBits + 120 + 50, 'Bits reflect clear payout (120) + level 2 milestone bonus (50)');
assert.strictEqual(testEconomy.getXP(), initialXp + 175 - 250, 'XP rollover after level up');

// Level 01_02 repeat clear: payouts are 25 Bits, 35 XP
testManager.startTrial('level_01_02');
const repeat01_02 = testManager.completeTrial({
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 25,
  curveHits: 2,
  ricochetHits: 1
});
assert.strictEqual(repeat01_02.firstTimeClear, false);
assert.strictEqual(repeat01_02.rewards.bits, 25);
assert.strictEqual(repeat01_02.rewards.xp, 35);
assert.strictEqual(testEconomy.getBits(), initialBits + 120 + 50 + 25);
assert.strictEqual(testEconomy.getXP(), initialXp + 175 - 250 + 35);

// Arbiter Boss payouts test: Sentinel Arbiter (level_01_06)
// First clear: 500 Bits, 500 XP. Repeat clear: 100 Bits, 100 XP.
// Force unlock level_01_06 for payout verification
testStorage.set('campaign.unlockedNodes', [...testStorage.get('campaign.unlockedNodes'), 'level_01_06']);
testManager.startTrial('level_01_06');
const arbiterFirstClear = testManager.completeTrial({
  finalHp: 85,
  maxHp: 100,
  elapsedSeconds: 40,
  curveHits: 3,
  ricochetHits: 3
});
assert.strictEqual(arbiterFirstClear.firstTimeClear, true);
assert.strictEqual(arbiterFirstClear.rewards.bits, 500);
assert.strictEqual(arbiterFirstClear.rewards.xp, 500);

testManager.startTrial('level_01_06');
const arbiterRepeatClear = testManager.completeTrial({
  finalHp: 85,
  maxHp: 100,
  elapsedSeconds: 40,
  curveHits: 3,
  ricochetHits: 3
});
assert.strictEqual(arbiterRepeatClear.firstTimeClear, false);
assert.strictEqual(arbiterRepeatClear.rewards.bits, 100);
assert.strictEqual(arbiterRepeatClear.rewards.xp, 100);

console.log('✓ First-time vs repeat payouts verified for standard trials and Arbiter boss encounters');

// =========================================================================
// [Group 6] Storage Persistence & Cross-Session Restoration
// =========================================================================
console.log('\n[Group 6] Testing Storage Persistence & Cross-Session Restoration...');

const savedTotalStars = testManager.getTotalStars();
const savedRecords = testManager.getAllLevelRecords();
const savedCompletedNodes = testManager.getCompletedLevels();

// Simulate fresh session instantiation with same storage engine
const restoredManager = new CampaignManager({
  registry,
  evaluator: starEvaluator,
  storage: testStorage,
  economy: testEconomy
});

assert.strictEqual(restoredManager.getTotalStars(), savedTotalStars, 'Restored total stars matches previous session');
assert.deepStrictEqual(restoredManager.getAllLevelRecords(), savedRecords, 'Restored levelRecords matches');
assert.deepStrictEqual(restoredManager.getCompletedLevels(), savedCompletedNodes, 'Restored completedNodes matches');

console.log('✓ Complete campaign state persisted and re-hydrated accurately across sessions');

// =========================================================================
// [Group 7] Grid Unlocking & Sequential Level Progression
// =========================================================================
console.log('\n[Group 7] Testing Grid Unlocking & Sequential Level Progression...');

// Grid 02 requires 10 stars. Let's award stars to cross the 10-star threshold.
// Currently we have: level_01_01 (3 stars), level_01_02 (3 stars), level_01_06 (3 stars) = 9 stars.
assert.strictEqual(testManager.getTotalStars(), 9);
assert.strictEqual(testManager.isGridUnlocked('grid_02'), false);

// Complete level_01_03 to reach 12 stars
testStorage.set('campaign.unlockedNodes', [...testStorage.get('campaign.unlockedNodes'), 'level_01_03']);
let grid2UnlockedEventFired = false;
testManager.on(CampaignEvents.GRID_UNLOCKED, (event) => {
  if (event.gridId === 'grid_02') grid2UnlockedEventFired = true;
});

testManager.startTrial('level_01_03');
const clear01_03 = testManager.completeTrial({
  finalHp: 90,
  maxHp: 100,
  elapsedSeconds: 30,
  curveHits: 2,
  ricochetHits: 2
});
assert.strictEqual(clear01_03.deltaStars, 3);
assert.strictEqual(testManager.getTotalStars(), 12);
assert(grid2UnlockedEventFired, 'GRID_UNLOCKED event fired for grid_02');
assert.strictEqual(testManager.isGridUnlocked('grid_02'), true);
assert.strictEqual(testManager.isLevelUnlocked('level_02_01'), true, 'Level 1 of newly unlocked Grid 02 is playable');

// Progress overview for Grid 01
const grid1Progress = testManager.getGridProgress('grid_01');
assert.strictEqual(grid1Progress.gridId, 'grid_01');
assert.strictEqual(grid1Progress.isUnlocked, true);
assert.strictEqual(grid1Progress.totalLevels, 6);
assert.strictEqual(grid1Progress.completedLevels, 4);
assert.strictEqual(grid1Progress.earnedStars, 12);
assert.strictEqual(grid1Progress.maxStars, 18);

console.log('✓ Grid unlocking threshold and progress aggregation verified cleanly');

// =========================================================================
// [Group 8] Module Re-exports and Authoritative Singletons
// =========================================================================
console.log('\n[Group 8] Testing Default Exports & Singletons...');

assert(campaignRegistry instanceof CampaignRegistry);
assert(starEvaluator instanceof StarEvaluator);
assert(campaignManager instanceof CampaignManager);

console.log('✓ Authoritative singletons verified cleanly');

console.log('\n======================================================');
console.log('ALL CAMPAIGN PHASE 1 TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================');
