/**
 * saveState.js - Manages the TronSaveState schema and local persistence.
 * Binds player statistics, settings, and progression to a specific user identity.
 */

export const SAVE_STATE_VERSION = 1;
export const SAVE_STATE_KEY_PREFIX = 'tron_save_state_';

// In-memory fallback map for environments where localStorage is unavailable/disabled
const memoryStorage = new Map();

function safeGetItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (_) {}
  return memoryStorage.get(key) || null;
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch (_) {}
  memoryStorage.set(key, String(value));
}

function safeRemoveItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch (_) {}
  memoryStorage.delete(key);
}

/**
 * Creates a default TronSaveState object for a given user.
 * @param {string} userId
 * @param {string} [handle]
 * @returns {object}
 */
export function createDefaultSaveState(userId, handle = 'ANONYMOUS_PROGRAM') {
  const now = Date.now();
  return {
    version: SAVE_STATE_VERSION,
    userId: String(userId),
    handle: String(handle),
    createdAt: now,
    lastActiveAt: now,
    stats: {
      matchesPlayed: 0,
      wins: 0,
      highestWave: 1,
      highestTier: 1,
      totalScore: 0
    },
    settings: {
      sens: 0.0022,
      invertY: false
    }
  };
}

/**
 * Migrates older save state schemas to the current version.
 * @param {object} data
 * @returns {object}
 */
function migrateSaveState(data) {
  if (!data || typeof data !== 'object') return null;
  // Future migration hooks for v2, v3, etc.
  if (!data.stats) data.stats = {};
  if (typeof data.stats.matchesPlayed !== 'number') data.stats.matchesPlayed = 0;
  if (typeof data.stats.wins !== 'number') data.stats.wins = 0;
  if (typeof data.stats.highestWave !== 'number') data.stats.highestWave = 1;
  if (typeof data.stats.highestTier !== 'number') data.stats.highestTier = 1;
  if (typeof data.stats.totalScore !== 'number') data.stats.totalScore = 0;

  if (!data.settings) data.settings = {};
  if (typeof data.settings.sens !== 'number') data.settings.sens = 0.0022;
  if (typeof data.settings.invertY !== 'boolean') data.settings.invertY = false;

  data.version = SAVE_STATE_VERSION;
  return data;
}

/**
 * Loads the save state for a given user from storage.
 * @param {string} userId
 * @returns {object|null}
 */
export function loadSaveState(userId) {
  if (!userId) return null;
  const key = `${SAVE_STATE_KEY_PREFIX}${userId}`;
  const raw = safeGetItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return migrateSaveState(parsed);
  } catch (err) {
    console.warn(`Failed parsing TronSaveState for user ${userId}:`, err);
    return null;
  }
}

/**
 * Persists a TronSaveState object to storage.
 * @param {object} saveState
 * @returns {object} The persisted save state
 */
export function saveSaveState(saveState) {
  if (!saveState || !saveState.userId) {
    throw new Error('saveSaveState: Invalid saveState object with missing userId');
  }
  saveState.lastActiveAt = Date.now();
  const key = `${SAVE_STATE_KEY_PREFIX}${saveState.userId}`;
  safeSetItem(key, JSON.stringify(saveState));
  return saveState;
}

/**
 * Retrieves existing save state or initializes and saves a default save state.
 * @param {string} userId
 * @param {string} [handle]
 * @returns {object}
 */
export function getOrCreateSaveState(userId, handle) {
  if (!userId) return null;
  let current = loadSaveState(userId);
  if (!current) {
    current = createDefaultSaveState(userId, handle);
    saveSaveState(current);
  }
  return current;
}

/**
 * Updates stats in the user's save state.
 * @param {string} userId
 * @param {object} statsDelta
 * @returns {object|null}
 */
export function updateSaveStats(userId, statsDelta = {}) {
  const state = getOrCreateSaveState(userId);
  if (!state) return null;

  Object.assign(state.stats, statsDelta);
  return saveSaveState(state);
}

/**
 * Updates user settings in the save state.
 * @param {string} userId
 * @param {object} settingsDelta
 * @returns {object|null}
 */
export function updateSaveSettings(userId, settingsDelta = {}) {
  const state = getOrCreateSaveState(userId);
  if (!state) return null;

  Object.assign(state.settings, settingsDelta);
  return saveSaveState(state);
}

/**
 * Clears save state for a given user (primarily for testing and reset flows).
 * @param {string} userId
 */
export function clearSaveState(userId) {
  if (!userId) return;
  safeRemoveItem(`${SAVE_STATE_KEY_PREFIX}${userId}`);
}
