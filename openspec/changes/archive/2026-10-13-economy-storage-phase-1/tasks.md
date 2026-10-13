# Tasks: Phase 1 Core State Schema & StorageManager Engine (SPEC-ECON-001)

## 1. Schema Definition & Default Factory

- [x] 1.1 Define `TronSaveState` v1.0.0 schema constants, field boundaries (`player`, `loadout`, `campaign`, `inventory`, `achievements`, `stats`), and schema validation guards in `src/core/storage/schema.js`; verify schema export and structure.
- [x] 1.2 Implement deep-cloned immutable default factory `createDefaultSaveState(overrides)` in `src/core/storage/schema.js`; verify default payload generation and clone independence.
- [x] 1.3 Mirror and re-export schema modules to `tron/src/core/storage/schema.js` and `tron/src/storage/schema.js` to support isomorphic browser and node environments.

## 2. StorageManager Core Engine & Persistence Pipeline

- [x] 2.1 Implement `StorageManager` class and singleton in `src/core/storage/StorageManager.js` with event emitter capabilities (`on`, `off`, `emit`) and lifecycle methods (`load`, `save`, `reset`, `exportJSON`, `importJSON`); verify lifecycle state transitions.
- [x] 2.2 Implement dot-delimited keypath accessors `get(path, defaultValue)` and `set(path, value, options)` with `STORAGE_MUTATED` event dispatching; verify nested property reads and writes.
- [x] 2.3 Implement the 500ms debounced auto-save pipeline and emergency synchronous flush on `beforeunload` and `pagehide`; verify deferred saves and immediate flush execution.
- [x] 2.4 Mirror and re-export `StorageManager.js` to `tron/src/core/storage/StorageManager.js` and `tron/src/storage/StorageManager.js`.

## 3. Corruption Recovery, Schema Migrations & Cross-Tab Sync

- [x] 3.1 Implement corruption detection in `StorageManager.load()`: detect invalid JSON/corrupt structure, preserve raw string under `tron_save_state.bak`, dispatch `STORAGE_CORRUPTED`, and recover to clean default state; verify backup creation and clean recovery.
- [x] 3.2 Implement forward-compatible schema migration registry (`registerMigration`, `migrateSaveState`) to handle version bumps; verify sequential upgrade execution.
- [x] 3.3 Implement cross-tab coordination via window `storage` event listeners, updating memory state on external changes without circular re-saving; verify external mutation events.

## 4. Test Suite & Verification

- [x] 4.1 Author comprehensive test suite `tron/test_storage_manager.js` exercising schema immutability, dot-path mutations, debounce timing, unload flush, corruption backup recovery, migrations, and cross-tab sync.
- [x] 4.2 Author `test/storage_manager.test.js` runner and register `test_storage_manager.js` in `tron/run_tests.js`.
- [x] 4.3 Execute `node tron/test_storage_manager.js` and verify all test assertions pass cleanly.
