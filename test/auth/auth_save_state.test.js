import assert from 'assert';
import {
  createDefaultSaveState,
  loadSaveState,
  saveSaveState,
  getOrCreateSaveState,
  updateSaveStats,
  updateSaveSettings,
  clearSaveState,
  SAVE_STATE_VERSION
} from '../../src/auth/saveState.js';
import { authManager } from '../../src/auth/AuthManager.js';
import { state } from '../../src/core/state.js';
import { AuthEvents } from '../../src/auth/events.js';

console.log('--- Running TronSaveState & AuthManager Test Suite ---');

const testUid = 'user_test_save_state_9999';
const testHandle = 'GUEST_SUBROUTINE_9999';

// Clean up any existing state
clearSaveState(testUid);

// Test 1: createDefaultSaveState
const defaultState = createDefaultSaveState(testUid, testHandle);
assert.strictEqual(defaultState.version, SAVE_STATE_VERSION);
assert.strictEqual(defaultState.userId, testUid);
assert.strictEqual(defaultState.handle, testHandle);
assert.strictEqual(defaultState.stats.matchesPlayed, 0);
assert.strictEqual(defaultState.stats.highestWave, 1);
assert.strictEqual(defaultState.settings.sens, 0.0022);
assert.strictEqual(defaultState.settings.invertY, false);
console.log('✓ Default save state matches specification schema');

// Test 2: saveSaveState and loadSaveState
saveSaveState(defaultState);
const loaded = loadSaveState(testUid);
assert.notStrictEqual(loaded, null);
assert.strictEqual(loaded.userId, testUid);
assert.strictEqual(loaded.handle, testHandle);
console.log('✓ Save state write and read successfully round-tripped');

// Test 3: updateSaveStats
updateSaveStats(testUid, { matchesPlayed: 5, wins: 3, totalScore: 12500 });
const updatedStats = loadSaveState(testUid);
assert.strictEqual(updatedStats.stats.matchesPlayed, 5);
assert.strictEqual(updatedStats.stats.wins, 3);
assert.strictEqual(updatedStats.stats.totalScore, 12500);
console.log('✓ Save state stats updated correctly');

// Test 4: updateSaveSettings
updateSaveSettings(testUid, { sens: 0.0035, invertY: true });
const updatedSettings = loadSaveState(testUid);
assert.strictEqual(updatedSettings.settings.sens, 0.0035);
assert.strictEqual(updatedSettings.settings.invertY, true);
console.log('✓ Save state settings updated correctly');

// Test 5: AuthManager integration
let eventFired = false;
authManager.on(AuthEvents.STATE_CHANGED, ({ user, saveState }) => {
  if (user && saveState) eventFired = true;
});

await authManager.init();
assert.notStrictEqual(authManager.currentUser, null);
assert.strictEqual(state.currentUser.uid, authManager.currentUser.uid);
assert.notStrictEqual(authManager.saveState, null);
assert.strictEqual(authManager.saveState.userId, authManager.currentUser.uid);
console.log('✓ AuthManager initialized and bound state.currentUser:', authManager.currentUser.handle);

// Test 6: AuthManager settings application
authManager.recordSettings({ sens: 0.0042, invertY: false });
assert.strictEqual(state.sens, 0.0042);
assert.strictEqual(state.invertY, false);
console.log('✓ AuthManager.recordSettings properly synchronized engine state.sens and state.invertY');

// Clean up
clearSaveState(testUid);
console.log('--- TronSaveState & AuthManager Test Suite PASSED ---\n');
