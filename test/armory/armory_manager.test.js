/**
 * test_armory_manager.js
 * Comprehensive unit and integration test suite for Armory Catalog Registry,
 * Purchase Pipeline, and Loadout Controller (SPEC-ARMORY-001 Phase 1).
 */

import assert from 'assert';
import {
  ARMORY_CATALOG,
  ARMORY_CATEGORIES,
  UNLOCK_TYPES,
  isValidCategory,
  getCatalogByCategory,
  getCatalogItem,
  getAllCatalogItems
} from '../../src/armory/ArmoryCatalog.js';
import {
  ArmoryManager,
  armoryManager,
  ArmoryEvents,
  DEFAULT_LOADOUT_SLOTS,
  CATEGORY_INVENTORY_PATHS,
  CATEGORY_LOADOUT_PATHS
} from '../../src/armory/ArmoryManager.js';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';

console.log('--- Running Armory Catalog & Loadout Controller Test Suite (SPEC-ARMORY-001) ---');

// =========================================================================
// Test Group 1: Catalog Registry & Shader Metadata
// =========================================================================
console.log('\n[Group 1] Testing Catalog Metadata, Categories & Shader Parameters...');

// 1.1 Category validation
assert.strictEqual(isValidCategory(ARMORY_CATEGORIES.DISC_SKINS), true);
assert.strictEqual(isValidCategory(ARMORY_CATEGORIES.CHASSIS_SKINS), true);
assert.strictEqual(isValidCategory(ARMORY_CATEGORIES.UNLOCKED_MAPS), true);
assert.strictEqual(isValidCategory(ARMORY_CATEGORIES.DISC_TYPES), true);
assert.strictEqual(isValidCategory('invalidCategory'), false);
assert.strictEqual(isValidCategory(null), false);
assert.strictEqual(isValidCategory(undefined), false);

// 1.2 Category items retrieval
const discSkins = getCatalogByCategory(ARMORY_CATEGORIES.DISC_SKINS);
const chassisSkins = getCatalogByCategory(ARMORY_CATEGORIES.CHASSIS_SKINS);
const maps = getCatalogByCategory(ARMORY_CATEGORIES.UNLOCKED_MAPS);
const discTypes = getCatalogByCategory(ARMORY_CATEGORIES.DISC_TYPES);

assert.strictEqual(discSkins.length, 5, 'Must have 5 disc skins');
assert.strictEqual(chassisSkins.length, 5, 'Must have 5 chassis skins');
assert.strictEqual(maps.length, 3, 'Must have 3 maps');
assert.strictEqual(discTypes.length, 1, 'Must have 1 disc type');

// 1.3 Total items
const allItems = getAllCatalogItems();
assert.strictEqual(allItems.length, 14, 'Total catalog items must be 14');

// 1.4 Field structure & shader parameters validation
for (const item of allItems) {
  assert.ok(item.id, `Item must have an id: ${JSON.stringify(item)}`);
  assert.ok(item.displayName, `Item must have a displayName: ${item.id}`);
  assert.ok(item.category, `Item must have a category: ${item.id}`);
  assert.ok(item.description, `Item must have a description: ${item.id}`);
  assert.ok(
    [UNLOCK_TYPES.FREE, UNLOCK_TYPES.BITS, UNLOCK_TYPES.ACHIEVEMENT].includes(item.unlockType),
    `Invalid unlockType for ${item.id}`
  );
  assert.strictEqual(typeof item.cost, 'number', `Cost must be numeric for ${item.id}`);
  if (item.unlockType === UNLOCK_TYPES.BITS) {
    assert.ok(item.cost > 0, `Bits item must have cost > 0: ${item.id}`);
  } else {
    assert.strictEqual(item.cost, 0, `Free/achievement item must have cost 0: ${item.id}`);
  }

  // Shader parameters
  assert.ok(item.shader, `Item must have shader object: ${item.id}`);
  assert.ok(typeof item.shader.primaryHex === 'string', `primaryHex missing in ${item.id}`);
  assert.ok(typeof item.shader.secondaryEmissiveHex === 'string', `secondaryEmissiveHex missing in ${item.id}`);
  assert.ok(typeof item.shader.trailOpacity === 'number', `trailOpacity missing in ${item.id}`);
  assert.ok(typeof item.shader.wireframeToggle === 'boolean', `wireframeToggle missing in ${item.id}`);
}

// 1.5 Individual item lookups
const amberDisc = getCatalogItem('disc_neon_amber');
assert.ok(amberDisc);
assert.strictEqual(amberDisc.cost, 400);
assert.strictEqual(amberDisc.category, ARMORY_CATEGORIES.DISC_SKINS);

const voidDisc = getCatalogItem('disc_corrupted_void');
assert.ok(voidDisc);
assert.strictEqual(voidDisc.unlockType, UNLOCK_TYPES.ACHIEVEMENT);
assert.strictEqual(voidDisc.achievementId, 'corrupted_void_mastery');

const arbiterChassis = getCatalogItem('chassis_arbiter');
assert.ok(arbiterChassis);
assert.strictEqual(arbiterChassis.unlockType, UNLOCK_TYPES.ACHIEVEMENT);
assert.strictEqual(arbiterChassis.achievementId, 'grid_01_mastery');

assert.strictEqual(getCatalogItem('nonexistent_item_id'), null);
assert.strictEqual(getCatalogItem(''), null);
assert.strictEqual(getCatalogItem(null), null);

console.log('✓ Group 1: Catalog metadata, category indexers and shader properties validated.');

// =========================================================================
// Test Group 2: Isolated ArmoryManager & Unlock Resolution
// =========================================================================
console.log('\n[Group 2] Testing Ownership Verification & Unlock Resolution...');

const testStorage = new StorageManager({
  storageKey: 'tron_test_armory_storage',
  backupKey: 'tron_test_armory_storage.bak',
  debounceMs: 50
});
testStorage.reset();

const testEconomy = new EconomyManager({ storage: testStorage });
const armory = new ArmoryManager({
  storage: testStorage,
  economy: testEconomy
});

// 2.1 Free baseline items are immediately unlocked
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_default'), true);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.CHASSIS_SKINS, 'chassis_default'), true);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.UNLOCKED_MAPS, 'arena_grid_01'), true);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_TYPES, 'disc_standard'), true);

// 2.2 Legacy alias for identity disc resolves to unlocked
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_identity_default'), true);

// 2.3 Locked Bits items return false initially
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_neon_amber'), false);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.CHASSIS_SKINS, 'chassis_infiltrator'), false);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.UNLOCKED_MAPS, 'arena_zero_g_nexus'), false);

// 2.4 Locked achievement items return false initially
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_corrupted_void'), false);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.CHASSIS_SKINS, 'chassis_arbiter'), false);

// 2.5 Granting achievement unlocks the gated item
testStorage.set('achievements', ['grid_01_mastery']);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.CHASSIS_SKINS, 'chassis_arbiter'), true);
// disc_corrupted_void still locked
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_corrupted_void'), false);

// 2.6 Granting achievement object array
testStorage.set('achievements', [{ id: 'corrupted_void_mastery' }, { id: 'grid_01_mastery' }]);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_corrupted_void'), true);

// 2.7 Invalid categories or item IDs return false
assert.strictEqual(armory.isUnlocked('invalid', 'disc_default'), false);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'invalid_id'), false);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'chassis_default'), false); // Mismatched category

console.log('✓ Group 2: Ownership verification and multi-model unlocks validated.');

// =========================================================================
// Test Group 3: Purchase Eligibility & Validation
// =========================================================================
console.log('\n[Group 3] Testing Purchase Eligibility Guards & Affordability...');

// 3.1 Free and achievement items cannot be purchased
assert.strictEqual(armory.canPurchase('disc_default'), false);
assert.strictEqual(armory.canPurchase('chassis_default'), false);
assert.strictEqual(armory.canPurchase('disc_corrupted_void'), false);
assert.strictEqual(armory.canPurchase('chassis_arbiter'), false);
assert.strictEqual(armory.canPurchase('nonexistent_item'), false);
assert.strictEqual(armory.canPurchase(''), false);

// 3.2 Bits items when wallet balance is 0
testStorage.set('player.currency.bits', 0);
assert.strictEqual(armory.canPurchase('disc_neon_amber'), false); // Cost: 400
assert.strictEqual(armory.canPurchase('chassis_infiltrator'), false); // Cost: 500

// 3.3 Partial balance insufficient
testStorage.set('player.currency.bits', 350);
assert.strictEqual(armory.canPurchase('disc_neon_amber'), false);

// 3.4 Exact balance sufficient
testStorage.set('player.currency.bits', 400);
assert.strictEqual(armory.canPurchase('disc_neon_amber'), true);
assert.strictEqual(armory.canPurchase('disc_retro_green'), false); // Cost: 600

// 3.5 Abundant balance sufficient
testStorage.set('player.currency.bits', 1500);
assert.strictEqual(armory.canPurchase('disc_retro_green'), true);
assert.strictEqual(armory.canPurchase('arena_zero_g_nexus'), true); // Cost: 1000
assert.strictEqual(armory.canPurchase('arena_derez_chasm'), true); // Cost: 1500

console.log('✓ Group 3: Purchase feasibility and currency guards validated.');

// =========================================================================
// Test Group 4: Atomic Purchase Pipeline & Event Dispatch
// =========================================================================
console.log('\n[Group 4] Testing Atomic Purchase Execution & State Persistence...');

testStorage.reset();
testEconomy.awardBits(1000, 'campaign_reward');
assert.strictEqual(testEconomy.getBits(), 1000);

let unlockedEventPayload = null;
const unsubscribeUnlock = armory.on(ArmoryEvents.ITEM_UNLOCKED, (payload) => {
  unlockedEventPayload = payload;
});

// 4.1 Purchase disc_neon_amber (Cost: 400 Bits)
const purchaseSuccess = armory.purchaseItem('disc_neon_amber');
assert.strictEqual(purchaseSuccess, true, 'Purchase should succeed');

// Balance must be exactly 1000 - 400 = 600
assert.strictEqual(testEconomy.getBits(), 600, 'Bits balance must reflect 400 Bits deduction');

// Event payload verification
assert.ok(unlockedEventPayload, 'ARMORY_ITEM_UNLOCKED must be emitted');
assert.strictEqual(unlockedEventPayload.category, ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(unlockedEventPayload.itemId, 'disc_neon_amber');
assert.strictEqual(unlockedEventPayload.cost, 400);
assert.ok(unlockedEventPayload.timestamp > 0);

// Ownership is now unlocked
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_neon_amber'), true);

// Verify inventory persistence
const storedDiscSkins = testStorage.get('inventory.discSkins', []);
assert.ok(storedDiscSkins.includes('disc_neon_amber'), 'Inventory array must contain purchased item');

// 4.2 Re-purchasing an already owned item is rejected
unlockedEventPayload = null;
const repurchaseAttempt = armory.purchaseItem('disc_neon_amber');
assert.strictEqual(repurchaseAttempt, false, 'Repurchasing owned item must be rejected');
assert.strictEqual(testEconomy.getBits(), 600, 'Balance must not change on rejected repurchase');
assert.strictEqual(unlockedEventPayload, null, 'No event should be emitted on rejected purchase');

// 4.3 Purchasing with insufficient Bits is rejected
// Current balance is 600. chassis_black_guard costs 1200 Bits.
const expensiveAttempt = armory.purchaseItem('chassis_black_guard');
assert.strictEqual(expensiveAttempt, false, 'Insufficient funds purchase must be rejected');
assert.strictEqual(testEconomy.getBits(), 600, 'Balance must remain intact');
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.CHASSIS_SKINS, 'chassis_black_guard'), false);

// 4.4 Purchasing map arena_zero_g_nexus (Cost 1000 Bits, balance is 600 -> reject)
assert.strictEqual(armory.purchaseItem('arena_zero_g_nexus'), false);

// Add 500 Bits -> balance 1100 -> buy arena_zero_g_nexus (1000 Bits) -> balance 100
testEconomy.awardBits(500, 'match_reward');
assert.strictEqual(testEconomy.getBits(), 1100);
assert.strictEqual(armory.purchaseItem('arena_zero_g_nexus'), true);
assert.strictEqual(testEconomy.getBits(), 100);
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.UNLOCKED_MAPS, 'arena_zero_g_nexus'), true);

const storedMaps = testStorage.get('inventory.unlockedMaps', []);
assert.ok(storedMaps.includes('arena_zero_g_nexus'), 'Map must be saved to inventory.unlockedMaps');

unsubscribeUnlock();
console.log('✓ Group 4: Atomic purchase execution, balances, and inventory persistence validated.');

// =========================================================================
// Test Group 5: Loadout Controller & Equipment Management
// =========================================================================
console.log('\n[Group 5] Testing Loadout Controller & Equipment Transitions...');

let loadoutEventPayload = null;
const unsubscribeLoadout = armory.on(ArmoryEvents.LOADOUT_CHANGED, (payload) => {
  loadoutEventPayload = payload;
});

// 5.1 Baseline loadout inspection
const initialLoadout = armory.getEquippedLoadout();
assert.strictEqual(initialLoadout.discSkin, 'disc_default');
assert.strictEqual(initialLoadout.chassisSkin, 'chassis_default');
assert.strictEqual(initialLoadout.unlockedMap, 'arena_grid_01');
assert.strictEqual(initialLoadout.discType, 'disc_standard');

// 5.2 Equipping a locked item is rejected
const equipLocked = armory.equipItem(ARMORY_CATEGORIES.DISC_SKINS, 'disc_plasma_violet');
assert.strictEqual(equipLocked, false, 'Equipping locked item must fail');
assert.strictEqual(armory.getEquippedLoadout().discSkin, 'disc_default');
assert.strictEqual(loadoutEventPayload, null, 'No loadout event on rejected equip');

// 5.3 Equipping an unlocked purchased item succeeds
const equipPurchased = armory.equipItem(ARMORY_CATEGORIES.DISC_SKINS, 'disc_neon_amber');
assert.strictEqual(equipPurchased, true, 'Equipping unlocked item must succeed');

assert.ok(loadoutEventPayload, 'LOADOUT_CHANGED event must be dispatched');
assert.strictEqual(loadoutEventPayload.category, ARMORY_CATEGORIES.DISC_SKINS);
assert.strictEqual(loadoutEventPayload.itemId, 'disc_neon_amber');
assert.strictEqual(loadoutEventPayload.previousItemId, 'disc_default');
assert.strictEqual(loadoutEventPayload.loadout.discSkin, 'disc_neon_amber');

// Verify active loadout query
const currentLoadout = armory.getEquippedLoadout();
assert.strictEqual(currentLoadout.discSkin, 'disc_neon_amber');

// Verify persistence in storage
assert.strictEqual(testStorage.get('loadout.activeDisc'), 'disc_neon_amber');

// 5.4 Equipping unlocked map
loadoutEventPayload = null;
assert.strictEqual(armory.equipItem(ARMORY_CATEGORIES.UNLOCKED_MAPS, 'arena_zero_g_nexus'), true);
assert.strictEqual(loadoutEventPayload.itemId, 'arena_zero_g_nexus');
assert.strictEqual(armory.getEquippedLoadout().unlockedMap, 'arena_zero_g_nexus');
assert.strictEqual(testStorage.get('loadout.activeArenaSkin'), 'arena_zero_g_nexus');

// 5.5 Equipping mismatched category is rejected
assert.strictEqual(armory.equipItem(ARMORY_CATEGORIES.CHASSIS_SKINS, 'disc_neon_amber'), false);

unsubscribeLoadout();
console.log('✓ Group 5: Loadout equipment, rejection guards, and event emission validated.');

// =========================================================================
// Test Group 6: Developer Debug Suite Instrumentation
// =========================================================================
console.log('\n[Group 6] Testing Debug Console Suite Instrumentation...');

const mockWindow = {};
armory.setupDebugSuite(mockWindow);

assert.ok(mockWindow.gameDebug);
assert.ok(mockWindow.gameDebug.armory);
assert.strictEqual(typeof mockWindow.gameDebug.armory.unlockAll, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.armory.getLoadout, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.armory.equip, 'function');
assert.strictEqual(typeof mockWindow.gameDebug.armory.purchase, 'function');

// Test debug unlockAll
mockWindow.gameDebug.armory.unlockAll();
for (const item of getAllCatalogItems()) {
  assert.strictEqual(
    armory.isUnlocked(item.category, item.id),
    true,
    `Item ${item.id} must be unlocked after debug unlockAll`
  );
}

// Test debug equip
assert.strictEqual(mockWindow.gameDebug.armory.equip(ARMORY_CATEGORIES.DISC_SKINS, 'disc_plasma_violet'), true);
assert.strictEqual(mockWindow.gameDebug.armory.getLoadout().discSkin, 'disc_plasma_violet');

console.log('✓ Group 6: Developer debug hooks validated.');

// =========================================================================
// Test Group 7: Global Singleton Export
// =========================================================================
console.log('\n[Group 7] Testing Global Singleton Export...');

assert.ok(armoryManager instanceof ArmoryManager);
assert.strictEqual(typeof armoryManager.isUnlocked, 'function');
assert.strictEqual(typeof armoryManager.equipItem, 'function');
assert.strictEqual(typeof armoryManager.purchaseItem, 'function');

console.log('✓ Group 7: Authoritative singleton instance validated.');

console.log('\n=================================================================');
console.log('ALL ARMORY CATALOG & LOADOUT CONTROLLER TESTS PASSED (100% SUCCESS)');
console.log('=================================================================');
