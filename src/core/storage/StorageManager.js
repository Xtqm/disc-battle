/**
 * StorageManager.js
 * Event-driven singleton storage engine for Tron Disc Arena (SPEC-ECON-001).
 * Features debounced auto-save, emergency unload flushing, localStorage corruption
 * backup recovery, schema migration registry, and multi-tab synchronization.
 */

import {
  SAVE_STATE_VERSION,
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  StorageEvents,
  createDefaultSaveState,
  isValidSaveState,
  validateSaveState,
  deepClone
} from './schema.js';

// In-memory fallback map for non-browser or storage-restricted environments
const memoryStorage = new Map();

// Test bus registry for cross-instance messaging in Node.js test environments
const nodeTestInstances = new Set();

export class StorageManager {
  /**
   * @param {object} [options]
   * @param {string} [options.storageKey]
   * @param {string} [options.backupKey]
   * @param {number} [options.debounceMs]
   */
  constructor(options = {}) {
    this.storageKey = options.storageKey || STORAGE_KEY;
    this.backupKey = options.backupKey || STORAGE_BACKUP_KEY;
    this.debounceMs = options.debounceMs ?? 500;

    /** @type {object|null} */
    this.state = null;
    this.isInitialized = false;

    this._listeners = new Map();
    this._migrations = new Map();
    this._saveTimeout = null;
    this._storageListener = null;
    this._unloadListener = null;

    this._registerDefaultMigrations();
    this._setupWindowListeners();

    nodeTestInstances.add(this);
  }

  // ==========================================
  // Storage Adapter (localStorage / Memory)
  // ==========================================

  _getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryStorage.get(key) ?? null;
  }

  _setItem(key, value) {
    const strVal = String(value);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, strVal);
        return;
      }
    } catch (_) {}
    memoryStorage.set(key, strVal);
  }

  _removeItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    memoryStorage.delete(key);
  }

  // ==========================================
  // Event Emitter
  // ==========================================

  /**
   * Subscribe to lifecycle events.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} Unsubscribe function
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from lifecycle events.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  /**
   * Broadcast an event to registered subscribers.
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`StorageManager: Event handler error for "${event}":`, err);
        }
      }
    }
  }

  // ==========================================
  // Migration Registry
  // ==========================================

  _registerDefaultMigrations() {
    // Migration from legacy schema (v1 number from saveState.js) or 0.9.0 to 1.0.0
    this.registerMigration('1', '1.0.0', (legacy) => {
      return this._migrateLegacyTo100(legacy);
    });
    this.registerMigration('0.9.0', '1.0.0', (legacy) => {
      return this._migrateLegacyTo100(legacy);
    });
  }

  _migrateLegacyTo100(legacy) {
    const base = createDefaultSaveState();
    if (!legacy || typeof legacy !== 'object') return base;

    if (legacy.userId) base.player.id = String(legacy.userId);
    if (legacy.handle) base.player.handle = String(legacy.handle);
    if (typeof legacy.level === 'number') base.player.level = legacy.level;
    if (typeof legacy.bits === 'number') base.player.currency.bits = legacy.bits;

    if (Array.isArray(legacy.inventory)) {
      base.inventory.discs = legacy.inventory
        .filter((item) => String(item).startsWith('disc_'))
        .map((item) => (item === 'disc_default' ? 'disc_identity_default' : item));
      if (base.inventory.discs.length === 0) base.inventory.discs = ['disc_identity_default'];
      base.inventory.cosmetics = legacy.inventory.filter((item) => !String(item).startsWith('disc_'));
      base.inventory.unlockedMaps = ['arena_grid_01'];
    }

    if (Array.isArray(legacy.achievements)) {
      base.achievements = legacy.achievements.map((id) =>
        typeof id === 'string' ? { id, unlockedAt: Date.now(), progress: 100 } : id
      );
    }

    if (legacy.stats && typeof legacy.stats === 'object') {
      base.stats.matchesPlayed = legacy.stats.matchesPlayed ?? 0;
      base.stats.wins = legacy.stats.wins ?? 0;
      base.stats.highestWave = legacy.stats.highestWave ?? legacy.stats.swarmHighestWave ?? 1;
      base.stats.swarmHighestWave = legacy.stats.swarmHighestWave ?? legacy.stats.highestWave ?? 1;
      base.stats.highestScore = legacy.stats.totalScore ?? 0;
      base.stats.totalDerezzes = legacy.stats.totalDerezzes ?? 0;
      base.stats.parriesExecuted = legacy.stats.parriesExecuted ?? 0;
      base.stats.curveEliminations = legacy.stats.curveEliminations ?? 0;
    }

    base.version = '1.0.0';
    base.updatedAt = Date.now();
    return base;
  }

  /**
   * Registers a migration function between schema versions.
   * @param {string} fromVersion
   * @param {string} toVersion
   * @param {(state: any) => any} migrationFn
   */
  registerMigration(fromVersion, toVersion, migrationFn) {
    const key = `${fromVersion}->${toVersion}`;
    this._migrations.set(key, migrationFn);
  }

  /**
   * Applies registered forward migrations sequentially.
   * @param {object} state
   * @param {string} [targetVersion] Optional target version boundary
   * @returns {object}
   */
  _applyMigrations(state, targetVersion = null) {
    let current = deepClone(state);
    let currentVersion = String(current.version || '0.9.0');
    let maxSteps = 50;

    while (maxSteps-- > 0) {
      if (targetVersion && currentVersion === targetVersion) {
        break;
      }
      let matched = false;
      for (const [key, fn] of this._migrations.entries()) {
        const [fromV, toV] = key.split('->');
        if (fromV === currentVersion) {
          current = fn(current);
          currentVersion = toV;
          current.version = toV;
          matched = true;
          break;
        }
      }
      if (!matched) {
        break;
      }
    }

    return current;
  }

  // ==========================================
  // Window & Cross-Tab Coordination
  // ==========================================

  _setupWindowListeners() {
    if (typeof window !== 'undefined') {
      this._storageListener = (event) => {
        if (event.key === this.storageKey && event.newValue) {
          this._handleExternalStorageUpdate(event.newValue);
        }
      };
      window.addEventListener('storage', this._storageListener);

      this._unloadListener = () => {
        this._flushEmergencySave();
      };
      window.addEventListener('beforeunload', this._unloadListener);
      window.addEventListener('pagehide', this._unloadListener);
    }
  }

  _handleExternalStorageUpdate(rawString) {
    try {
      const parsed = JSON.parse(rawString);
      if (isValidSaveState(parsed)) {
        const previousValue = this.state;
        this.state = deepClone(parsed);
        this.emit(StorageEvents.MUTATED, {
          path: '*',
          value: this.state,
          previousValue,
          isExternal: true
        });
        this.emit(StorageEvents.SAVED, {
          state: deepClone(this.state),
          timestamp: Date.now(),
          isExternal: true
        });
      }
    } catch (_) {}
  }

  _broadcastCrossTab(rawString) {
    // Deliver to peer instances in Node environment for automated testing
    for (const peer of nodeTestInstances) {
      if (peer !== this && peer.storageKey === this.storageKey) {
        try {
          peer._handleExternalStorageUpdate(rawString);
        } catch (_) {}
      }
    }
  }

  // ==========================================
  // Core Lifecycle Operations
  // ==========================================

  /**
   * Loads save state from persistent storage, applying migrations and corruption recovery.
   * @returns {object} The initialized TronSaveState
   */
  load() {
    const raw = this._getItem(this.storageKey);

    if (!raw) {
      this.state = createDefaultSaveState();
      this.save({ immediate: true });
      this.isInitialized = true;
      this.emit(StorageEvents.INITIALIZED, {
        state: deepClone(this.state),
        source: 'fresh'
      });
      return this.state;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Malformed JSON payload: Root is not an object');
      }
    } catch (err) {
      return this._handleCorruption(raw, err);
    }

    try {
      parsed = this._applyMigrations(parsed);
    } catch (err) {
      return this._handleCorruption(raw, err);
    }

    if (parsed && parsed.inventory && !Array.isArray(parsed.inventory.unlockedMaps)) {
      parsed.inventory.unlockedMaps = ['arena_grid_01'];
    }

    if (parsed && parsed.stats) {
      if (typeof parsed.stats.swarmHighestWave !== 'number') {
        parsed.stats.swarmHighestWave = typeof parsed.stats.highestWave === 'number' ? parsed.stats.highestWave : 1;
      }
      if (typeof parsed.stats.highestWave !== 'number') {
        parsed.stats.highestWave = parsed.stats.swarmHighestWave;
      }
      if (typeof parsed.stats.totalDerezzes !== 'number') {
        parsed.stats.totalDerezzes = 0;
      }
      if (typeof parsed.stats.parriesExecuted !== 'number') {
        parsed.stats.parriesExecuted = 0;
      }
      if (typeof parsed.stats.curveEliminations !== 'number') {
        parsed.stats.curveEliminations = 0;
      }
    }

    const validation = validateSaveState(parsed);
    if (!validation.valid) {
      return this._handleCorruption(raw, new Error(`Schema validation failed: ${validation.errors.join('; ')}`));
    }

    this.state = deepClone(parsed);
    this.isInitialized = true;
    this.emit(StorageEvents.INITIALIZED, {
      state: deepClone(this.state),
      source: 'local'
    });
    return this.state;
  }

  /**
   * Handles corrupted storage data by preserving a backup and resetting to default state.
   * @param {string} raw
   * @param {Error} error
   * @returns {object}
   */
  _handleCorruption(raw, error) {
    try {
      this._setItem(this.backupKey, raw || '');
    } catch (_) {}

    this.state = createDefaultSaveState();
    this.isInitialized = true;

    try {
      this._setItem(this.storageKey, JSON.stringify(this.state));
    } catch (_) {}

    this.emit(StorageEvents.CORRUPTED, {
      error: error.message,
      backupKey: this.backupKey,
      rawPayload: raw
    });

    this.emit(StorageEvents.INITIALIZED, {
      state: deepClone(this.state),
      source: 'recovered'
    });

    return this.state;
  }

  /**
   * Persists the in-memory state to storage.
   * @param {object} [options]
   * @param {boolean} [options.immediate=false]
   * @returns {boolean}
   */
  save(options = {}) {
    if (!this.state) {
      return false;
    }

    if (options.immediate && this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }

    this.state.updatedAt = Date.now();
    const raw = JSON.stringify(this.state);
    this._setItem(this.storageKey, raw);
    this._broadcastCrossTab(raw);

    this.emit(StorageEvents.SAVED, {
      state: deepClone(this.state),
      timestamp: Date.now(),
      isExternal: false
    });

    return true;
  }

  _scheduleDebouncedSave() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(() => {
      this._saveTimeout = null;
      this.save({ immediate: true });
    }, this.debounceMs);

    if (typeof this._saveTimeout?.unref === 'function') {
      this._saveTimeout.unref();
    }
  }

  _flushEmergencySave() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }
    if (this.state) {
      this.save({ immediate: true });
    }
  }

  // ==========================================
  // Dot-Delimited Keypath Accessors
  // ==========================================

  /**
   * Retrieves a nested property by dot-path notation.
   * @param {string} path e.g. "player.currency.bits"
   * @param {any} [defaultValue=undefined]
   * @returns {any}
   */
  get(path, defaultValue = undefined) {
    if (!this.state) {
      this.load();
    }
    if (!path || typeof path !== 'string') {
      return defaultValue;
    }

    const segments = path.split('.');
    let curr = this.state;
    for (const segment of segments) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return defaultValue;
      }
      curr = curr[segment];
    }

    return curr !== undefined ? deepClone(curr) : defaultValue;
  }

  /**
   * Mutates a nested property by dot-path notation and queues persistence.
   * @param {string} path e.g. "player.currency.bits"
   * @param {any} value
   * @param {object} [options]
   * @param {boolean} [options.autoSave=true]
   * @param {boolean} [options.immediate=false]
   * @returns {boolean}
   */
  set(path, value, options = {}) {
    if (!this.state) {
      this.load();
    }
    if (!path || typeof path !== 'string') {
      return false;
    }

    const { autoSave = true, immediate = false } = options;
    const segments = path.split('.');
    const lastKey = segments.pop();

    let curr = this.state;
    for (const segment of segments) {
      if (!curr[segment] || typeof curr[segment] !== 'object') {
        curr[segment] = {};
      }
      curr = curr[segment];
    }

    const previousValue = curr[lastKey] !== undefined ? deepClone(curr[lastKey]) : undefined;
    curr[lastKey] = deepClone(value);

    this.emit(StorageEvents.MUTATED, {
      path,
      value: deepClone(value),
      previousValue,
      isExternal: false
    });

    if (autoSave) {
      if (immediate) {
        this.save({ immediate: true });
      } else {
        this._scheduleDebouncedSave();
      }
    }

    return true;
  }

  /**
   * Resets the persistent storage and in-memory cache to default state.
   * @returns {object} Fresh default state
   */
  reset() {
    const previousValue = this.state;
    this.state = createDefaultSaveState();
    this.save({ immediate: true });

    this.emit(StorageEvents.MUTATED, {
      path: '*',
      value: deepClone(this.state),
      previousValue,
      isExternal: false
    });

    return this.state;
  }

  /**
   * Exports the current state as a formatted JSON string.
   * @param {number} [indent=2]
   * @returns {string}
   */
  exportJSON(indent = 2) {
    if (!this.state) {
      this.load();
    }
    return JSON.stringify(this.state, null, indent);
  }

  /**
   * Imports and validates an external JSON string into active save state.
   * @param {string} rawString
   * @returns {object} Imported save state
   */
  importJSON(rawString) {
    if (!rawString || typeof rawString !== 'string') {
      throw new Error('importJSON: Argument must be a valid JSON string');
    }

    let parsed = JSON.parse(rawString);
    parsed = this._applyMigrations(parsed);

    const validation = validateSaveState(parsed);
    if (!validation.valid) {
      throw new Error(`importJSON: Schema validation failed: ${validation.errors.join('; ')}`);
    }

    const previousValue = this.state;
    this.state = deepClone(parsed);
    this.save({ immediate: true });

    this.emit(StorageEvents.MUTATED, {
      path: '*',
      value: deepClone(this.state),
      previousValue,
      isExternal: false
    });

    return this.state;
  }

  /**
   * Cleans up registered event listeners and node bus references.
   */
  destroy() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }
    if (typeof window !== 'undefined') {
      if (this._storageListener) {
        window.removeEventListener('storage', this._storageListener);
      }
      if (this._unloadListener) {
        window.removeEventListener('beforeunload', this._unloadListener);
        window.removeEventListener('pagehide', this._unloadListener);
      }
    }
    nodeTestInstances.delete(this);
    this._listeners.clear();
  }
}

// Export singleton instance as default runtime orchestrator
export const storageManager = new StorageManager();
export const defaultStorageManager = storageManager;
export { StorageEvents } from './schema.js';
