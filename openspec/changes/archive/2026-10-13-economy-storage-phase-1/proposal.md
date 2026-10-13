# Proposal: Phase 1: Core State Schema & StorageManager Engine (SPEC-ECON-001)

## Why

Tron Disc Arena currently relies on an unstandardized, fragmented local storage implementation with limited fields and no corruption recovery, debounced persistence pipeline, or formal schema migration engine. Establishing Phase 1 of SPEC-ECON-001 provides an immutable `TronSaveState` v1.0.0 schema contract and an event-driven `StorageManager` singleton, guaranteeing data integrity, zero lost mutations on window close, automatic corruption recovery, and cross-tab synchronization across the Grid.

## What Changes

- **Core State Schema (`src/core/storage/schema.js`)**:
  - Enforce `TronSaveState` v1.0.0 structure spanning `player`, `loadout`, `campaign`, `inventory`, `achievements`, and `stats`.
  - Export a deep-cloned immutable default state factory `createDefaultSaveState(overrides)`.
  - Provide strict schema validator and type assertion guards for runtime data integrity.
- **Event-Driven StorageManager Singleton (`src/core/storage/StorageManager.js`)**:
  - Implement full lifecycle methods: `load()`, `save()`, `get(path, defaultValue)`, `set(path, value, options)`, `reset()`, `exportJSON()`, and `importJSON(rawString)`.
  - Implement a 500ms debounced auto-save pipeline with immediate execution support.
  - Implement an emergency synchronous flush listener attached to `beforeunload` and `pagehide` to prevent data loss when players close or refresh the tab.
  - Implement resilient corruption recovery: detect malformed JSON or invalid schema, preserve corrupt raw payloads to a `.bak` key (`tron_save_state.bak`), and cleanly recover to defaults.
- **Migration & Cross-Tab Synchronization Registry**:
  - Implement a forward-compatible migration registry (`registerMigration`, `migrateSaveState`) to smoothly handle future schema bumps (e.g., v1.0.0 -> v1.1.0).
  - Implement cross-tab coordination via window `storage` event listeners (with optional `BroadcastChannel` support) to synchronize state mutations across open tabs without circular feedback loops.
- **Lifecycle Events**:
  - Define and broadcast standardized storage lifecycle events: `STORAGE_INITIALIZED`, `STORAGE_SAVED`, `STORAGE_CORRUPTED`, and `STORAGE_MUTATED`.

## Capabilities

### New Capabilities
- `core-storage`: Core state schema enforcement, atomic keypath mutations, debounced persistence, corruption recovery, schema migrations, and cross-tab synchronization for Tron Disc Arena (SPEC-ECON-001).

### Modified Capabilities
*(None - existing combat, arena, multiplayer, and user-identity capabilities retain their specifications without modifications; user-identity will bind to the new StorageManager in subsequent integration phases).*

## Impact

- **New Files**:
  - `src/core/storage/schema.js`: Schema constants, validation logic, and `createDefaultSaveState` factory.
  - `src/core/storage/StorageManager.js`: Singleton instance, event emitter, storage operations, corruption recovery, migration runner, and cross-tab listener.
  - `tron/src/core/storage/schema.js` and `tron/src/core/storage/StorageManager.js`: Browser distribution mirrors or symlinks matching repository architecture.
  - `tron/test_storage_manager.js` (and `test/storage_manager.test.js`): Comprehensive automated test suites validating schema immutability, corruption fallback, debouncing, migrations, and cross-tab synchronization.
- **Runtime Dependencies**: Zero external dependencies (uses native `localStorage`, `window.addEventListener`, and standard ES6 modules).
