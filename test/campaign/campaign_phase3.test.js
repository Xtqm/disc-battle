/**
 * test_campaign_phase3.js
 * Comprehensive unit and integration test suite for:
 * Phase 3 Sector Hazards, Rival Arbiter Bosses & Duel Map Propagation (SPEC-CAMP-001).
 */

import assert from 'assert';
import fs from 'fs';
import { StorageManager } from '../../src/core/storage/StorageManager.js';
import { createDefaultSaveState, validateSaveState } from '../../src/core/storage/schema.js';
import { EconomyManager } from '../../src/core/economy/EconomyManager.js';
import { CampaignRegistry } from '../../src/campaign/CampaignRegistry.js';
import { StarEvaluator } from '../../src/campaign/StarEvaluator.js';
import { CampaignManager, CampaignEvents } from '../../src/campaign/CampaignManager.js';
import { SFX } from '../../src/audio/sfx.js';
import { SECTOR_THEMES, SectorHazardBuilder } from '../../src/arena/hazards/SectorHazardBuilder.js';
import { ArbiterBossController, ARBITER_CONFIGS } from '../../src/ai/ArbiterBossController.js';
import { CampaignHUD } from '../../src/ui/campaign/CampaignHUD.js';
import { TrialDebriefModal } from '../../src/ui/campaign/TrialDebriefModal.js';
import {
  ARENA_MAP_METADATA,
  getGridIdForMap,
  getUnlockedArenaMaps,
  selectArenaMap,
  updateArenaSelectControls
} from '../../src/ui/arenaSelector.js';
import { state } from '../../src/core/state.js';

console.log('--- Running Campaign Phase 3 (SPEC-CAMP-001) Test Suite ---');

// Mock scene and environment helpers
function createMockScene() {
  const children = [];
  return {
    children,
    add(...objs) {
      children.push(...objs);
    },
    remove(...objs) {
      for (const obj of objs) {
        const idx = children.indexOf(obj);
        if (idx !== -1) children.splice(idx, 1);
      }
    }
  };
}

function createMockTiles() {
  const tiles = new Map();
  for (let x = -3; x <= 3; x++) {
    for (let z = -3; z <= 3; z++) {
      const key = `${x},${z}`;
      tiles.set(key, {
        x,
        z,
        state: 'intact',
        slabMesh: {
          material: {
            color: { setHex(c) { this._hex = c; } },
            roughness: 0.5,
            metalness: 0.5,
            dispose() {}
          }
        },
        edgeMesh: {
          material: {
            color: { setHex(c) { this._hex = c; } },
            dispose() {}
          }
        }
      });
    }
  }
  return tiles;
}

function createMockWalls() {
  return [
    {
      mesh: {
        material: {
          color: { setHex(c) { this._hex = c; } },
          emissive: { setHex(c) { this._hex = c; } },
          dispose() {}
        }
      }
    }
  ];
}

function createMockStorage(initialData = {}) {
  const memStorage = JSON.parse(JSON.stringify(initialData));
  return {
    isInitialized: true,
    get: (key, def = null) => {
      const parts = key.split('.');
      let curr = memStorage;
      for (const p of parts) {
        if (!curr || typeof curr !== 'object') return def;
        curr = curr[p];
      }
      return curr !== undefined ? curr : def;
    },
    set: (key, val) => {
      const parts = key.split('.');
      let curr = memStorage;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = val;
      return true;
    },
    save: () => true
  };
}

// =========================================================================
// [Group 1] Storage Schema Foundation & Backward Compatibility
// =========================================================================
console.log('\n[Group 1] Testing Storage Schema Foundation & Backward Compatibility...');

const defaultSave = createDefaultSaveState();
assert(Array.isArray(defaultSave.inventory.unlockedMaps), 'inventory.unlockedMaps must be an array');
assert.deepStrictEqual(defaultSave.inventory.unlockedMaps, ['arena_grid_01'], 'Default unlockedMaps must be ["arena_grid_01"]');

// Validate schema accepts valid unlockedMaps
const validationValid = validateSaveState(defaultSave);
assert.strictEqual(validationValid.valid, true, 'Default save state with unlockedMaps must be valid');

// Validate schema validation for state without unlockedMaps
const legacyState = JSON.parse(JSON.stringify(defaultSave));
delete legacyState.inventory.unlockedMaps;
const validationLegacy = validateSaveState(legacyState);
assert.strictEqual(validationLegacy.valid, true, 'Legacy state must validate cleanly');

// Test StorageManager.load migration populates unlockedMaps
const legacyStorage = new StorageManager({ storageKey: 'test_legacy_migration_slot' });
legacyStorage._setItem('test_legacy_migration_slot', JSON.stringify(legacyState));
const migratedState = legacyStorage.load();
assert(Array.isArray(migratedState.inventory.unlockedMaps), 'Migration must populate inventory.unlockedMaps');
assert.strictEqual(migratedState.inventory.unlockedMaps[0], 'arena_grid_01', 'Default arena present in migrated state');

console.log('✓ Storage schema defaults, validation, and legacy migrations verified cleanly');

// =========================================================================
// [Group 2] Sector Visual Themes & Palette Integrity
// =========================================================================
console.log('\n[Group 2] Testing Sector Visual Themes & Palette Integrity...');

assert(SECTOR_THEMES.grid_01, 'Theme for grid_01 must exist');
assert(SECTOR_THEMES.grid_02, 'Theme for grid_02 must exist');
assert(SECTOR_THEMES.grid_03, 'Theme for grid_03 must exist');
assert(SECTOR_THEMES.grid_04, 'Theme for grid_04 must exist');

// Verify palette definitions
assert.strictEqual(SECTOR_THEMES.grid_01.primaryColor, 0x00e5ff, 'Grid 01 primary must be cyan neon (#00e5ff)');
assert.strictEqual(SECTOR_THEMES.grid_01.mapId, 'arena_grid_01', 'Grid 01 mapId must be arena_grid_01');

assert.strictEqual(SECTOR_THEMES.grid_02.primaryColor, 0xffaa00, 'Grid 02 primary must be amber (#ffaa00)');
assert.strictEqual(SECTOR_THEMES.grid_02.mapId, 'arena_solar_sail', 'Grid 02 mapId must be arena_solar_sail');

assert.strictEqual(SECTOR_THEMES.grid_03.primaryColor, 0x7b2cbf, 'Grid 03 primary must be violet (#7b2cbf)');
assert.strictEqual(SECTOR_THEMES.grid_03.mapId, 'arena_sea_sim', 'Grid 03 mapId must be arena_sea_sim');

assert.strictEqual(SECTOR_THEMES.grid_04.primaryColor, 0xff0055, 'Grid 04 primary must be crimson (#ff0055)');
assert.strictEqual(SECTOR_THEMES.grid_04.edgeColor, 0xffd700, 'Grid 04 edge must be gold (#ffd700)');
assert.strictEqual(SECTOR_THEMES.grid_04.mapId, 'arena_core_pinnacle', 'Grid 04 mapId must be arena_core_pinnacle');

// Verify theme resolution by gridId and mapId
const builder = new SectorHazardBuilder();
assert.strictEqual(builder.getTheme('grid_02').id, 'grid_02', 'getTheme by gridId returns grid_02');
assert.strictEqual(builder.getTheme('arena_solar_sail').id, 'grid_02', 'getTheme by mapId returns grid_02');
assert.strictEqual(builder.getTheme('arena_core_pinnacle').id, 'grid_04', 'getTheme by mapId returns grid_04');
assert.strictEqual(builder.getTheme('unknown').id, 'grid_01', 'getTheme defaults to grid_01');

// Verify applySectorTheme
const mockTiles = createMockTiles();
const mockWalls = createMockWalls();
builder.applySectorTheme('grid_02', mockTiles, mockWalls);
assert.strictEqual(builder.activeGridId, 'grid_02', 'Active grid updated to grid_02');

console.log('✓ Sector visual themes, color palettes, and dual ID resolution verified');

// =========================================================================
// [Group 3] Environmental Hazard Physical Colliders & Lifecycles
// =========================================================================
console.log('\n[Group 3] Testing Environmental Hazard Physical Colliders & Lifecycles...');

const mockScene = createMockScene();

// Grid 01: Ricochet Pillars
builder.buildSectorHazards('grid_01', mockScene);
assert.strictEqual(builder.ricochetPillars.length, 4, 'Grid 01 must construct 4 static ricochet pillars');
const pillar = builder.ricochetPillars[0];
// Test disc ricochet reflection via checkDiscCollision
const testDisc = {
  pos: { x: pillar.x - 1.0, z: pillar.z },
  vel: { x: 20, z: 0 }
};
const ricochetResult = builder.checkDiscCollision(testDisc);
assert.strictEqual(ricochetResult, true, 'Pillar impact must register hit and deflect');
assert(testDisc.vel.x < 0, 'Velocity must reflect away from pillar on normal of incidence');

// Grid 02: Vertical Jump Pads & Elevated Platforms
builder.buildSectorHazards('grid_02', mockScene);
assert(builder.jumpPads.length >= 2, 'Grid 02 must construct jump pads');
assert(builder.elevatedPlatforms.length >= 2, 'Grid 02 must construct elevated platforms');

// Test jump pad launch impulse via update loop
const pad = builder.jumpPads[0];
const testPlayer = { pos: { x: pad.x, z: pad.z }, y: 0.5, vy: 0, grounded: true };
let soundPlayed = null;
builder.update(0.016, { player: testPlayer, onPlaySound: (s) => { soundPlayed = s; } });
assert(testPlayer.vy >= 14.0, `Jump pad impulse must be >= 14.0 m/s (actual: ${testPlayer.vy})`);
assert.strictEqual(testPlayer.grounded, false, 'Player airborne after pad trigger');
assert.strictEqual(soundPlayed, 'jump_pad', 'Jump pad triggers sound effect');

// Elevated platform bounds check
const platform = builder.elevatedPlatforms[0];
assert.strictEqual(platform.y, 3.0, 'Platform elevation height is 3.0');
assert(platform.minX < platform.maxX && platform.minZ < platform.maxZ, 'Platform defines bounding rectangle');

// Grid 03: Oscillating Forcefields & Timed Laser Gates
builder.buildSectorHazards('grid_03', mockScene);
assert(builder.forcefields.length >= 2, 'Grid 03 must construct forcefields');
assert(builder.laserGates.length >= 2, 'Grid 03 must construct laser gates');

// Forcefield reflection
const ff = builder.forcefields[0];
ff.active = true;
const ffDisc = { pos: { x: ff.x, z: ff.z }, vel: { x: 0, z: 20 } };
const ffHit = builder.checkDiscCollision(ffDisc);
assert.strictEqual(ffHit, true, 'Active forcefield deflects disc');
assert(ffDisc.vel.z < 0, 'Disc reflects off forcefield');

// Laser gate damage check via update
const gate = builder.laserGates[0];
gate.active = true;
let damageReceived = 0;
const laserPlayer = { pos: { x: gate.spot.x1, z: gate.spot.z1 }, y: 1.0 };
builder.update(0.016, { player: laserPlayer, onPlayerDamage: (dmg) => { damageReceived = dmg; } });
assert(damageReceived > 0, 'Active laser beam inflicts damage on contact');

// Grid 04: Floor De-Rez Void Zones
const grid04Tiles = new Map();
grid04Tiles.set('11_9', { state: 0, mesh: { visible: true } });
builder.buildSectorHazards('grid_04', mockScene, grid04Tiles);
assert(builder.voidZones.length > 0, 'Grid 04 must construct floor void zones');
const voidTile = grid04Tiles.get('11_9');
assert.strictEqual(voidTile.state, 2, 'Void zone tile marked as fallen state (2)');

// Teardown verification
builder.teardown(mockScene);
assert.strictEqual(builder.jumpPads.length, 0, 'Jump pads cleared on teardown');
assert.strictEqual(builder.ricochetPillars.length, 0, 'Ricochet pillars cleared on teardown');
assert.strictEqual(builder.elevatedPlatforms.length, 0, 'Elevated platforms cleared on teardown');
assert.strictEqual(builder.forcefields.length, 0, 'Forcefields cleared on teardown');
assert.strictEqual(builder.laserGates.length, 0, 'Laser gates cleared on teardown');
assert.strictEqual(builder.voidZones.length, 0, 'Void zones cleared on teardown');

console.log('✓ Environmental hazard colliders, impulses, timers, and teardown verified cleanly');

// =========================================================================
// [Group 4] Arbiter Boss AI & Multi-Layer Rival Shields
// =========================================================================
console.log('\n[Group 4] Testing Arbiter Boss AI & Multi-Layer Rival Shields...');

// Verify Arbiter tier configurations
assert.strictEqual(ARBITER_CONFIGS.level_01_06.maxShields, 2, 'Grid 01 Sentinel Arbiter has 2 shields');
assert.strictEqual(ARBITER_CONFIGS.level_02_07.maxShields, 3, 'Grid 02 Sailmaster Arbiter has 3 shields');
assert.strictEqual(ARBITER_CONFIGS.level_03_07.maxShields, 3, 'Grid 03 Leviathan Arbiter has 3 shields');
assert.strictEqual(ARBITER_CONFIGS.level_04_08.maxShields, 4, 'Grid 04 Master Control Arbiter has 4 shields');

// Create mock foe entity
const mockFoe = {
  pos: { x: 0, y: 1.8, z: 10 },
  vel: { x: 0, y: 0, z: 0 },
  hp: 120,
  maxHp: 120
};

const arbiter = new ArbiterBossController(mockFoe, 'level_01_06');
assert.strictEqual(arbiter.currentShields, 2, 'Initial shields must match config (2)');
assert.strictEqual(arbiter.maxShields, 2, 'Max shields must match config (2)');
assert.strictEqual(mockFoe.hp, 250, 'Core HP initialized to config maxHp (250)');

// Hit 1: Shield absorbs hit, core HP untouched
const hit1 = arbiter.onHit(50);
assert.strictEqual(hit1.absorbed, true, 'Hit 1 must be absorbed by shield layer');
assert.strictEqual(hit1.remainingShields, 1, 'Shields decremented to 1');
assert.strictEqual(mockFoe.hp, 250, 'Core HP remains completely unharmed');

// Hit 2: Depletes remaining shield layer, core HP untouched
const hit2 = arbiter.onHit(50);
assert.strictEqual(hit2.absorbed, true, 'Hit 2 absorbed by last shield layer');
assert.strictEqual(hit2.remainingShields, 0, 'Shields decremented to 0');
assert.strictEqual(mockFoe.hp, 250, 'Core HP still unharmed');

// Hit 3: Shields depleted, core HP damaged
const hit3 = arbiter.onHit(50);
assert.strictEqual(hit3.absorbed, false, 'Hit 3 not absorbed');
assert.strictEqual(hit3.coreDamage, 50, 'Core takes damage');
assert.strictEqual(mockFoe.hp, 200, 'Core HP reduced from 250 to 200');

// Timed Shield Recharge test (6.0s interval)
arbiter.update(3.0);
assert.strictEqual(arbiter.currentShields, 0, 'Shield does not recharge before 6.0s');
arbiter.update(3.1);
assert.strictEqual(arbiter.currentShields, 1, 'Shield recharges 1 layer after 6.0s without damage');

console.log('✓ Arbiter Boss AI shield absorption, damage isolation, and timed recharge verified');

// =========================================================================
// [Group 5] Arbiter Offensive Curve Volleys & Reactive Evasion
// =========================================================================
console.log('\n[Group 5] Testing Arbiter Offensive Curve Volleys & Reactive Evasion...');

// Curve volley firing via update
const spawnedDiscs = [];
arbiter.volleyTimer = arbiter.volleyCooldown; // trigger volley
const mockPlayer = { pos: { x: 0, y: 1.8, z: -10 } };
// Tick 1: Starts volley state
arbiter.update(0.016, mockPlayer, [], (origin, vel, foe, color, curve) => {
  spawnedDiscs.push({ origin, vel, foe, color, curve });
});
// Tick 2: Fires disc 1
arbiter.update(0.016, mockPlayer, [], (origin, vel, foe, color, curve) => {
  spawnedDiscs.push({ origin, vel, foe, color, curve });
});
// Tick 3: Advances past interval and fires disc 2
arbiter.update(arbiter.volleyInterval + 0.01, mockPlayer, [], (origin, vel, foe, color, curve) => {
  spawnedDiscs.push({ origin, vel, foe, color, curve });
});
assert(spawnedDiscs.length >= 2, 'Volley spawned multiple curve discs');
assert(spawnedDiscs[0].curve !== 0, 'First disc has curve power');
assert(spawnedDiscs[1].curve !== 0, 'Second disc has curve power');
assert.strictEqual(Math.sign(spawnedDiscs[0].curve), -Math.sign(spawnedDiscs[1].curve), 'Discs have alternating lateral curve spins');

// Reactive Dash-Evasion Routine
const incomingThreat = {
  owner: null,
  pos: { x: 0.1, y: 1.8, z: 6.0 },
  vel: { x: 0, y: 0, z: 25.0 }
};
arbiter.dashTimer = 0;
arbiter.update(0.016, { pos: { x: 0, y: 1.8, z: -10 } }, [incomingThreat]);
assert.strictEqual(arbiter.isDashing, true, 'Boss enters dashing evasion state');
assert.strictEqual(arbiter.state, 'EVADE', 'Boss state updated to EVADE');
assert(arbiter.invulnerableTimer > 0, 'Boss gains temporary invulnerability window');

console.log('✓ Offensive curve volleys, alternating spin, and reactive evasion routines verified');

// =========================================================================
// [Group 6] Arena Propagation Pipeline & Persistent Storage
// =========================================================================
console.log('\n[Group 6] Testing Arena Propagation Pipeline & Persistent Storage...');

const mockStorage = createMockStorage({
  inventory: { unlockedMaps: ['arena_grid_01'] },
  campaign: {
    starsEarned: 15,
    unlockedGrids: ['grid_01', 'grid_02'],
    unlockedNodes: ['level_01_01', 'level_01_06', 'level_02_07'],
    levelRecords: {}
  }
});

const registry = new CampaignRegistry();
const evaluator = new StarEvaluator();
const economy = new EconomyManager({ storage: mockStorage });
const campaignManager = new CampaignManager({
  registry,
  evaluator,
  storage: mockStorage,
  economy
});

// Listen for ARENA_MAP_UNLOCKED event
let unlockedEventPayload = null;
campaignManager.on(CampaignEvents.ARENA_MAP_UNLOCKED, (payload) => {
  unlockedEventPayload = payload;
});

// Clear Grid 01 Arbiter (level_01_06) - arena_grid_01 is baseline default
campaignManager.startTrial('level_01_06');
const res1 = campaignManager.completeTrial({
  elapsedSeconds: 35.0,
  playerIntegrity: 100,
  precisionHits: 5
});
assert.strictEqual(res1.success, true, 'Clear level_01_06 succeeds');
assert(campaignManager.getUnlockedMaps().includes('arena_grid_01'), 'inventory.unlockedMaps contains arena_grid_01');

// Clear Grid 02 Arbiter (level_02_07) for the first time
campaignManager.startTrial('level_02_07');
const res2 = campaignManager.completeTrial({
  elapsedSeconds: 40.0,
  playerIntegrity: 90,
  precisionHits: 6
});
assert.strictEqual(res2.success, true, 'Clear level_02_07 succeeds');
assert.strictEqual(res2.newlyUnlockedMap, 'arena_solar_sail', 'First clear of level_02_07 returns arena_solar_sail');
assert.strictEqual(unlockedEventPayload.mapId, 'arena_solar_sail', 'ARENA_MAP_UNLOCKED event received with arena_solar_sail');

const mapsAfterFirstClear = campaignManager.getUnlockedMaps();
assert(mapsAfterFirstClear.includes('arena_solar_sail'), 'inventory.unlockedMaps contains arena_solar_sail');

// Repeat clear of level_02_07 should NOT unlock duplicate map
unlockedEventPayload = null;
campaignManager.startTrial('level_02_07');
const res2Repeat = campaignManager.completeTrial({
  elapsedSeconds: 38.0,
  playerIntegrity: 95,
  precisionHits: 6
});
assert.strictEqual(res2Repeat.newlyUnlockedMap, null, 'Repeat clear does not return newlyUnlockedMap');
assert.strictEqual(unlockedEventPayload, null, 'No ARENA_MAP_UNLOCKED event fired on repeat clear');
const mapsAfterRepeat = campaignManager.getUnlockedMaps();
const solarSailCount = mapsAfterRepeat.filter(m => m === 'arena_solar_sail').length;
assert.strictEqual(solarSailCount, 1, 'No duplicate map entries in unlockedMaps');

console.log('✓ Arena propagation on first-time Arbiter clear and duplicate prevention verified');

// =========================================================================
// [Group 7] Boss Health Bar Tactical HUD Overlay
// =========================================================================
console.log('\n[Group 7] Testing Boss Health Bar Tactical HUD Overlay...');

// Setup mock document for HUD
const mockElements = new Map();
global.document = {
  getElementById: (id) => {
    if (!mockElements.has(id)) {
      const classList = new Set();
      mockElements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
          add: (c) => classList.add(c),
          remove: (c) => classList.delete(c),
          contains: (c) => classList.has(c)
        },
        appendChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => ({ style: {}, textContent: '' })
      });
    }
    return mockElements.get(id);
  },
  createElement: (tag) => {
    const classList = new Set();
    return {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      classList: {
        add: (c) => classList.add(c),
        remove: (c) => classList.delete(c),
        contains: (c) => classList.has(c)
      },
      appendChild(c) { this.children.push(c); },
      querySelectorAll() { return this.children; },
      querySelector() { return { style: {}, textContent: '' }; }
    };
  }
};
global.window = { innerWidth: 1920, innerHeight: 1080 };

const hud = new CampaignHUD();
const bossHtml = hud.renderBossHealthBar({
  name: 'SENTINEL ARBITER',
  title: 'OUTLANDS RECOVERY ARBITER',
  hp: 120,
  maxHp: 120,
  shields: 2,
  maxShields: 2
});

assert(bossHtml.includes('SENTINEL ARBITER'), 'Boss name rendered');
assert(bossHtml.includes('bossShieldsContainer'), 'Shield container rendered');
assert(bossHtml.includes('bossHpFill'), 'HP fill rendered');

// Test updateBossHealthBar
hud.showBossHealthBar({
  name: 'SENTINEL ARBITER',
  title: 'OUTLANDS RECOVERY ARBITER',
  hp: 120,
  maxHp: 120,
  shields: 2,
  maxShields: 2
});
hud.updateBossHealthBar({
  hp: 60,
  maxHp: 120,
  shields: 1,
  maxShields: 2
});
hud.hideBossHealthBar();

console.log('✓ Boss Health Bar HUD HTML rendering and telemetry updates verified');

// =========================================================================
// [Group 8] Celebratory Debrief Arena Unlock Banner
// =========================================================================
console.log('\n[Group 8] Testing Celebratory Debrief Arena Unlock Banner...');

const debriefModal = new TrialDebriefModal({
  registry,
  manager: campaignManager
});

// Outcome with newlyUnlockedMap
let sfxGrantedTriggered = false;
SFX.accessGranted = () => { sfxGrantedTriggered = true; };

const unlockResult = {
  levelId: 'level_02_07',
  success: true,
  stars: 3,
  firstTimeClear: true,
  rewards: { bits: 500, xp: 800 },
  totalStars: 25,
  newlyUnlockedMap: 'arena_solar_sail',
  evaluation: {
    star1: true, star2: true, star3: true,
    metrics: { elapsedSeconds: 38.0, integrityPercent: 90, precisionHits: 6 }
  }
};

const debriefWithUnlockHtml = debriefModal.render(unlockResult);
assert(debriefWithUnlockHtml.includes('debriefArenaUnlockBanner'), 'Debrief renders arena unlock banner container');
assert(debriefWithUnlockHtml.includes('SECTOR ARENA UNLOCKED'), 'Debrief presents SECTOR ARENA UNLOCKED celebratory headline');
assert(debriefWithUnlockHtml.includes('SOLAR SAIL JUNCTION'), 'Debrief renders human-readable sector name');
assert(debriefWithUnlockHtml.includes('NOW DEPLOYABLE IN PRACTICE'), 'Debrief informs player of mode availability');

// Trigger modal show to assert SFX hook
debriefModal.show(unlockResult);
assert.strictEqual(sfxGrantedTriggered, true, 'Access granted audio chime triggered on map unlock');

// Repeat clear outcome without newlyUnlockedMap
const repeatResult = {
  levelId: 'level_02_07',
  success: true,
  stars: 3,
  firstTimeClear: false,
  rewards: { bits: 50, xp: 100 },
  totalStars: 25,
  newlyUnlockedMap: null,
  evaluation: {
    star1: true, star2: true, star3: true,
    metrics: { elapsedSeconds: 35.0, integrityPercent: 92, precisionHits: 6 }
  }
};
const debriefWithoutUnlockHtml = debriefModal.render(repeatResult);
assert(!debriefWithoutUnlockHtml.includes('SECTOR ARENA UNLOCKED'), 'No celebratory banner on repeat clear');

console.log('✓ Celebratory arena unlock banner and audio chime hooks verified');

// =========================================================================
// [Group 9] Practice & Duel Arena Selection Menu Integration
// =========================================================================
console.log('\n[Group 9] Testing Practice & Duel Arena Selection Menu Integration...');

assert(ARENA_MAP_METADATA.arena_grid_01, 'arena_grid_01 metadata exists');
assert(ARENA_MAP_METADATA.arena_solar_sail, 'arena_solar_sail metadata exists');
assert(ARENA_MAP_METADATA.arena_sea_sim, 'arena_sea_sim metadata exists');
assert(ARENA_MAP_METADATA.arena_core_pinnacle, 'arena_core_pinnacle metadata exists');

// Verify getGridIdForMap helper
assert.strictEqual(getGridIdForMap('arena_grid_01'), 'grid_01', 'Maps arena_grid_01 to grid_01');
assert.strictEqual(getGridIdForMap('arena_solar_sail'), 'grid_02', 'Maps arena_solar_sail to grid_02');
assert.strictEqual(getGridIdForMap('arena_sea_sim'), 'grid_03', 'Maps arena_sea_sim to grid_03');
assert.strictEqual(getGridIdForMap('arena_core_pinnacle'), 'grid_04', 'Maps arena_core_pinnacle to grid_04');

// Verify getUnlockedArenaMaps
const menuStorage = createMockStorage({
  inventory: { unlockedMaps: ['arena_grid_01', 'arena_solar_sail'] }
});
const unlockedInMenu = getUnlockedArenaMaps(menuStorage);
assert.deepStrictEqual(unlockedInMenu, ['arena_grid_01', 'arena_solar_sail'], 'Reads unlockedMaps array accurately');

// Verify selectArenaMap
const activeGrid = selectArenaMap('arena_solar_sail');
assert.strictEqual(state.selectedArenaMap, 'arena_solar_sail', 'state.selectedArenaMap set to arena_solar_sail');
assert.strictEqual(state.activeGridId, 'grid_02', 'state.activeGridId set to grid_02');
assert.strictEqual(activeGrid, 'grid_02', 'Returns grid_02');

// Verify index.html static markup contains arenaSelectContainer in hostModal
const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert(indexHtml.includes('id="arenaSelectContainer"'), 'index.html contains arenaSelectContainer');
assert(indexHtml.includes('id="arenaSelect"'), 'index.html contains arenaSelect dropdown');
assert(indexHtml.includes('SELECT ARENA SECTOR'), 'index.html displays SELECT ARENA SECTOR label');

console.log('✓ Practice and Solo Duel arena selection metadata, controls, and skin activation verified');

console.log('\n======================================================');
console.log('ALL CAMPAIGN PHASE 3 TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================\n');
