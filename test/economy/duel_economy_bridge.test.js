/**
 * test_duel_economy_bridge.test.js
 * Comprehensive unit and integration test suite for DuelEconomyBridge (SPEC-ACHIEVE-001).
 */

import assert from 'assert';
import {
  DuelEconomyBridge,
  DUEL_PAYOUT_CONFIG,
  DuelEconomyEvents
} from '../../src/modes/DuelEconomyBridge.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';

console.log('--- Running DuelEconomyBridge Test Suite ---');

function createTestContext() {
  const testStorage = new StorageManager({
    storageKey: `tron_test_duel_${Date.now()}_${Math.random()}`,
    backupKey: `tron_test_duel_${Date.now()}_${Math.random()}.bak`,
    debounceMs: 10
  });
  testStorage.load();
  testStorage.set('player.currency.bits', 0);
  testStorage.set('player.xp', 0);

  const testEconomy = new EconomyManager({ storage: testStorage });
  const indicators = [];
  const mockFloatingFn = (amount, label, opts) => {
    indicators.push({ amount, label, opts });
  };

  const bridge = new DuelEconomyBridge({
    storage: testStorage,
    economy: testEconomy,
    floatingIndicatorFn: mockFloatingFn
  });

  return { testStorage, testEconomy, bridge, indicators };
}

// Group 1: High-Skill Maneuver Rewards
console.log('\n[Group 1] Testing In-Combat High-Skill Maneuver Rewards...');

const ctx1 = createTestContext();
let maneuverEvents = [];
ctx1.bridge.on(DuelEconomyEvents.MANEUVER_REWARD, (evt) => maneuverEvents.push(evt));

// 1. Confirmed Parry
const parryRes = ctx1.bridge.rewardParry();
assert.strictEqual(parryRes.bits, 10);
assert.strictEqual(parryRes.xp, 20);
assert.strictEqual(ctx1.testEconomy.getBits(), 10);
assert.strictEqual(ctx1.indicators.length, 1);
assert.strictEqual(ctx1.indicators[0].amount, 10);
assert.strictEqual(ctx1.indicators[0].label, 'PARRY');
assert.strictEqual(maneuverEvents.length, 1);
assert.strictEqual(maneuverEvents[0].maneuver, 'parry');

// 2. Ricochet Hits
// Bounces < 2: no reward
const noBank = ctx1.bridge.rewardRicochetHit(1);
assert.strictEqual(noBank, null);
assert.strictEqual(ctx1.testEconomy.getBits(), 10, 'Bits should not increase for < 2 bounces');

// 2 Bounces: 15 Bits
const bank2 = ctx1.bridge.rewardRicochetHit(2);
assert.strictEqual(bank2.bits, 15);
assert.strictEqual(bank2.xp, 30);
assert.strictEqual(ctx1.testEconomy.getBits(), 25);
assert.strictEqual(ctx1.indicators.length, 2);
assert.strictEqual(ctx1.indicators[1].label, 'DOUBLE BANK');

// 4 Bounces: 15 + (2 * 5) = 25 Bits
const bank4 = ctx1.bridge.rewardRicochetHit(4);
assert.strictEqual(bank4.bits, 25);
assert.strictEqual(ctx1.testEconomy.getBits(), 50);
assert.strictEqual(ctx1.indicators.length, 3);
assert.strictEqual(ctx1.indicators[2].label, '4x BANK SHOT');

// 3. Curve Elimination
const curveRes = ctx1.bridge.rewardCurveElimination(0.45);
assert.strictEqual(curveRes.bits, 25);
assert.strictEqual(curveRes.xp, 50);
assert.strictEqual(ctx1.testEconomy.getBits(), 75);
assert.strictEqual(ctx1.indicators.length, 4);
assert.strictEqual(ctx1.indicators[3].label, 'CURVE KILL');
assert.strictEqual(maneuverEvents.length, 4);

console.log('✓ Confirmed parries, multi-ricochet strikes, and curve eliminations verified');

// Group 2: Match Outcome Payouts (AI vs Multiplayer)
console.log('\n[Group 2] Testing Duel Match Outcome Payouts...');

const ctx2 = createTestContext();
let matchEvents = [];
ctx2.bridge.on(DuelEconomyEvents.MATCH_PAYOUT, (evt) => matchEvents.push(evt));

// AI Victory: 50 Bits + 150 XP
const aiVic = ctx2.bridge.processMatchOutcome('victory', 'ai');
assert.strictEqual(aiVic.bits, 50);
assert.strictEqual(aiVic.xp, 150);
assert.strictEqual(ctx2.testEconomy.getBits(), 50);
assert.strictEqual(matchEvents.length, 1);
assert.strictEqual(matchEvents[0].isVictory, true);

// Multiplayer Victory: 100 Bits + 300 XP
// Total XP: 150 + 300 = 450 (crosses 250 XP threshold -> Level 2 reached -> +50 Bits milestone reward)
const multiVic = ctx2.bridge.processMatchOutcome('victory', 'multiplayer');
assert.strictEqual(multiVic.bits, 100);
assert.strictEqual(multiVic.xp, 300);
assert.strictEqual(ctx2.testEconomy.getLevel(), 2, 'Player should advance to Level 2');
assert.strictEqual(ctx2.testEconomy.getBits(), 200, '50 (AI) + 100 (Multi) + 50 (Level 2 Milestone) = 200 Bits');
assert.strictEqual(matchEvents.length, 2);

// AI Defeat: 0 Bits, 40 XP
const aiDef = ctx2.bridge.processMatchOutcome('defeat', 'ai');
assert.strictEqual(aiDef.bits, 0);
assert.strictEqual(aiDef.xp, 40);
assert.strictEqual(ctx2.testEconomy.getBits(), 200, 'Bits must remain unchanged on defeat');
assert.strictEqual(matchEvents.length, 3);
assert.strictEqual(matchEvents[2].isVictory, false);

// Multiplayer Defeat: 0 Bits, 75 XP
const multiDef = ctx2.bridge.processMatchOutcome('defeat', 'multiplayer');
assert.strictEqual(multiDef.bits, 0);
assert.strictEqual(multiDef.xp, 75);
assert.strictEqual(ctx2.testEconomy.getBits(), 200, 'Bits must remain unchanged on defeat');
assert.strictEqual(matchEvents.length, 4);

console.log('✓ AI & multiplayer victories and defeat participation credits verified');

// Group 3: Default Singleton & Event Unsubscription
console.log('\n[Group 3] Testing Default Singleton & Listener Lifecycle...');

const ctx3 = createTestContext();
let triggerCount = 0;
const unsub = ctx3.bridge.on(DuelEconomyEvents.MANEUVER_REWARD, () => {
  triggerCount++;
});

ctx3.bridge.rewardParry();
assert.strictEqual(triggerCount, 1);

unsub();
ctx3.bridge.rewardParry();
assert.strictEqual(triggerCount, 1, 'Unsubscribed listener should not be called');

console.log('✓ Listener lifecycle and unsubscription verified cleanly');

console.log('\n======================================================');
console.log('ALL DUEL ECONOMY BRIDGE TESTS PASSED (100% SUCCESS)');
console.log('======================================================');
