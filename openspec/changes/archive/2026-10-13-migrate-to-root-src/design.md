# Design: Migrate to Root src/ Directory Architecture

## Context

Tron Disc Arena originated as a web application contained within `tron/` (`tron/index.html`, `tron/src/`). In subsequent development phases, standardized modules for user identity, storage (`SPEC-ECON-001 Phase 1`), and economy/progression (`SPEC-ECON-001 Phase 2`) were authored in root `src/`. To keep both environments functioning, numerous 1-line re-export shims were introduced between `tron/src/` and `src/`.

This design details the consolidation of all game source files into the root `src/` directory, resolving circular references and removing all re-export shims.

See [proposal.md](proposal.md) for motivation.

## Goals / Non-Goals

**Goals:**
- Move all domain modules currently located in `tron/src/` into root `src/`:
  - `audio/`, `auth/`, `core/`, `entities/`, `graphics/`, `input/`, `network/`, `physics/`, `storage/`, `ui/`.
- Consolidate storage utilities (`CloudSyncResolver.js`, `CrossTabSync.js`, `OfflineSyncQueue.js`) into `src/core/storage/` alongside `StorageManager.js` and `schema.js`.
- Move `tron/vendor/` (containing `three.module.js`) to root `vendor/` to preserve relative import paths (`../../vendor/three.module.js`).
- Remove all bridge re-export shims from `tron/src/` and `src/core/auth/`.
- Update all internal module imports to use consistent relative paths within `src/`.
- Update test servers and test imports across `tron/test_*.js` and `test/*.test.js` to import directly from root `src/`.
- Maintain 100% test pass rate across all 14 test suites.

**Non-Goals:**
- Modifying game physics, combat mechanics, AI logic, UI layout, or audio synthesis formulas.
- Rewriting or refactoring existing game logic beyond import path normalization.

## Decisions

### 1. Unified Submodule Structure Under `src/`
- **Decision:** Consolidate all domain submodules under `src/`:
  ```
  src/
  ├── audio/
  │   ├── sfx.js
  │   └── synth.js
  ├── auth/
  │   ├── AuthManager.js
  │   ├── events.js
  │   ├── IAuthProvider.js
  │   ├── MockAuthProvider.js
  │   ├── saveState.js
  │   └── SupabaseAuthProvider.js
  ├── core/
  │   ├── config.js
  │   ├── env.js
  │   ├── main.js
  │   ├── state.js
  │   ├── economy/
  │   │   └── EconomyManager.js
  │   └── storage/
  │       ├── CloudSyncResolver.js
  │       ├── CrossTabSync.js
  │       ├── OfflineSyncQueue.js
  │       ├── schema.js
  │       └── StorageManager.js
  ├── entities/
  │   ├── Arena.js
  │   ├── Bot.js
  │   ├── Disc.js
  │   └── Player.js
  ├── graphics/
  │   ├── materials.js
  │   ├── particles.js
  │   └── scene.js
  ├── input/
  │   ├── InputManager.js
  │   ├── keyboard.js
  │   ├── mouse.js
  │   └── touch.js
  ├── network/
  │   ├── firebaseSetup.js
  │   ├── roomManager.js
  │   └── sync.js
  ├── physics/
  │   ├── collision.js
  │   └── trajectory.js
  └── ui/
      ├── authTerminal.js
      ├── hud.js
      ├── menus.js
      ├── modals.js
      └── UIManager.js
  ```
- **Rationale:** Establishes a clean, modern ES6 project structure where every module belongs to a clearly defined domain folder, eliminating duplicate and split locations.
- **Alternatives Considered:** Keeping files in `tron/src/` (rejected: root `src/` is the Node.js standard and aligns with SPEC-ECON-001).

### 2. Vendor Directory Placement
- **Decision:** Place `vendor/` at the repository root (`./vendor/three.module.js`).
- **Rationale:** Modules located in two-level deep subdirectories (e.g. `src/core/main.js`, `src/entities/Player.js`, `src/physics/trajectory.js`) use the relative import `../../vendor/three.module.js`. Placing `vendor/` at the root satisfies this path with zero changes needed to Three.js imports.

### 3. Web Entry Point and Test Server Static File Resolution
- **Decision:** 
  - Ensure the web runtime can be served from either root or `tron/`.
  - In `tron/index.html`, update script tag to `<script type="module" src="../src/core/main.js"></script>` or maintain a root `index.html`.
  - For Puppeteer test servers in `tron/test_auth_integration.js` and `tron/test_auth_terminal_integration.js`, configure static file routing to resolve `/src/` from repo root `../src/` and `/vendor/` from `../vendor/`.
- **Rationale:** Ensures both direct browser serving and automated headless test harnesses load modules seamlessly.

### 4. Deprecating Re-export Shims
- **Decision:** Once all source files and test imports are updated to reference `src/`, delete the shim directories in `tron/src/`.
- **Rationale:** Completely cleans up the repository tree, preventing developer confusion about where the source of truth resides.

## Risks / Trade-offs

- **[Risk]** Relative import breakages across moved files.
  - **Mitigation:** Use systematic path inspection and run the full test suite (`npm test`) to catch any unresolved module specifiers.
- **[Risk]** Puppeteer integration test servers failing to serve relocated scripts.
  - **Mitigation:** Update `createServer` routines in `tron/test_*.js` to map `/src` and `/vendor` to repository root paths.

## Migration Plan

1. Relocate files from `tron/src/` to `src/` and move `tron/vendor/` to root `vendor/`.
2. Consolidate `storage` files into `src/core/storage/` and remove re-export shims.
3. Update module import paths to match the unified hierarchy.
4. Update `tron/index.html` and Puppeteer test servers to resolve scripts from `src/`.
5. Update unit test import paths in `tron/test_*.js` and `test/*.test.js`.
6. Run `npm test` and verify all 14 test suites pass cleanly.
