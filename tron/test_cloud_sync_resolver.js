import assert from 'assert';
import {
  CloudSyncResolver,
  normalizeSaveState,
  mergeStarMastery,
  mergeSetUnion,
  evaluateMonotonicInvariants
} from '../src/storage/CloudSyncResolver.js';

console.log('--- Running CloudSyncResolver (Master Grid Protocol) Test Suite ---');

// Test 1: Normalization
const defaultState = normalizeSaveState(null);
assert.strictEqual(defaultState.bits, 0);
assert.strictEqual(defaultState.level, 1);
assert.deepStrictEqual(defaultState.inventory, ['disc_default']);
assert.deepStrictEqual(defaultState.achievements, []);
console.log('✓ Normalization produces valid default save state schema');

// Test 2: Monotonic Numerical Max (Bits & Level)
const local1 = { bits: 500, level: 3, userId: 'user-001' };
const cloud1 = { bits: 1200, level: 2, userId: 'user-001' };
const resolved1 = CloudSyncResolver.resolve(local1, cloud1);

assert.strictEqual(resolved1.bits, 1200, 'Bits must be max(500, 1200) = 1200');
assert.strictEqual(resolved1.level, 3, 'Level must be max(3, 2) = 3');
console.log('✓ Numerical attributes (Bits & Level) resolved via monotonic max: Bits 1200, Level 3');

// Test 3: StarMastery Per-Level Matrix Union & Maximization
const localStars = { 1: 3, 2: 1, 3: 0 };
const cloudStars = { 1: 2, 2: 3, 4: 2 };
const mergedStars = mergeStarMastery(localStars, cloudStars);

assert.strictEqual(mergedStars[1], 3, 'Level 1 must be max(3, 2) = 3');
assert.strictEqual(mergedStars[2], 3, 'Level 2 must be max(1, 3) = 3');
assert.strictEqual(mergedStars[3], 0, 'Level 3 must be 0');
assert.strictEqual(mergedStars[4], 2, 'Level 4 must be 2');
console.log('✓ StarMastery matrix correctly maximized across all level keys:', mergedStars);

// Test 4: Inventory & Achievements Set Union
const localInv = ['disc_default', 'disc_neon_cyan', 'trail_grid'];
const cloudInv = ['disc_default', 'disc_solar_orange', 'skin_infiltrator'];
const mergedInv = mergeSetUnion(localInv, cloudInv);

assert.strictEqual(mergedInv.length, 5);
assert.ok(mergedInv.includes('disc_default'));
assert.ok(mergedInv.includes('disc_neon_cyan'));
assert.ok(mergedInv.includes('trail_grid'));
assert.ok(mergedInv.includes('disc_solar_orange'));
assert.ok(mergedInv.includes('skin_infiltrator'));
console.log('✓ Inventory resolved as pure set union without duplicates:', mergedInv);

const localAch = ['ACH_FIRST_WIN', 'ACH_PARRY_MASTER'];
const cloudAch = ['ACH_FIRST_WIN', 'ACH_PERFECT_DEFLECTION', 'ACH_VOID_SURVIVOR'];
const mergedAch = mergeSetUnion(localAch, cloudAch);
assert.strictEqual(mergedAch.length, 4);
console.log('✓ Achievements resolved as pure set union without duplicate badges');

// Test 5: Full Master Grid Protocol State Resolution
const localFull = {
  userId: 'tron_pilot_88',
  handle: 'LOCAL_PILOT',
  bits: 2400,
  level: 5,
  starMastery: { 1: 3, 2: 2, 3: 3 },
  inventory: ['disc_default', 'trail_amber'],
  achievements: ['ACH_FIRST_WIN'],
  stats: { matchesPlayed: 12, wins: 8, highestWave: 6, totalScore: 9200 },
  settings: { sens: 0.003, invertY: true },
  lastActiveAt: 1000
};

const cloudFull = {
  userId: 'tron_pilot_88',
  handle: 'CLOUD_PILOT',
  bits: 1800,
  level: 7,
  starMastery: { 1: 2, 2: 3, 4: 1 },
  inventory: ['disc_default', 'skin_recognizer'],
  achievements: ['ACH_FIRST_WIN', 'ACH_WAVE_5'],
  stats: { matchesPlayed: 20, wins: 6, highestWave: 7, totalScore: 8500 },
  settings: { sens: 0.0022, invertY: false },
  lastActiveAt: 2000
};

const resolvedFull = CloudSyncResolver.resolve(localFull, cloudFull);
assert.strictEqual(resolvedFull.bits, 2400);
assert.strictEqual(resolvedFull.level, 7);
assert.strictEqual(resolvedFull.starMastery[1], 3);
assert.strictEqual(resolvedFull.starMastery[2], 3);
assert.strictEqual(resolvedFull.starMastery[3], 3);
assert.strictEqual(resolvedFull.starMastery[4], 1);
assert.strictEqual(resolvedFull.inventory.length, 3);
assert.strictEqual(resolvedFull.achievements.length, 2);
assert.strictEqual(resolvedFull.stats.matchesPlayed, 20);
assert.strictEqual(resolvedFull.stats.wins, 8);
assert.strictEqual(resolvedFull.stats.highestWave, 7);
assert.strictEqual(resolvedFull.stats.totalScore, 9200);
assert.strictEqual(resolvedFull.handle, 'CLOUD_PILOT'); // newer active time
console.log('✓ Full asymmetric state sync adheres to all Master Grid Protocol rules');

// Test 6: Non-decreasing invariant verification (detecting regressions)
const badCandidate = {
  ...resolvedFull,
  bits: 100 // illegal drop from 2400
};
const violations = evaluateMonotonicInvariants(badCandidate, localFull, 'Local');
assert.ok(violations.length > 0);
assert.match(violations[0], /Bits decreased/);
console.log('✓ Invariant verification successfully catches simulated progress loss:', violations[0]);

console.log('--- CloudSyncResolver Test Suite PASSED ---\n');
