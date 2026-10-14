/**
 * test/ui/duel_map_selector.test.js
 * Comprehensive automated tests for Duel Arena Map Selection Lobby (SPEC-ACHIEVE-001).
 */

import assert from 'node:assert';
import { state } from '../../src/core/state.js';
import {
  DuelMapSelector,
  DUEL_ARENA_REGISTRY,
  duelMapSelector
} from '../../src/ui/duel/DuelMapSelector.js';
import {
  ARENA_MAP_METADATA,
  getGridIdForMap,
  getUnlockedArenaMaps,
  selectArenaMap,
  updateArenaSelectControls
} from '../../src/ui/arenaSelector.js';

console.log('--- Running Duel Map Selector (SPEC-ACHIEVE-001) Test Suite ---');

function createMockStorage(initialData = {}) {
  const store = new Map();
  const flatten = (obj, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        flatten(v, path);
      } else {
        store.set(path, v);
      }
    }
  };
  flatten(initialData);

  return {
    isInitialized: true,
    load() {},
    get(path, defaultVal = null) {
      return store.has(path) ? store.get(path) : defaultVal;
    },
    set(path, val) {
      store.set(path, val);
    }
  };
}

// =========================================================================
// [Group 1] Arena Registry & Metadata Integrity
// =========================================================================
console.log('\n[Group 1] Testing Arena Registry & Metadata Integrity...');

const expectedMaps = [
  'arena_grid_01',
  'arena_solar_sail',
  'arena_sea_sim',
  'arena_core_pinnacle',
  'arena_zero_g_nexus',
  'arena_derez_chasm'
];

for (const mapId of expectedMaps) {
  assert(DUEL_ARENA_REGISTRY[mapId], `DUEL_ARENA_REGISTRY must register ${mapId}`);
}

assert.strictEqual(DUEL_ARENA_REGISTRY.arena_grid_01.category, 'campaign');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_solar_sail.category, 'campaign');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_sea_sim.category, 'campaign');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_core_pinnacle.category, 'campaign');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_zero_g_nexus.category, 'exotic');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_derez_chasm.category, 'exotic');

assert.strictEqual(DUEL_ARENA_REGISTRY.arena_grid_01.defaultUnlocked, true, 'arena_grid_01 is unlocked by default');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_solar_sail.defaultUnlocked, false);
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_sea_sim.defaultUnlocked, false);
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_core_pinnacle.defaultUnlocked, false);
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_zero_g_nexus.defaultUnlocked, false);
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_derez_chasm.defaultUnlocked, false);

// Check unlock directives
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_solar_sail.unlockInstruction, 'DEFEAT GRID 02 ARBITER');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_sea_sim.unlockInstruction, 'DEFEAT GRID 03 ARBITER');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_core_pinnacle.unlockInstruction, 'DEFEAT GRID 04 ARBITER');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_zero_g_nexus.unlockInstruction, 'UNLOCK IN ARMORY');
assert.strictEqual(DUEL_ARENA_REGISTRY.arena_derez_chasm.unlockInstruction, 'UNLOCK IN ARMORY');

console.log('✓ Arena registry schemas and directive strings verified');

// =========================================================================
// [Group 2] Storage Query & Unlock Evaluation
// =========================================================================
console.log('\n[Group 2] Testing Storage Query & Unlock Evaluation...');

const defaultStorage = createMockStorage();
const selector = new DuelMapSelector({ storage: defaultStorage });

assert.deepStrictEqual(selector.getUnlockedMaps(), ['arena_grid_01'], 'Defaults to arena_grid_01 when storage is empty');
assert.strictEqual(selector.isMapUnlocked('arena_grid_01'), true);
assert.strictEqual(selector.isMapUnlocked('arena_solar_sail'), false);
assert.strictEqual(selector.isMapUnlocked('arena_zero_g_nexus'), false);

const unlockedStorage = createMockStorage({
  inventory: {
    unlockedMaps: ['arena_grid_01', 'arena_solar_sail', 'arena_zero_g_nexus']
  }
});
const unlockedSelector = new DuelMapSelector({ storage: unlockedStorage });

assert.deepStrictEqual(
  unlockedSelector.getUnlockedMaps(),
  ['arena_grid_01', 'arena_solar_sail', 'arena_zero_g_nexus']
);
assert.strictEqual(unlockedSelector.isMapUnlocked('arena_grid_01'), true);
assert.strictEqual(unlockedSelector.isMapUnlocked('arena_solar_sail'), true);
assert.strictEqual(unlockedSelector.isMapUnlocked('arena_sea_sim'), false);
assert.strictEqual(unlockedSelector.isMapUnlocked('arena_zero_g_nexus'), true);
assert.strictEqual(unlockedSelector.isMapUnlocked('arena_derez_chasm'), false);

console.log('✓ Unlock evaluations and inventory.unlockedMaps queries verified');

// =========================================================================
// [Group 3] Card HTML Rendering & Directives
// =========================================================================
console.log('\n[Group 3] Testing Card HTML Rendering & Directives...');

const html = selector.renderHtml('arena_grid_01', defaultStorage);

// Check that all 6 maps are rendered
for (const mapId of expectedMaps) {
  assert(html.includes(`data-map-id="${mapId}"`), `HTML must render card for ${mapId}`);
}

// Check locked directives rendered in HTML
assert(html.includes('DEFEAT GRID 02 ARBITER'), 'HTML renders Grid 02 Arbiter directive');
assert(html.includes('DEFEAT GRID 03 ARBITER'), 'HTML renders Grid 03 Arbiter directive');
assert(html.includes('DEFEAT GRID 04 ARBITER'), 'HTML renders Grid 04 Arbiter directive');
assert(html.includes('UNLOCK IN ARMORY'), 'HTML renders Armory unlock directive');

// Check active tag on arena_grid_01
assert(html.includes('[ ACTIVE ]'), 'HTML renders active indicator for current selection');

// Render with arena_solar_sail unlocked and selected
const unlockedHtml = unlockedSelector.renderHtml('arena_solar_sail', unlockedStorage);
assert(unlockedHtml.includes('data-map-id="arena_solar_sail"'));
assert(unlockedHtml.includes('[ ACTIVE ]'));

console.log('✓ Card HTML rendering, active states, and directive strings verified');

// =========================================================================
// [Group 4] DOM Mounting & Click Interactions
// =========================================================================
console.log('\n[Group 4] Testing DOM Mounting & Click Interactions...');

function createMockContainer() {
  let innerHtmlContent = '';
  const listeners = new Map();
  const elements = [];

  const container = {
    ownerDocument: null,
    get innerHTML() {
      return innerHtmlContent;
    },
    set innerHTML(val) {
      innerHtmlContent = val;
      elements.length = 0;
      // Parse mock elements from HTML string
      const cardRegex = /<div class="duel-map-card ([^"]+)"\s+data-map-id="([^"]+)"\s+data-unlocked="([^"]+)"/g;
      let match;
      while ((match = cardRegex.exec(val)) !== null) {
        const classes = match[1].split(' ');
        const mapId = match[2];
        const isUnlocked = match[3] === 'true';
        const cardListeners = new Map();

        elements.push({
          mapId,
          isUnlocked,
          classes,
          getAttribute(attr) {
            if (attr === 'data-map-id') return mapId;
            if (attr === 'data-unlocked') return String(isUnlocked);
            return null;
          },
          addEventListener(event, fn) {
            if (!cardListeners.has(event)) cardListeners.set(event, []);
            cardListeners.get(event).push(fn);
          },
          dispatch(event, e = {}) {
            const handlers = cardListeners.get(event) || [];
            for (const h of handlers) h(e);
          }
        });
      }
    },
    querySelectorAll(selector) {
      if (selector === '.duel-map-card') {
        return elements;
      }
      return [];
    },
    querySelector(selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    }
  };

  return { container, elements };
}

// Track sector arena switches
let lastAppliedGrid = null;
globalThis.window = globalThis.window || {};
globalThis.window.__tronApplySectorArena = (gridId) => {
  lastAppliedGrid = gridId;
};

state.selectedArenaMap = 'arena_grid_01';
state.activeGridId = 'grid_01';

const { container: mockMount, elements: mockCards } = createMockContainer();
let selectedCallbackMap = null;

unlockedSelector.mount(mockMount, {
  storage: unlockedStorage,
  onSelect: (mapId) => {
    selectedCallbackMap = mapId;
  }
});

assert.strictEqual(mockCards.length, 6, 'Mounted 6 arena cards');

// Find locked card (e.g. arena_sea_sim) and try clicking it
const lockedCard = mockCards.find(c => c.mapId === 'arena_sea_sim');
assert(lockedCard, 'Found arena_sea_sim card');
assert.strictEqual(lockedCard.isUnlocked, false, 'arena_sea_sim is locked');

// Click locked card
lockedCard.dispatch('click');
assert.strictEqual(state.selectedArenaMap, 'arena_grid_01', 'Clicking locked card MUST NOT change selection');
assert.strictEqual(selectedCallbackMap, null, 'Clicking locked card MUST NOT invoke onSelect');

// Find unlocked card (arena_solar_sail) and click it
const solarCard = mockCards.find(c => c.mapId === 'arena_solar_sail');
assert(solarCard, 'Found arena_solar_sail card');
assert.strictEqual(solarCard.isUnlocked, true, 'arena_solar_sail is unlocked');

solarCard.dispatch('click');
assert.strictEqual(state.selectedArenaMap, 'arena_solar_sail', 'Clicking unlocked card updates state.selectedArenaMap');
assert.strictEqual(state.activeGridId, 'grid_02', 'state.activeGridId set to grid_02');
assert.strictEqual(lastAppliedGrid, 'grid_02', 'applySectorArena called with grid_02');
assert.strictEqual(selectedCallbackMap, 'arena_solar_sail', 'onSelect callback invoked with mapId');

console.log('✓ DOM mounting, locked card rejection, and unlocked card activation verified');

// =========================================================================
// [Group 5] Dropdown Synchronization in arenaSelector.js
// =========================================================================
console.log('\n[Group 5] Testing arenaSelector.js Integration & Sync...');

assert(ARENA_MAP_METADATA.arena_zero_g_nexus, 'ARENA_MAP_METADATA includes arena_zero_g_nexus');
assert(ARENA_MAP_METADATA.arena_derez_chasm, 'ARENA_MAP_METADATA includes arena_derez_chasm');
assert.strictEqual(getGridIdForMap('arena_zero_g_nexus'), 'grid_01');
assert.strictEqual(getGridIdForMap('arena_derez_chasm'), 'grid_01');

// Test selectArenaMap with exotic arena
selectArenaMap('arena_zero_g_nexus');
assert.strictEqual(state.selectedArenaMap, 'arena_zero_g_nexus');
assert.strictEqual(state.activeGridId, 'grid_01');

// Clean up
delete globalThis.window.__tronApplySectorArena;

console.log('✓ arenaSelector metadata and state propagation verified cleanly');

console.log('\n======================================================');
console.log('ALL DUEL MAP SELECTOR TESTS PASSED CLEANLY (100% SUCCESS)');
console.log('======================================================\n');
