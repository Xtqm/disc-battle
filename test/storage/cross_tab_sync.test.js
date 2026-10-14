import assert from 'assert';
import { CrossTabSync, crossTabSync } from '../../src/storage/CrossTabSync.js';
import { CloudSyncResolver } from '../../src/storage/CloudSyncResolver.js';

console.log('--- Running CrossTabSync Test Suite ---');

const tabA = new CrossTabSync({ tabId: 'tab_alpha', channelName: 'test_cross_tab_channel' });
const tabB = new CrossTabSync({ tabId: 'tab_beta', channelName: 'test_cross_tab_channel' });

// Test 1: Message broadcast and loopback suppression
let tabAReceived = [];
let tabBReceived = [];

tabA.onMessage((msg) => tabAReceived.push(msg));
tabB.onMessage((msg) => tabBReceived.push(msg));

tabA.broadcast('TEST_EVENT', { payload: 42 });

assert.strictEqual(tabAReceived.length, 0, 'Tab A must not receive its own broadcast (loopback suppressed)');
assert.strictEqual(tabBReceived.length, 1, 'Tab B must receive message from Tab A');
assert.strictEqual(tabBReceived[0].type, 'TEST_EVENT');
assert.strictEqual(tabBReceived[0].sourceTabId, 'tab_alpha');
assert.strictEqual(tabBReceived[0].payload.payload, 42);
console.log('✓ Cross-tab message transmission succeeded with loopback suppression');

// Test 2: Cross-tab Auth State propagation
const newUser = { uid: 'user_clu_99', handle: 'CLU', isAnonymous: false };
tabA.broadcastAuthState(newUser);

assert.strictEqual(tabBReceived.length, 2);
assert.strictEqual(tabBReceived[1].type, 'AUTH_STATE_CHANGED');
assert.deepStrictEqual(tabBReceived[1].payload.user, newUser);
console.log('✓ Auth state change broadcast delivered to peer tab');

// Test 3: Cross-tab Save State update & Monotonic resolution
const tabBLocalState = {
  userId: 'user_clu_99',
  handle: 'CLU',
  bits: 1000,
  level: 6,
  starMastery: { 1: 3, 2: 3 },
  inventory: ['disc_default', 'skin_clu'],
  achievements: ['ACH_GRID_MASTER']
};

const tabAIncomingSave = {
  userId: 'user_clu_99',
  handle: 'CLU',
  bits: 1500,
  level: 4, // lower level
  starMastery: { 1: 2, 2: 1, 3: 2 },
  inventory: ['disc_default', 'disc_solar_flare'],
  achievements: ['ACH_FIRST_WIN']
};

// Simulate Tab B receiving Save State update from Tab A and merging monotonically
const mergedInTabB = CloudSyncResolver.resolve(tabBLocalState, tabAIncomingSave);

assert.strictEqual(mergedInTabB.bits, 1500, 'Bits must be max(1000, 1500) = 1500');
assert.strictEqual(mergedInTabB.level, 6, 'Level must be max(6, 4) = 6 (no downgrade)');
assert.strictEqual(mergedInTabB.starMastery[1], 3);
assert.strictEqual(mergedInTabB.starMastery[2], 3);
assert.strictEqual(mergedInTabB.starMastery[3], 2);
assert.ok(mergedInTabB.inventory.includes('skin_clu'));
assert.ok(mergedInTabB.inventory.includes('disc_solar_flare'));
assert.ok(mergedInTabB.achievements.includes('ACH_GRID_MASTER'));
assert.ok(mergedInTabB.achievements.includes('ACH_FIRST_WIN'));
console.log('✓ Peer save state merged monotonically without overriding higher local progress');

tabA.destroy();
tabB.destroy();
crossTabSync.destroy();
console.log('--- CrossTabSync Test Suite PASSED ---\n');
