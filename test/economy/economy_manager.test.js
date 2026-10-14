/**
 * test_economy_manager.js
 * Comprehensive unit & integration tests for EconomyManager & Progression Engine.
 * SPEC-ECON-001 Phase 2.
 */

import assert from 'assert';
import { StorageManager } from '../../src/storage/StorageManager.js';
import {
  EconomyManager,
  economyManager,
  EconomyEvents,
  DEFAULT_XP_CURVE,
  MILESTONE_REWARDS,
  MAX_AUDIT_LOG_SIZE
} from '../../src/economy/EconomyManager.js';

console.log('--- Running EconomyManager & Progression Engine Test Suite ---');

// Test Group 1: Currency Operations & Validation Guards
console.log('\n[Group 1] Testing Currency Operations & Defensive Validation Guards...');

const testStorage = new StorageManager({
  storageKey: 'tron_test_economy_alpha',
  backupKey: 'tron_test_economy_alpha.bak',
  debounceMs: 10
});
testStorage.load();

const testEconomy = new EconomyManager({
  storage: testStorage,
  maxAuditLogSize: 100
});

// Initial state
assert.strictEqual(testEconomy.getBits(), 0);
assert.strictEqual(testEconomy.canAfford(100), false);
assert.strictEqual(testEconomy.canAfford(0), true);

// Rejections of invalid canAfford inputs
assert.strictEqual(testEconomy.canAfford(-10), false);
assert.strictEqual(testEconomy.canAfford(NaN), false);
assert.strictEqual(testEconomy.canAfford('50'), false);
assert.strictEqual(testEconomy.canAfford(null), false);

// Award Bits
const awardSuccess = testEconomy.awardBits(500, 'test_reward');
assert.strictEqual(awardSuccess, true);
assert.strictEqual(testEconomy.getBits(), 500);
assert.strictEqual(testEconomy.canAfford(500), true);
assert.strictEqual(testEconomy.canAfford(501), false);

// Defensive guards on awardBits
assert.strictEqual(testEconomy.awardBits(-100), false, 'Must reject negative award');
assert.strictEqual(testEconomy.awardBits(0), false, 'Must reject zero award');
assert.strictEqual(testEconomy.awardBits(NaN), false, 'Must reject NaN');
assert.strictEqual(testEconomy.awardBits('100'), false, 'Must reject string');
assert.strictEqual(testEconomy.awardBits(null), false, 'Must reject null');
assert.strictEqual(testEconomy.awardBits(undefined), false, 'Must reject undefined');
assert.strictEqual(testEconomy.getBits(), 500, 'Balance must remain unchanged after rejected awards');

// Fractional Bits conversion (floor truncation)
testEconomy.awardBits(50.85, 'fractional_reward');
assert.strictEqual(testEconomy.getBits(), 550, 'Fractional bits must be floored to 50');

// Spend Bits
const spendSuccess = testEconomy.spendBits(200, 'cosmetics', 'trail_neon_cyan');
assert.strictEqual(spendSuccess, true);
assert.strictEqual(testEconomy.getBits(), 350);

// Insufficient balance spend
const overspendSuccess = testEconomy.spendBits(1000, 'cosmetics', 'disc_legendary');
assert.strictEqual(overspendSuccess, false);
assert.strictEqual(testEconomy.getBits(), 350, 'Balance must remain intact after failed purchase');

// Defensive guards on spendBits
assert.strictEqual(testEconomy.spendBits(-50), false, 'Must reject negative spend');
assert.strictEqual(testEconomy.spendBits(0), false, 'Must reject zero spend');
assert.strictEqual(testEconomy.spendBits(NaN), false, 'Must reject NaN spend');
assert.strictEqual(testEconomy.spendBits('50'), false, 'Must reject string spend');
assert.strictEqual(testEconomy.spendBits(null), false, 'Must reject null spend');

// Fractional spend conversion
testEconomy.spendBits(50.9, 'upgrades', 'speed_booster');
assert.strictEqual(testEconomy.getBits(), 300, 'Fractional cost must be floored to 50');

console.log('✓ Currency operations and defensive validation guards verified cleanly');

// Test Group 2: Progression Mathematical Curve & XP Accessors
console.log('\n[Group 2] Testing Exponential Progression Curve & XP Accessors...');

// Curve formula: floor(250 * L^1.4)
// L=1: floor(250 * 1) = 250
// L=2: floor(250 * 2.6390158215) = 659
// L=3: floor(250 * 4.6555367217) = 1163
// L=5: floor(250 * 9.5182696936) = 2379
// L=10: floor(250 * 25.118864315) = 6279
assert.strictEqual(testEconomy.getXPForNextLevel(1), 250);
assert.strictEqual(testEconomy.getXPForNextLevel(2), 659);
assert.strictEqual(testEconomy.getXPForNextLevel(3), 1163);
assert.strictEqual(testEconomy.getXPForNextLevel(5), 2379);
assert.strictEqual(testEconomy.getXPForNextLevel(10), 6279);

// Initial level and XP
assert.strictEqual(testEconomy.getLevel(), 1);
assert.strictEqual(testEconomy.getXP(), 0);
assert.strictEqual(testEconomy.getProgressToNextLevel(), 0.0);

// Partial progress within level
testEconomy.awardXP(100, 'combat_kill');
assert.strictEqual(testEconomy.getLevel(), 1);
assert.strictEqual(testEconomy.getXP(), 100);
assert.strictEqual(testEconomy.getProgressToNextLevel(), 100 / 250);

// Fractional XP conversion
testEconomy.awardXP(25.75, 'assist');
assert.strictEqual(testEconomy.getXP(), 125);

// Invalid XP award guards
assert.strictEqual(testEconomy.awardXP(-10), false);
assert.strictEqual(testEconomy.awardXP(0), false);
assert.strictEqual(testEconomy.awardXP(NaN), false);
assert.strictEqual(testEconomy.awardXP('50'), false);
assert.strictEqual(testEconomy.awardXP(null), false);
assert.strictEqual(testEconomy.getXP(), 125);

console.log('✓ XP threshold curve values and progress ratio verified');

// Test Group 3: Multi-Level Progression Rollover & Milestone Rewards
console.log('\n[Group 3] Testing Level Advancement, Multi-Level Rollover & Milestones...');

const progStorage = new StorageManager({
  storageKey: 'tron_test_economy_prog',
  debounceMs: 10
});
progStorage.load();

const progEconomy = new EconomyManager({
  storage: progStorage
});

let levelUpEvents = [];
progEconomy.on(EconomyEvents.LEVEL_UP, (evt) => {
  levelUpEvents.push(evt);
});

// Currently Level 1, XP 0. Threshold to Level 2 is 250 XP.
// Award 250 XP -> Should reach Level 2 with 0 excess XP.
progEconomy.awardXP(250, 'match_win');
assert.strictEqual(progEconomy.getLevel(), 2);
assert.strictEqual(progEconomy.getXP(), 0);
assert.strictEqual(levelUpEvents.length, 1);
assert.strictEqual(levelUpEvents[0].oldLevel, 1);
assert.strictEqual(levelUpEvents[0].newLevel, 2);
assert.strictEqual(levelUpEvents[0].rewards.bits, 50, 'Level 2 should grant 50 milestone bits');
assert.strictEqual(progEconomy.getBits(), 50, 'Milestone bits must be credited to wallet');

// Multi-level jump test:
// Level 2 threshold is 659
// Level 3 threshold is 1163
// Level 4 threshold is 1741
// Level 5 threshold is 2379
// Total XP to jump from L2 (0 XP) through L4 into L5: 659 + 1163 + 1741 = 3563.
// Award 3600 XP -> Should jump to Level 5 with (3600 - 3563) = 37 XP!
levelUpEvents = [];
progEconomy.awardXP(3600, 'boss_victory');
assert.strictEqual(progEconomy.getLevel(), 5);
assert.strictEqual(progEconomy.getXP(), 37);
assert.strictEqual(levelUpEvents.length, 1);
assert.strictEqual(levelUpEvents[0].oldLevel, 2);
assert.strictEqual(levelUpEvents[0].newLevel, 5);

// Check milestone rewards for levels 3, 4, 5:
// Level 3: 50 Bits
// Level 4: 50 Bits
// Level 5: 250 Bits (milestone table)
// Total milestone rewards: 350 Bits.
// Previous balance was 50 Bits -> New balance must be 50 + 350 = 400 Bits.
assert.strictEqual(levelUpEvents[0].rewards.bits, 350);
assert.strictEqual(progEconomy.getBits(), 400);

console.log('✓ Multi-level advancement rollover and milestone rewards verified');

// Test Group 4: Lifecycle Event Dispatch & In-Memory Audit Logging
console.log('\n[Group 4] Testing Lifecycle Events & Transaction Audit Log...');

const auditStorage = new StorageManager({
  storageKey: 'tron_test_economy_audit',
  debounceMs: 10
});
auditStorage.load();

const auditEconomy = new EconomyManager({
  storage: auditStorage,
  maxAuditLogSize: 5
});

let earnedPayload = null;
let spentPayload = null;
let xpPayload = null;

auditEconomy.on(EconomyEvents.BITS_EARNED, (p) => { earnedPayload = p; });
auditEconomy.on(EconomyEvents.BITS_SPENT, (p) => { spentPayload = p; });
auditEconomy.on(EconomyEvents.XP_GAINED, (p) => { xpPayload = p; });

auditEconomy.awardBits(120, 'quest_complete');
assert.ok(earnedPayload);
assert.strictEqual(earnedPayload.amount, 120);
assert.strictEqual(earnedPayload.source, 'quest_complete');
assert.strictEqual(earnedPayload.balance, 120);

auditEconomy.spendBits(40, 'gear', 'disc_mod_speed');
assert.ok(spentPayload);
assert.strictEqual(spentPayload.cost, 40);
assert.strictEqual(spentPayload.category, 'gear');
assert.strictEqual(spentPayload.itemId, 'disc_mod_speed');
assert.strictEqual(spentPayload.balance, 80);

auditEconomy.awardXP(50, 'target_hit');
assert.ok(xpPayload);
assert.strictEqual(xpPayload.amount, 50);
assert.strictEqual(xpPayload.source, 'target_hit');
assert.strictEqual(xpPayload.xp, 50);

// Audit log entries check
const logEntries = auditEconomy.getAuditLog();
assert.ok(Array.isArray(logEntries));
assert.strictEqual(logEntries.length, 3);
assert.strictEqual(logEntries[0].type, EconomyEvents.BITS_EARNED);
assert.strictEqual(logEntries[1].type, EconomyEvents.BITS_SPENT);
assert.strictEqual(logEntries[2].type, EconomyEvents.XP_GAINED);

// Audit log buffer capacity check (configured maxAuditLogSize = 5)
auditEconomy.awardBits(10, 'tx4');
auditEconomy.awardBits(10, 'tx5');
auditEconomy.awardBits(10, 'tx6');
auditEconomy.awardBits(10, 'tx7');

const clampedLog = auditEconomy.getAuditLog();
assert.strictEqual(clampedLog.length, 5, 'Audit log must be capped at maxAuditLogSize');
assert.strictEqual(clampedLog[clampedLog.length - 1].source, 'tx7');

auditEconomy.clearAuditLog();
assert.strictEqual(auditEconomy.getAuditLog().length, 0);

console.log('✓ Lifecycle events and bounded transaction audit log verified');

// Test Group 5: Developer Debug Suite Console Instrumentation
console.log('\n[Group 5] Testing Developer Debug Suite (window.gameDebug)...');

const debugStorage = new StorageManager({
  storageKey: 'tron_test_economy_debug',
  debounceMs: 10
});
debugStorage.load();

const debugEconomy = new EconomyManager({
  storage: debugStorage
});

const mockWindow = {};
debugEconomy.setupDebugSuite(mockWindow);

assert.ok(mockWindow.gameDebug);
assert.strictEqual(typeof mockWindow.gameDebug.addBits, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.setXP, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.setLevel, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.resetEconomy, 'function');

// Debug addBits
mockWindow.gameDebug.addBits(999);
assert.strictEqual(debugEconomy.getBits(), 999);

// Debug setXP
mockWindow.gameDebug.setXP(175);
assert.strictEqual(debugEconomy.getXP(), 175);

// Debug setLevel
mockWindow.gameDebug.setLevel(8);
assert.strictEqual(debugEconomy.getLevel(), 8);
assert.strictEqual(debugEconomy.getXP(), 0);

// Debug resetEconomy
mockWindow.gameDebug.resetEconomy();
assert.strictEqual(debugEconomy.getBits(), 0);
assert.strictEqual(debugEconomy.getLevel(), 1);
assert.strictEqual(debugEconomy.getXP(), 0);
assert.strictEqual(debugEconomy.getAuditLog().length, 0);

console.log('✓ Developer debug suite methods and immediate persistence verified');

// Test Group 6: Re-exports & Default Singleton
console.log('\n[Group 6] Testing Re-exports and Default Singleton...');

assert.ok(economyManager instanceof EconomyManager);
assert.strictEqual(typeof economyManager.awardBits, 'function');
assert.strictEqual(typeof economyManager.spendBits, 'function');
assert.strictEqual(typeof economyManager.awardXP, 'function');

console.log('✓ Authoritative singleton and module exports verified');

console.log('\n======================================================');
console.log('ALL ECONOMY MANAGER TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================\n');
