/**
 * schema.js
 * Core state schema definitions, constants, validation guards,
 * and immutable default state factory for Tron Disc Arena (SPEC-ECON-001 v1.0.0).
 */

export const SAVE_STATE_VERSION = '1.0.0';
export const STORAGE_KEY = 'tron_save_state';
export const STORAGE_BACKUP_KEY = 'tron_save_state.bak';
export const STORAGE_CHANNEL = 'tron_grid_storage_sync';

export const StorageEvents = Object.freeze({
  INITIALIZED: 'STORAGE_INITIALIZED',
  SAVED: 'STORAGE_SAVED',
  CORRUPTED: 'STORAGE_CORRUPTED',
  MUTATED: 'STORAGE_MUTATED'
});

/**
 * Deep clones an object safely across Node.js and browser environments.
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (_) {}
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Default frozen reference baseline for TronSaveState v1.0.0
 */
export const DEFAULT_SAVE_STATE = Object.freeze({
  version: SAVE_STATE_VERSION,
  createdAt: 0,
  updatedAt: 0,
  player: Object.freeze({
    id: 'user_anonymous',
    handle: 'USER_PROGRAM',
    level: 1,
    xp: 0,
    currency: Object.freeze({
      bits: 0,
      sparks: 0
    })
  }),
  loadout: Object.freeze({
    activeDisc: 'disc_identity_default',
    activeTrail: 'trail_cyan_default',
    activeVisor: 'visor_classic',
    activeArenaSkin: 'grid_default',
    audioTheme: 'synthwave_82'
  }),
  campaign: Object.freeze({
    completedNodes: Object.freeze([]),
    unlockedNodes: Object.freeze(['node_01']),
    currentNode: 'node_01',
    starsEarned: 0,
    chapter: 1
  }),
  inventory: Object.freeze({
    discs: Object.freeze(['disc_identity_default']),
    cosmetics: Object.freeze(['trail_cyan_default', 'visor_classic']),
    consumables: Object.freeze({})
  }),
  achievements: Object.freeze([]),
  stats: Object.freeze({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    discsThrown: 0,
    discsDeflected: 0,
    tilesDestroyed: 0,
    highestWave: 1,
    highestScore: 0,
    totalPlaytimeSec: 0
  })
});

/**
 * Creates an immutable, deep-cloned default TronSaveState instance.
 * @param {object} [overrides={}] Optional partial state overrides
 * @returns {object} A completely decoupled TronSaveState v1.0.0 object
 */
export function createDefaultSaveState(overrides = {}) {
  const now = Date.now();
  const base = {
    version: SAVE_STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    player: {
      id: overrides?.player?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Math.random().toString(36).substring(2, 9)}`),
      handle: overrides?.player?.handle || 'USER_PROGRAM',
      level: overrides?.player?.level ?? 1,
      xp: overrides?.player?.xp ?? 0,
      currency: {
        bits: overrides?.player?.currency?.bits ?? 0,
        sparks: overrides?.player?.currency?.sparks ?? 0
      }
    },
    loadout: {
      activeDisc: overrides?.loadout?.activeDisc || 'disc_identity_default',
      activeTrail: overrides?.loadout?.activeTrail || 'trail_cyan_default',
      activeVisor: overrides?.loadout?.activeVisor || 'visor_classic',
      activeArenaSkin: overrides?.loadout?.activeArenaSkin || 'grid_default',
      audioTheme: overrides?.loadout?.audioTheme || 'synthwave_82'
    },
    campaign: {
      completedNodes: Array.isArray(overrides?.campaign?.completedNodes) ? [...overrides.campaign.completedNodes] : [],
      unlockedNodes: Array.isArray(overrides?.campaign?.unlockedNodes) ? [...overrides.campaign.unlockedNodes] : ['node_01'],
      currentNode: overrides?.campaign?.currentNode || 'node_01',
      starsEarned: overrides?.campaign?.starsEarned ?? 0,
      chapter: overrides?.campaign?.chapter ?? 1
    },
    inventory: {
      discs: Array.isArray(overrides?.inventory?.discs) ? [...overrides.inventory.discs] : ['disc_identity_default'],
      cosmetics: Array.isArray(overrides?.inventory?.cosmetics) ? [...overrides.inventory.cosmetics] : ['trail_cyan_default', 'visor_classic'],
      consumables: overrides?.inventory?.consumables ? { ...overrides.inventory.consumables } : {}
    },
    achievements: Array.isArray(overrides?.achievements) ? deepClone(overrides.achievements) : [],
    stats: {
      matchesPlayed: overrides?.stats?.matchesPlayed ?? 0,
      wins: overrides?.stats?.wins ?? 0,
      losses: overrides?.stats?.losses ?? 0,
      discsThrown: overrides?.stats?.discsThrown ?? 0,
      discsDeflected: overrides?.stats?.discsDeflected ?? 0,
      tilesDestroyed: overrides?.stats?.tilesDestroyed ?? 0,
      highestWave: overrides?.stats?.highestWave ?? 1,
      highestScore: overrides?.stats?.highestScore ?? 0,
      totalPlaytimeSec: overrides?.stats?.totalPlaytimeSec ?? 0
    }
  };

  return deepClone(base);
}

/**
 * Fast boolean validation check for TronSaveState structure.
 * @param {any} data
 * @returns {boolean}
 */
export function isValidSaveState(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'string') return false;
  if (!data.player || typeof data.player !== 'object') return false;
  if (typeof data.player.id !== 'string') return false;
  if (typeof data.player.handle !== 'string') return false;
  if (!data.loadout || typeof data.loadout !== 'object') return false;
  if (!data.campaign || typeof data.campaign !== 'object') return false;
  if (!data.inventory || typeof data.inventory !== 'object') return false;
  if (!Array.isArray(data.achievements)) return false;
  if (!data.stats || typeof data.stats !== 'object') return false;
  return true;
}

/**
 * Detailed validation report for debugging and data integrity enforcement.
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSaveState(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Save state must be a non-null object'] };
  }
  if (!data.version || typeof data.version !== 'string') {
    errors.push('Missing or invalid "version" string');
  }
  if (!data.player || typeof data.player !== 'object') {
    errors.push('Missing or invalid "player" object');
  } else {
    if (typeof data.player.id !== 'string') errors.push('"player.id" must be a string');
    if (typeof data.player.handle !== 'string') errors.push('"player.handle" must be a string');
    if (typeof data.player.level !== 'number') errors.push('"player.level" must be a number');
    if (data.player.currency && typeof data.player.currency !== 'object') {
      errors.push('"player.currency" must be an object');
    }
  }
  if (!data.loadout || typeof data.loadout !== 'object') errors.push('Missing or invalid "loadout" object');
  if (!data.campaign || typeof data.campaign !== 'object') errors.push('Missing or invalid "campaign" object');
  if (!data.inventory || typeof data.inventory !== 'object') errors.push('Missing or invalid "inventory" object');
  if (!Array.isArray(data.achievements)) errors.push('Missing or invalid "achievements" array');
  if (!data.stats || typeof data.stats !== 'object') errors.push('Missing or invalid "stats" object');

  return {
    valid: errors.length === 0,
    errors
  };
}
