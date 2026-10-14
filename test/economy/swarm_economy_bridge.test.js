/**
 * test_swarm_economy_bridge.test.js
 * Unit and integration tests for SwarmEconomyBridge (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  SwarmEconomyBridge,
  SWARM_ECONOMY_CONFIG,
  SwarmEconomyEvents
} from '../../src/modes/SwarmEconomyBridge.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';

console.log('--- Running SwarmEconomyBridge Test Suite ---');

// Mock in-memory test setup
function createTestEnvironment(initialWaveRecord = 1) {
  const testStorage = new StorageManager({
    storageKey: `tron_test_swarm_${Date.now()}_${Math.random()}`,
    backupKey: `tron_test_swarm_${Date.now()}_${Math.random()}.bak`,
    debounceMs: 10
  });
  testStorage.load();
  testStorage.set('stats.swarmHighestWave', initialWaveRecord);
  testStorage.set('player.currency.bits', 0);
  testStorage.set('player.xp', 0);

  const testEconomy = new EconomyManager({ storage: testStorage });
  const bridge = new SwarmEconomyBridge({
    storage: testStorage,
    economy: testEconomy
  });

  return { testStorage, testEconomy, bridge };
}

// Group 1: Deterministic Math Calculations
console.log('\n[Group 1] Testing Wave Payout & Streak Scaling Math...');

const { bridge: testBridge } = createTestEnvironment();

// Wave 1, streak 1
const p1 = testBridge.calculateWavePayout(1, 1);
assert.strictEqual(p1.wave, 1);
assert.strictEqual(p1.streak, 1);
assert.strictEqual(p1.waveBits, 15, 'Base yield for wave 1 must be 15 Bits');
assert.strictEqual(p1.waveXP, 40);
assert.strictEqual(p1.isMilestone, false);
assert.strictEqual(p1.totalBits, 15);
assert.strictEqual(p1.totalXP, 40);

// Wave 3, streak 3: streakMultiplier = 1 + (2 * 0.12) = 1.24 -> floor(15 * 1.24) = 18
const p3 = testBridge.calculateWavePayout(3, 3);
assert.strictEqual(p3.waveBits, Math.floor(15 * (1 + 2 * 0.12)));
assert.strictEqual(p3.isMilestone, false);

// Wave 5, streak 5: Milestone chest unlocked!
// Base wave bits: floor(15 * (1 + 4 * 0.12)) = floor(15 * 1.48) = 22
// Milestone chest tier 1: 75 Bits, 150 XP
const p5 = testBridge.calculateWavePayout(5, 5);
assert.strictEqual(p5.isMilestone, true);
assert.strictEqual(p5.tier, 1);
assert.strictEqual(p5.milestoneBits, 75);
assert.strictEqual(p5.milestoneXP, 150);
assert.strictEqual(p5.totalBits, p5.waveBits + 75);
assert.strictEqual(p5.totalXP, p5.waveXP + 150);

// Wave 10, streak 10: Milestone chest tier 2: 150 Bits, 300 XP
const p10 = testBridge.calculateWavePayout(10, 10);
assert.strictEqual(p10.isMilestone, true);
assert.strictEqual(p10.tier, 2);
assert.strictEqual(p10.milestoneBits, 150);
assert.strictEqual(p10.milestoneXP, 300);

// Wave 15, streak 15: Milestone chest tier 3: 225 Bits, 450 XP
const p15 = testBridge.calculateWavePayout(15, 15);
assert.strictEqual(p15.isMilestone, true);
assert.strictEqual(p15.tier, 3);
assert.strictEqual(p15.milestoneBits, 225);
assert.strictEqual(p15.milestoneXP, 450);

console.log('✓ Wave payout math, compound streak scaling, and milestone chests verified');

// Group 2: Wave Processing, Economy Crediting & Event Emission
console.log('\n[Group 2] Testing Wave Processing & Economy Integration...');

const { testStorage, testEconomy, bridge } = createTestEnvironment(3);

let payoutEvents = [];
let milestoneEvents = [];
let recordEvents = [];

bridge.on(SwarmEconomyEvents.WAVE_PAYOUT, (e) => payoutEvents.push(e));
bridge.on(SwarmEconomyEvents.MILESTONE_CHEST_UNLOCKED, (e) => milestoneEvents.push(e));
bridge.on(SwarmEconomyEvents.SURVIVAL_RECORD_UPDATED, (e) => recordEvents.push(e));

// Complete wave 1 (lower than record of 3)
const res1 = bridge.processWaveCompletion(1);
assert.strictEqual(res1.success, true);
assert.strictEqual(res1.streak, 1);
assert.strictEqual(res1.newRecord, false);
assert.strictEqual(testEconomy.getBits(), 15);
assert.strictEqual(payoutEvents.length, 1);
assert.strictEqual(milestoneEvents.length, 0);
assert.strictEqual(recordEvents.length, 0);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 3, 'Record should not change when wave < record');

// Complete wave 2
bridge.processWaveCompletion(2);
assert.strictEqual(bridge.streak, 2);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 3);

// Complete wave 4 (exceeds record of 3 -> new record!)
const res4 = bridge.processWaveCompletion(4);
assert.strictEqual(res4.newRecord, true);
assert.strictEqual(recordEvents.length, 1);
assert.strictEqual(recordEvents[0].newRecord, 4);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 4);
assert.strictEqual(testStorage.get('stats.highestWave'), 4);

// Complete wave 5 (Milestone chest!)
const res5 = bridge.processWaveCompletion(5);
assert.strictEqual(res5.newRecord, true);
assert.strictEqual(res5.payout.isMilestone, true);
assert.strictEqual(milestoneEvents.length, 1);
assert.strictEqual(milestoneEvents[0].wave, 5);
assert.strictEqual(milestoneEvents[0].tier, 1);
assert.strictEqual(testStorage.get('stats.swarmHighestWave'), 5);

console.log('✓ Economy crediting, milestone event dispatch, and record updating verified');

// Group 3: Streak Resetting
console.log('\n[Group 3] Testing Streak Resetting...');

assert.strictEqual(bridge.streak, 4);
bridge.resetStreak();
assert.strictEqual(bridge.streak, 0);

// Next completion starts streak at 1
const resAfterReset = bridge.processWaveCompletion(1);
assert.strictEqual(resAfterReset.streak, 1);
assert.strictEqual(resAfterReset.payout.streak, 1);

console.log('✓ Streak reset verified cleanly');

console.log('\n======================================================');
console.log('ALL SWARM ECONOMY BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
