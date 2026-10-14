/**
 * test_armory_modal.test.js
 * Comprehensive unit and integration test suite for:
 * Phase 3 Diegetic Armory UI, Split-Pane Grid, 3D Preview Bay & Fabrication Fanfare (SPEC-ARMORY-001).
 */

import assert from 'assert';
import {
  ARMORY_CATEGORIES,
  UNLOCK_TYPES,
  getCatalogByCategory,
  getCatalogItem
} from '../../src/armory/ArmoryCatalog.js';
import {
  ArmoryManager
} from '../../src/armory/ArmoryManager.js';
import {
  ArmoryModal,
  CATEGORY_TABS
} from '../../src/ui/modals/ArmoryModal.js';
import { SFX } from '../../src/audio/sfx.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Armory Modal & Fabrication Fanfare Test Suite (SPEC-ARMORY-001 Phase 3) ---');

// Mock in-memory storage & economy
function createMockServices() {
  const mem = {
    'economy.bits': 1000,
    'inventory.discSkins': ['disc_default'],
    'inventory.chassisSkins': ['chassis_default'],
    'inventory.unlockedMaps': ['arena_grid_01'],
    'inventory.discTypes': ['disc_standard'],
    'loadout.activeDisc': 'disc_default',
    'loadout.activeChassis': 'chassis_default',
    'loadout.activeArenaSkin': 'arena_grid_01',
    'loadout.activeDiscType': 'disc_standard',
    'achievements': []
  };

  const mockStorage = {
    isInitialized: true,
    get: (key, def = null) => {
      return mem[key] !== undefined ? mem[key] : def;
    },
    set: (key, val) => {
      mem[key] = val;
      return true;
    },
    save: () => true
  };

  const mockEconomy = {
    getBalance: () => mem['economy.bits'] || 0,
    canAfford: (cost) => (mem['economy.bits'] || 0) >= cost,
    spendBits: (cost) => {
      if ((mem['economy.bits'] || 0) >= cost) {
        mem['economy.bits'] -= cost;
        return true;
      }
      return false;
    },
    awardBits: (amount) => {
      mem['economy.bits'] = (mem['economy.bits'] || 0) + amount;
      return true;
    }
  };

  const armory = new ArmoryManager({
    storage: mockStorage,
    economy: mockEconomy
  });

  return { storage: mockStorage, economy: mockEconomy, armory, mem };
}

// Mock Preview Scene
class MockPreviewScene {
  constructor(options = {}) {
    this.options = options;
    this.stagedType = null;
    this.stagedId = null;
    this.disposed = false;
  }
  previewDisc(id) {
    this.stagedType = 'disc';
    this.stagedId = id;
  }
  previewChassis(id, discId) {
    this.stagedType = 'chassis';
    this.stagedId = id;
    this.activeDiscId = discId;
  }
  dispose() {
    this.disposed = true;
  }
}

// =========================================================================
// [Group 1] Procedural Audio Fanfare Synthesis
// =========================================================================
console.log('\n[Group 1] Testing Procedural Audio Fanfare Synthesis Functions...');

assert.strictEqual(typeof SFX.fabricate, 'function', 'SFX.fabricate must be exported');
assert.strictEqual(typeof SFX.equip, 'function', 'SFX.equip must be exported');

// Execution in headless environment should safely no-op
assert.doesNotThrow(() => {
  SFX.fabricate();
  SFX.equip();
}, 'Audio routines should safely execute without active AudioContext');
console.log('✓ SFX.fabricate and SFX.equip procedural synthesis hooks verified.');

// =========================================================================
// [Group 2] Top Navigation, Category Tabs & Live Bit Balance
// =========================================================================
console.log('\n[Group 2] Testing Top Navigation Bar, Category Tabs & Balance Display...');

const { armory, economy, storage, mem } = createMockServices();
const modal = new ArmoryModal({
  armory,
  economy,
  storage,
  PreviewSceneClass: MockPreviewScene
});

assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.DISC_SKINS, 'Defaults to discSkins');
assert.strictEqual(CATEGORY_TABS.length, 3, 'Must define 3 primary category tabs');

const initialMarkup = modal.render();
assert(initialMarkup.includes('IDENTITY DISCS'), 'Must include IDENTITY DISCS tab');
assert(initialMarkup.includes('PROGRAM CHASSIS'), 'Must include PROGRAM CHASSIS tab');
assert(initialMarkup.includes('EXOTIC ARENAS'), 'Must include EXOTIC ARENAS tab');
assert(initialMarkup.includes('$B 1,000'), 'Must render initial balance $B 1,000');
console.log('✓ Top navigation bar tabs and live Bit balance counter rendered.');

// =========================================================================
// [Group 3] Split-Pane Layout, Catalog Grid & Lore Dossier
// =========================================================================
console.log('\n[Group 3] Testing Split-Pane Catalog Grid & Lore Dossier Rendering...');

// Select first item by default
modal.selectedItemId = 'disc_default';
const discGridMarkup = modal.renderItemsGrid();
assert(discGridMarkup.includes('Identity Default'), 'Grid must list Identity Default');
assert(discGridMarkup.includes('Neon Amber'), 'Grid must list Neon Amber');
assert(discGridMarkup.includes('EQUIPPED'), 'Active equipped disc must have EQUIPPED badge');
assert(discGridMarkup.includes('400 BITS'), 'Unowned purchasable disc must display cost');

const dossierMarkup = modal.renderItemDossier();
assert(dossierMarkup.includes('Identity Default'), 'Dossier must show selected item title');
assert(dossierMarkup.includes('GLOW: 1.5X'), 'Dossier must render shader glow spec');
assert(dossierMarkup.includes('HEX: #00f3ff'), 'Dossier must render shader color hex');
console.log('✓ Catalog grid cards and detailed lore dossier specifications validated.');

// =========================================================================
// [Group 4] Contextual Action Bar State Machine
// =========================================================================
console.log('\n[Group 4] Testing Contextual Action Bar 5-State Machine...');

// State 1: Active Equipped Item -> [ ACTIVE PROTOCOL ]
modal.selectedItemId = 'disc_default';
let actionBarHtml = modal.renderActionBar();
assert(actionBarHtml.includes('[ ACTIVE PROTOCOL ]'), 'Equipped item must show [ ACTIVE PROTOCOL ]');
assert(actionBarHtml.includes('badge-active-protocol'), 'Must use badge-active-protocol class');

// State 2: Owned & Unequipped -> [ EQUIP TO LOADOUT ]
// Grant disc_neon_amber without equipping
mem['inventory.discSkins'].push('disc_neon_amber');
modal.selectedItemId = 'disc_neon_amber';
actionBarHtml = modal.renderActionBar();
assert(actionBarHtml.includes('[ EQUIP TO LOADOUT ]'), 'Owned unequipped item must show [ EQUIP TO LOADOUT ]');
assert(actionBarHtml.includes('btn-equip'), 'Must use btn-equip action class');

// State 3: Unowned Bit Purchasable (Affordable) -> [ FABRICATE // 600 BITS ]
modal.selectedItemId = 'disc_retro_green'; // cost: 600, player has 1000
assert.strictEqual(armory.canPurchase('disc_retro_green'), true);
actionBarHtml = modal.renderActionBar();
assert(actionBarHtml.includes('[ FABRICATE // 600 BITS ]'), 'Affordable item must show [ FABRICATE // 600 BITS ]');
assert(!actionBarHtml.includes('disabled'), 'Affordable item button must NOT be disabled');

// State 4: Unowned Bit Purchasable (Insufficient Bits) -> Disabled with warning
mem['economy.bits'] = 100; // balance now 100 < 600
modal.selectedItemId = 'disc_retro_green';
assert.strictEqual(armory.canPurchase('disc_retro_green'), false);
actionBarHtml = modal.renderActionBar();
assert(actionBarHtml.includes('[ FABRICATE // 600 BITS ]'), 'Must show price on button');
assert(actionBarHtml.includes('disabled'), 'Insufficient bits button must be disabled');
assert(actionBarHtml.includes('INSUFFICIENT BITS // HARVEST MORE ON THE GRID'), 'Must show amber warning message');

// State 5: Milestone Locked -> [ LOCKED // REQUIRES: ... ]
modal.selectedItemId = 'disc_corrupted_void'; // achievementId: corrupted_void_mastery
actionBarHtml = modal.renderActionBar();
assert(actionBarHtml.includes('[ LOCKED // REQUIRES: CORRUPTED VOID MASTERY ]'), 'Achievement item must show requirement');
assert(actionBarHtml.includes('disabled'), 'Milestone locked button must be disabled');
console.log('✓ Contextual action bar properly evaluated all 5 state variations.');

// =========================================================================
// [Group 5] Atomic Fabrication Purchase & Visual Fanfare
// =========================================================================
console.log('\n[Group 5] Testing Atomic Fabrication Purchase & Fanfare...');

// Restore balance to 1000
mem['economy.bits'] = 1000;
modal.selectedItemId = 'disc_retro_green'; // cost: 600

let audioFabricateTriggered = false;
const origFabricate = SFX.fabricate;
SFX.fabricate = () => { audioFabricateTriggered = true; };

modal.handleFabricate('disc_retro_green');

assert.strictEqual(audioFabricateTriggered, true, 'Fabricate audio sound must be triggered');
assert.strictEqual(mem['economy.bits'], 400, 'Bits must be deducted atomically: 1000 - 600 = 400');
assert.strictEqual(armory.isUnlocked(ARMORY_CATEGORIES.DISC_SKINS, 'disc_retro_green'), true, 'Item must be granted to inventory');

// Verify that after purchase, action bar transitions to [ EQUIP TO LOADOUT ]
const postBuyActionBar = modal.renderActionBar();
assert(postBuyActionBar.includes('[ EQUIP TO LOADOUT ]'), 'Action button must immediately transition to EQUIP TO LOADOUT');

SFX.fabricate = origFabricate;
console.log('✓ Fabrication purchase executes currency deduction, inventory grant, and audio-visual fanfare.');

// =========================================================================
// [Group 6] Equipment Transition & Loadout Persistence
// =========================================================================
console.log('\n[Group 6] Testing Equipment Transition & Loadout Persistence...');

let audioEquipTriggered = false;
const origEquip = SFX.equip;
SFX.equip = () => { audioEquipTriggered = true; };

modal.handleEquip('disc_retro_green');

assert.strictEqual(audioEquipTriggered, true, 'Equip sound effect must be synthesized');
assert.strictEqual(armory.getEquippedLoadout().discSkin, 'disc_retro_green', 'Loadout must persist newly equipped item');

const postEquipActionBar = modal.renderActionBar();
assert(postEquipActionBar.includes('[ ACTIVE PROTOCOL ]'), 'Action bar must now display [ ACTIVE PROTOCOL ]');

SFX.equip = origEquip;
console.log('✓ Equipment transition updates loadout storage and refreshes active protocol status.');

// =========================================================================
// [Group 7] Category Switching & 3D Turntable Preview Staging
// =========================================================================
console.log('\n[Group 7] Testing Category Switching & Preview Scene Staging...');

// Switch to Chassis Skins
modal.switchCategory(ARMORY_CATEGORIES.CHASSIS_SKINS);
assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.CHASSIS_SKINS);
assert.strictEqual(modal.selectedItemId, 'chassis_default');
const chassisGrid = modal.renderItemsGrid();
assert(chassisGrid.includes('Combat Enforcer Default'), 'Chassis category must list enforcer default');

// Switch to Exotic Arenas
modal.switchCategory(ARMORY_CATEGORIES.UNLOCKED_MAPS);
assert.strictEqual(modal.activeCategory, ARMORY_CATEGORIES.UNLOCKED_MAPS);
assert.strictEqual(modal.selectedItemId, 'arena_grid_01');
const mapsGrid = modal.renderItemsGrid();
assert(mapsGrid.includes('Grid 01: Core Arena'), 'Maps category must list Grid 01');
console.log('✓ Category tab switching properly updates catalog grid and selection state.');

// =========================================================================
// [Group 8] Lifecycle Teardown & Resource Disposal
// =========================================================================
console.log('\n[Group 8] Testing Lifecycle Teardown & WebGL Resource Disposal...');

const testPreview = new MockPreviewScene();
modal.previewScene = testPreview;

let backToMenuFired = false;
modal.setOnBackToMenu(() => { backToMenuFired = true; });

state.armoryModalOpen = true;
modal.hide();

assert.strictEqual(state.armoryModalOpen, false, 'armoryModalOpen state flag must be cleared');
assert.strictEqual(testPreview.disposed, true, 'Preview scene dispose must be invoked to release WebGL VRAM');
assert.strictEqual(modal.previewScene, null, 'Preview scene reference must be cleared');
assert.strictEqual(backToMenuFired, true, 'Back to menu callback must be invoked on modal dismiss');

// Test dispose() alias
modal.previewScene = new MockPreviewScene();
modal.dispose();
assert.strictEqual(modal.previewScene, null, 'dispose() must cleanly execute teardown');
console.log('✓ Lifecycle teardown and WebGL resource disposal verified without memory leaks.');

console.log('\n=================================================================');
console.log('ALL ARMORY MODAL & FABRICATION FANFARE TESTS PASSED (100% SUCCESS)');
console.log('=================================================================');
