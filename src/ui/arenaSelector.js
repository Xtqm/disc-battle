/**
 * ArenaSelector.js
 * Arena Map Selection Controls and Propagation Foundation for Practice and Solo Duel modes.
 */

import { state } from '../core/state.js';
import { defaultStorageManager } from '../core/storage/StorageManager.js';
import { SECTOR_THEMES } from '../arena/hazards/SectorHazardBuilder.js';
import { duelMapSelector } from './duel/DuelMapSelector.js';

export function applySectorArena(gridId) {
  if (typeof window !== 'undefined' && typeof window.__tronApplySectorArena === 'function') {
    return window.__tronApplySectorArena(gridId);
  }
}

export const ARENA_MAP_METADATA = Object.freeze({
  arena_grid_01: {
    mapId: 'arena_grid_01',
    gridId: 'grid_01',
    name: 'Outlands Boot-Sector',
    label: 'Grid 01: Outlands Boot-Sector'
  },
  arena_solar_sail: {
    mapId: 'arena_solar_sail',
    gridId: 'grid_02',
    name: 'Solar Sail Junction',
    label: 'Grid 02: Solar Sail Junction'
  },
  arena_sea_sim: {
    mapId: 'arena_sea_sim',
    gridId: 'grid_03',
    name: 'Sea of Simulation',
    label: 'Grid 03: Sea of Simulation'
  },
  arena_core_pinnacle: {
    mapId: 'arena_core_pinnacle',
    gridId: 'grid_04',
    name: 'The Core Pinnacle',
    label: 'Grid 04: The Core Pinnacle'
  },
  arena_zero_g_nexus: {
    mapId: 'arena_zero_g_nexus',
    gridId: 'grid_01',
    name: 'Zero-G Nexus',
    label: 'Exotic: Zero-G Nexus'
  },
  arena_derez_chasm: {
    mapId: 'arena_derez_chasm',
    gridId: 'grid_01',
    name: 'De-rez Chasm',
    label: 'Exotic: De-rez Chasm'
  }
});

export function getGridIdForMap(mapId) {
  if (ARENA_MAP_METADATA[mapId]) return ARENA_MAP_METADATA[mapId].gridId;
  if (SECTOR_THEMES && SECTOR_THEMES[mapId]) return mapId;
  if (SECTOR_THEMES) {
    for (const theme of Object.values(SECTOR_THEMES)) {
      if (theme.mapId === mapId) return theme.id;
    }
  }
  return 'grid_01';
}

export function getUnlockedArenaMaps(storage = defaultStorageManager) {
  if (storage && !storage.isInitialized && typeof storage.load === 'function') {
    storage.load();
  }
  const unlocked = storage && typeof storage.get === 'function' ? storage.get('inventory.unlockedMaps') : null;
  if (Array.isArray(unlocked) && unlocked.length > 0) {
    return unlocked;
  }
  return ['arena_grid_01'];
}

export function selectArenaMap(mapId) {
  state.selectedArenaMap = mapId;
  const gridId = getGridIdForMap(mapId);
  state.activeGridId = gridId;
  applySectorArena(gridId);
  return gridId;
}

export function updateArenaSelectControls(root = (typeof document !== 'undefined' ? document : null), storage = defaultStorageManager) {
  if (!root) return null;
  let container = root.querySelector ? root.querySelector('#arenaSelectContainer') : null;
  if (!container && typeof root.getElementById === 'function') {
    container = root.getElementById('arenaSelectContainer');
  }

  if (!container) {
    const hostModal = (root.querySelector ? root.querySelector('#hostModal') : null) ||
                      (typeof root.getElementById === 'function' ? root.getElementById('hostModal') : null);
    const menuActions = hostModal ? hostModal.querySelector('.menu-actions') : null;
    const practiceBtn = hostModal ? hostModal.querySelector('#practiceBtn') : null;

    if (menuActions && practiceBtn && (root.ownerDocument || typeof document !== 'undefined')) {
      const doc = root.ownerDocument || document;
      container = doc.createElement('div');
      container.id = 'arenaSelectContainer';
      container.className = 'arena-select-container';
      container.style.cssText = 'text-align:left;width:100%;';
      container.innerHTML = `
        <label for="arenaSelect" style="display:block;font-size:11px;letter-spacing:2px;color:var(--cyan);margin-bottom:6px;">SELECT ARENA SECTOR</label>
        <select id="arenaSelect" class="arena-select" style="width:100%;padding:10px;background:rgba(4,20,28,0.9);border:1px solid var(--cyan);color:#fff;font-family:inherit;font-size:12px;letter-spacing:1px;outline:none;border-radius:2px;cursor:pointer;">
        </select>
        <div id="duelMapCardMount" class="duel-map-card-mount" style="margin-top:8px;"></div>
      `;
      menuActions.insertBefore(container, practiceBtn);
    }
  }

  if (!container) return null;

  const select = container.querySelector('#arenaSelect');
  if (!select) return null;

  const unlockedMaps = getUnlockedArenaMaps(storage);
  const currentSelection = state.selectedArenaMap || unlockedMaps[0] || 'arena_grid_01';

  select.innerHTML = '';
  const doc = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
  for (const mapId of unlockedMaps) {
    const meta = ARENA_MAP_METADATA[mapId] || { mapId, label: mapId };
    if (doc && typeof doc.createElement === 'function') {
      const opt = doc.createElement('option');
      opt.value = mapId;
      opt.textContent = meta.label || mapId;
      if (mapId === currentSelection) {
        opt.selected = true;
      }
      select.appendChild(opt);
    }
  }

  select.value = currentSelection;

  // Mount or refresh the interactive DuelMapSelector cards
  let cardMount = container.querySelector ? container.querySelector('#duelMapCardMount') : null;
  if (!cardMount && doc && typeof doc.createElement === 'function') {
    cardMount = doc.createElement('div');
    cardMount.id = 'duelMapCardMount';
    cardMount.className = 'duel-map-card-mount';
    cardMount.style.cssText = 'margin-top:8px;';
    container.appendChild(cardMount);
  }

  if (cardMount && typeof duelMapSelector?.mount === 'function') {
    duelMapSelector.mount(cardMount, {
      storage,
      onSelect: (chosenMapId) => {
        if (select) {
          select.value = chosenMapId;
        }
      }
    });
  }

  select.onchange = (e) => {
    const val = e.target.value;
    selectArenaMap(val);
    if (cardMount && typeof duelMapSelector?.mount === 'function') {
      duelMapSelector.mount(cardMount, {
        storage,
        onSelect: (chosenMapId) => {
          if (select) {
            select.value = chosenMapId;
          }
        }
      });
    }
  };

  return select;
}
