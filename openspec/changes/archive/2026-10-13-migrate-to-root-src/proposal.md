# Proposal: Migrate to Root src/ Directory Architecture

## Why

The codebase currently maintains a split source tree between `tron/src/` (containing legacy game entities, graphics, physics, input, audio, and UI) and root `src/` (containing newly standardized storage, economy, and auth providers). To bridge these locations, numerous cross-directory re-export shims were introduced (e.g. `tron/src/storage/`, `tron/src/core/storage/`, `tron/src/economy/`, `src/core/auth/`). Consolidating all game source modules directly into root `src/` eliminates these redundant bridge files, simplifies developer navigation, enforces a single source of truth, and aligns the repository with modern standard JavaScript project layouts.

## What Changes

- **Consolidate Domain Submodules to Root `src/`**:
  - Migrate all domain modules currently located in `tron/src/` into canonical directories in root `src/`:
    - `tron/src/audio/` -> `src/audio/`
    - `tron/src/auth/` -> `src/auth/`
    - `tron/src/core/` -> `src/core/` (merging `config.js`, `main.js`, `state.js` alongside `env.js`, `EconomyManager.js`, `StorageManager.js`, `schema.js`)
    - `tron/src/entities/` -> `src/entities/`
    - `tron/src/graphics/` -> `src/graphics/`
    - `tron/src/input/` -> `src/input/`
    - `tron/src/network/` -> `src/network/`
    - `tron/src/physics/` -> `src/physics/`
    - `tron/src/storage/` -> `src/storage/` (consolidating cloud sync and offline queues alongside core storage schema)
    - `tron/src/ui/` -> `src/ui/`
- **Eliminate Re-export Shims**:
  - Remove all redundant 1-line re-export bridge files across `tron/src/` and `src/core/`.
- **Update Import Paths & Static Asset Resolution**:
  - Normalize relative import paths across modules so all imports resolve internally within root `src/`.
  - Ensure static assets (HTML entry point, vendor scripts like `three.module.js`) and test server runners resolve modules from root `src/` with zero broken references.
- **Update Test Suite Runners**:
  - Update test runners in `tron/` and `test/` to import directly from `../src/` instead of `./src/` shims.
  - Verify all 14 test suites pass with 100% success.

## Capabilities

### New Capabilities
*(None - pure structural refactoring)*

### Modified Capabilities
*(None - existing game capabilities retain their specifications without modifications; this change alters physical file organization without changing system behavior)*

## Impact

- **Affected Code**: All modules currently residing in `tron/src/`, re-export shims in `src/core/`, and test import paths in `tron/test_*.js`.
- **Breaking Changes**: None for external game behavior. Internal relative module paths will be unified under `src/`.
- **Dependencies**: Zero external dependencies.
