/**
 * test_storage_manager.js
 * Comprehensive unit & integration tests for TronSaveState schema & StorageManager engine.
 * SPEC-ECON-001 Phase 1.
 */

import assert from 'assert';
import {
  SAVE_STATE_VERSION,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  StorageEvents,
  createDefaultSaveState,
  isValidSaveState,
  validateSaveState
} from './src/storage/schema.js';
import { StorageManager, storageManager } from './src/storage/StorageManager.js';

console.log('--- Running StorageManager & TronSaveState Test Suite ---');

// Test Group 1: Schema Definitions & Immutability
console.log('\n[Group 1] Testing Schema & Default Factory...');

const defaultA = createDefaultSaveState();
assert.strictEqual(defaultA.version, SAVE_STATE_VERSION);
assert.strictEqual(typeof defaultA.player, 'object');
assert.strictEqual(typeof defaultA.loadout, 'object');
assert.strictEqual(typeof defaultA.campaign, 'object');
assert.strictEqual(typeof defaultA.inventory, 'object');
assert.ok(Array.isArray(defaultA.achievements));
assert.strictEqual(typeof defaultA.stats, 'object');
assert.strictEqual(defaultA.player.currency.bits, 0);

// Immutability & deep-cloning check
defaultA.player.currency.bits = 5000;
defaultA.campaign.completedNodes.push('node_01');
const defaultB = createDefaultSaveState();
assert.strictEqual(defaultB.player.currency.bits, 0, 'Factory instances must be completely decoupled');
assert.strictEqual(defaultB.campaign.completedNodes.length, 0, 'Factory array references must be isolated');

// Validation checks
assert.strictEqual(isValidSaveState(defaultB), true);
assert.strictEqual(isValidSaveState(null), false);
assert.strictEqual(isValidSaveState({ version: '1.0.0' }), false);

const invalidCheck = validateSaveState({ version: '1.0.0', player: {} });
assert.strictEqual(invalidCheck.valid, false);
assert.ok(invalidCheck.errors.length > 0);
console.log('✓ TronSaveState v1.0.0 schema and immutable factory validated cleanly');

// Test Group 2: StorageManager Lifecycle & Accessors
console.log('\n[Group 2] Testing StorageManager Lifecycle & Keypath Accessors...');

const testManager = new StorageManager({
  storageKey: 'tron_test_store_alpha',
  backupKey: 'tron_test_store_alpha.bak',
  debounceMs: 50
});

let initFired = false;
let initSource = null;
testManager.on(StorageEvents.INITIALIZED, (evt) => {
  initFired = true;
  initSource = evt.source;
});

const initialState = testManager.load();
assert.strictEqual(initFired, true);
assert.strictEqual(initSource, 'fresh');
assert.strictEqual(initialState.version, '1.0.0');

// Keypath reads
assert.strictEqual(testManager.get('player.handle'), 'USER_PROGRAM');
assert.strictEqual(testManager.get('player.currency.bits'), 0);
assert.strictEqual(testManager.get('stats.highestWave'), 1);
assert.strictEqual(testManager.get('non.existent.path', 'fallback_val'), 'fallback_val');

// Keypath writes and mutation events
let mutateEvent = null;
testManager.on(StorageEvents.MUTATED, (evt) => {
  mutateEvent = evt;
});

testManager.set('player.handle', 'FLYNN_CLU', { immediate: true });
assert.strictEqual(testManager.get('player.handle'), 'FLYNN_CLU');
assert.strictEqual(mutateEvent?.path, 'player.handle');
assert.strictEqual(mutateEvent?.value, 'FLYNN_CLU');
assert.strictEqual(mutateEvent?.previousValue, 'USER_PROGRAM');

testManager.set('player.currency.bits', 750, { immediate: true });
assert.strictEqual(testManager.get('player.currency.bits'), 750);
console.log('✓ StorageManager get/set keypaths and MUTATED events verified');

// Export and Import JSON
const exportedJson = testManager.exportJSON();
assert.strictEqual(typeof exportedJson, 'string');
assert.ok(exportedJson.includes('FLYNN_CLU'));

const importedObj = JSON.parse(exportedJson);
importedObj.player.handle = 'TRON_LEGACY_01';
importedObj.player.currency.bits = 9999;
testManager.importJSON(JSON.stringify(importedObj));
assert.strictEqual(testManager.get('player.handle'), 'TRON_LEGACY_01');
assert.strictEqual(testManager.get('player.currency.bits'), 9999);
console.log('✓ StorageManager exportJSON and importJSON round-trip succeeded');

// Reset
testManager.reset();
assert.strictEqual(testManager.get('player.currency.bits'), 0);
console.log('✓ StorageManager.reset restored default save state');

// Test Group 3: Debounced Persistence & Emergency Flush
console.log('\n[Group 3] Testing Debounced Auto-Save & Emergency Flush...');

let savedCount = 0;
testManager.on(StorageEvents.SAVED, () => {
  savedCount++;
});

// Fire 5 rapid set mutations without immediate flag
savedCount = 0;
testManager.set('stats.discsThrown', 10);
testManager.set('stats.discsThrown', 20);
testManager.set('stats.discsThrown', 30);
testManager.set('stats.discsThrown', 40);
testManager.set('stats.discsThrown', 50);

// Verify immediate persistence was deferred
assert.strictEqual(savedCount, 0, 'Auto-save must be debounced, not executed immediately');

// Wait for debounce window (60ms > 50ms)
await new Promise((r) => setTimeout(r, 70));
assert.strictEqual(savedCount, 1, 'Debounced save must execute exactly once for the batch');
assert.strictEqual(testManager.get('stats.discsThrown'), 50);

// Emergency synchronous flush
savedCount = 0;
testManager.set('stats.discsDeflected', 8);
testManager._flushEmergencySave();
assert.strictEqual(savedCount, 1, 'Emergency flush must immediately commit in-flight mutations');
assert.strictEqual(testManager.get('stats.discsDeflected'), 8);
console.log('✓ Debounce batching and emergency synchronous flush verified');

// Test Group 4: LocalStorage Corruption Recovery
console.log('\n[Group 4] Testing Corruption Detection & Recovery...');

const corruptKey = 'tron_test_corrupt_grid';
const corruptBakKey = 'tron_test_corrupt_grid.bak';
const corruptManager = new StorageManager({
  storageKey: corruptKey,
  backupKey: corruptBakKey
});

// Inject bad data into storage key
corruptManager._setItem(corruptKey, '{ BAD_SYNTAX: %%% }');

let corruptedEvent = null;
corruptManager.on(StorageEvents.CORRUPTED, (evt) => {
  corruptedEvent = evt;
});

const recoveredState = corruptManager.load();
assert.notStrictEqual(corruptedEvent, null, 'Must emit STORAGE_CORRUPTED event');
assert.strictEqual(corruptedEvent.backupKey, corruptBakKey);
assert.strictEqual(corruptManager._getItem(corruptBakKey), '{ BAD_SYNTAX: %%% }', 'Must preserve corrupt data under .bak key');
assert.strictEqual(recoveredState.version, '1.0.0');
assert.strictEqual(recoveredState.player.currency.bits, 0);
assert.strictEqual(isValidSaveState(recoveredState), true);
console.log('✓ Malformed storage payload preserved to .bak and cleanly recovered to default state');

// Test Group 5: Schema Migrations
console.log('\n[Group 5] Testing Schema Migrations...');

const migKey = 'tron_test_mig_grid';
const migManager = new StorageManager({ storageKey: migKey });

// Test legacy migration from v1 numeric schema (used by saveState.js)
const legacyV1Payload = {
  version: 1,
  userId: 'user_legacy_42',
  handle: 'LEGACY_COMMANDER',
  bits: 1250,
  level: 5,
  inventory: ['disc_default', 'trail_blue'],
  achievements: ['first_win'],
  stats: { matchesPlayed: 10, wins: 8, totalScore: 35000 }
};

migManager._setItem(migKey, JSON.stringify(legacyV1Payload));
const migrated = migManager.load();

assert.strictEqual(migrated.version, '1.0.0');
assert.strictEqual(migrated.player.id, 'user_legacy_42');
assert.strictEqual(migrated.player.handle, 'LEGACY_COMMANDER');
assert.strictEqual(migrated.player.currency.bits, 1250);
assert.strictEqual(migrated.player.level, 5);
assert.strictEqual(migrated.inventory.discs[0], 'disc_identity_default');
assert.strictEqual(migrated.stats.wins, 8);
assert.strictEqual(migrated.stats.highestScore, 35000);

// Test custom forward migration (1.0.0 -> 1.1.0)
migManager.registerMigration('1.0.0', '1.1.0', (state) => {
  return {
    ...state,
    features: { clanId: 'grid_enforcers' }
  };
});
const forwardMigrated = migManager._applyMigrations({ version: '1.0.0', test: true });
assert.strictEqual(forwardMigrated.version, '1.1.0');
assert.strictEqual(forwardMigrated.features.clanId, 'grid_enforcers');
console.log('✓ Legacy and forward schema migrations executed successfully');

// Test Group 6: Cross-Tab Synchronization
console.log('\n[Group 6] Testing Cross-Tab Synchronization...');

const sharedKey = 'tron_test_crosstab_shared';
const tab1 = new StorageManager({ storageKey: sharedKey });
const tab2 = new StorageManager({ storageKey: sharedKey });

tab1.load();
tab2.load();

let tab2Mutated = false;
let tab2External = false;
tab2.on(StorageEvents.MUTATED, (evt) => {
  tab2Mutated = true;
  tab2External = evt.isExternal;
});

// Tab 1 updates state
tab1.set('player.handle', 'CROSS_TAB_CHAMPION', { immediate: true });

assert.strictEqual(tab2Mutated, true, 'Tab 2 must react to Tab 1 mutation');
assert.strictEqual(tab2External, true, 'Cross-tab mutation must flag isExternal: true');
assert.strictEqual(tab2.get('player.handle'), 'CROSS_TAB_CHAMPION');
console.log('✓ Multi-tab mutation synchronization verified without recursive cascades');

// Clean up test instances
testManager.destroy();
corruptManager.destroy();
migManager.destroy();
tab1.destroy();
tab2.destroy();

console.log('\n======================================================');
console.log('ALL STORAGE MANAGER TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================\n');
