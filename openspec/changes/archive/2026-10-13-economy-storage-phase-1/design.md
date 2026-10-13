# Design: Phase 1 Core State Schema & StorageManager Engine (SPEC-ECON-001)

## Context

Tron Disc Arena currently maintains player save data through legacy routines in `tron/src/auth/saveState.js`. While functional for basic guest callsigns and settings, the current architecture lacks:
- A standardized, versioned schema encompassing cosmetics, campaign progression, inventory, and achievements.
- Granular, path-based atomic updates (`get`/`set`) without full-object clobbering.
- A debounced persistence pipeline to prevent redundant synchronous disk/localStorage writes during rapid combat events.
- An emergency flush mechanism on window termination to prevent data loss.
- Resilient recovery from corrupted local storage payloads.
- An extensible schema migration registry to safely handle future versions.

See [proposal.md](proposal.md) and [specs/core-storage/spec.md](specs/core-storage/spec.md) for requirements.

## Goals / Non-Goals

**Goals:**
- Provide `src/core/storage/schema.js` with `TronSaveState` v1.0.0 definitions, deep-cloned immutable default factory `createDefaultSaveState()`, and runtime schema validators.
- Implement `src/core/storage/StorageManager.js` as an event-driven singleton providing `load()`, `save()`, `get(path, defaultValue)`, `set(path, value, options)`, `reset()`, `exportJSON()`, and `importJSON(rawString)`.
- Implement a 500ms debounced auto-save queue with an emergency synchronous flush listener bound to `beforeunload` and `pagehide`.
- Implement corruption detection that automatically preserves corrupt payloads under `tron_save_state.bak`, emits `STORAGE_CORRUPTED`, and cleanly recovers to default state.
- Implement a forward-compatible migration registry capable of transforming legacy schemas up to the latest version.
- Implement cross-tab synchronization listening to window `storage` events without triggering circular write loops.
- Support isomorphic execution across Node.js test runners and browser environments with zero external dependencies.

**Non-Goals:**
- Integrating remote cloud synchronization with Supabase or Cloud Firestore (deferred to subsequent economy/cloud sync phases).
- Implementing UI store, inventory display, or purchasing dialogues.
- Modifying Three.js live gameplay or physics simulation loops.

## Decisions

### 1. Schema Domain Boundaries & v1.0.0 Structure
- **Decision:** Segment `TronSaveState` into six primary domain objects:
  1. `player`: `id`, `handle`, `level`, `xp`, `currency` (`{ bits: 0, sparks: 0 }`).
  2. `loadout`: `activeDisc`, `activeTrail`, `activeVisor`, `activeArenaSkin`, `audioTheme`.
  3. `campaign`: `completedNodes`, `unlockedNodes`, `currentNode`, `starsEarned`, `chapter`.
  4. `inventory`: `discs`, `cosmetics`, `consumables`.
  5. `achievements`: array of achievement records (`{ id, unlockedAt, progress }`).
  6. `stats`: `matchesPlayed`, `wins`, `losses`, `discsThrown`, `discsDeflected`, `tilesDestroyed`, `highestWave`, `highestScore`, `totalPlaytimeSec`.
  Metadata includes `version: '1.0.0'`, `createdAt`, and `updatedAt`.
- **Rationale:** Establishes clear ownership boundaries for gameplay subsystems and economy expansion.
- **Alternatives Considered:** A flat property list (rejected: degrades maintainability and causes key collisions).

### 2. Deep-Cloned Immutable Default Factory
- **Decision:** Implement `createDefaultSaveState(overrides = {})` using `structuredClone` (with defensive `JSON.parse(JSON.stringify())` fallback).
- **Rationale:** Ensures factory callers receive a decoupled instance that cannot mutate baseline templates.

### 3. Dot-Delimited Path Accessors (`get` & `set`)
- **Decision:** Provide lightweight internal helper routines for dot-path traversal (`get(path, defaultValue)` and `set(path, value, { autoSave = true })`).
- **Rationale:** Eliminates external utility dependencies while enabling precise field mutations (e.g. `storageManager.set('player.currency.bits', 500)`).
- **Mutation Event:** Dispatches `STORAGE_MUTATED` with payload `{ path, value, previousValue }`.

### 4. Debounced Persistence Pipeline & Emergency Flush
- **Decision:** When `set()` is invoked, mutations update the in-memory cache immediately and schedule a deferred disk write via a 500ms timer.
- **Emergency Flush:** Attaches listeners to `window.beforeunload` and `window.pagehide` calling `save({ immediate: true })`.
- **Rationale:** Prevents high-frequency I/O bottlenecks during rapid gameplay while guaranteeing zero lost mutations when closing the browser tab.

### 5. Corruption Recovery with `.bak` Preservation
- **Decision:** In `load()`, if `JSON.parse` fails or schema validation fails:
  1. Read the corrupt raw payload and store it under `tron_save_state.bak`.
  2. Emit `STORAGE_CORRUPTED` with error details and raw string.
  3. Re-initialize memory state via `createDefaultSaveState()`.
  4. Commit the fresh default state to storage.
- **Rationale:** Protects players from terminal crashes caused by corrupted data while retaining the corrupt payload for debugging or manual recovery.

### 6. Schema Migration Registry
- **Decision:** Maintain a migration registry map (`migrations: Map<string, Function>`) executed sequentially when the persisted state's version is older than current (`1.0.0`).
- **Rationale:** Allows seamless schema bumps in future updates without wiping user progress.

### 7. Cross-Tab Synchronization
- **Decision:** Listen to `window.addEventListener('storage', ...)`. When the key matches `tron_save_state`, parse the payload, update the in-memory state, and emit `STORAGE_MUTATED` and `STORAGE_SAVED` with `{ isExternal: true }` to suppress redundant outbound writes.

### 8. Repository Layout & Module Re-exports
- **Decision:** Author primary modules in `src/core/storage/schema.js` and `src/core/storage/StorageManager.js`. Re-export or mirror in `tron/src/core/storage/` and `tron/src/storage/` to support both repository entry points and test environments.

## Risks / Trade-offs

- **[Risk]** In-flight mutations lost during sudden OS or process termination.
  - **Mitigation:** Debounce window is kept low (500ms). Critical state changes (e.g., node completion or reward claims) can invoke `save({ immediate: true })`.
- **[Risk]** Multi-tab recursive write loops.
  - **Mitigation:** External storage events update in-memory state only and set `isExternal: true`, strictly bypassing the debounced `save()` queue.
- **[Risk]** LocalStorage unavailable or throwing `SecurityError` (e.g., incognito or iframe restrictions).
  - **Mitigation:** Implement in-memory Map fallback storage provider so the game functions seamlessly even without persistent browser storage.

## Migration Plan

1. Author `src/core/storage/schema.js` and `src/core/storage/StorageManager.js`.
2. Provide mirror/re-export bindings in `tron/src/storage/` and `tron/src/core/storage/`.
3. Create automated test suites (`test_storage_manager.js` and `storage_manager.test.js`) verifying all lifecycle flows.
4. Integrate with `tron/run_tests.js`.
