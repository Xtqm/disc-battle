# Design: Modularize Tests into Root test/ Directory and Remove Legacy tron/ Folder

## Context

See `proposal.md` for background and motivation. The project currently has:
1. Production code located in `src/`.
2. Static vendor dependencies located in `vendor/three.module.js`.
3. Canonical web markup in root `index.html`.
4. Tests and dependencies located in `tron/`:
   - 25 test files in `tron/test_*.js`.
   - Test runner in `tron/run_tests.js`.
   - Node packages and lockfile in `tron/node_modules/` and `tron/package.json`.
   - Stale HTML and launch scripts in `tron/index.html`, `tron/start.bat`, and `tron/start.sh`.
   - Residual re-export shims in `tron/src/armory/`.
   - 5 stub files in root `test/` that simply `import '../tron/...'`.

## Goals / Non-Goals

**Goals:**
- Consolidate all dependencies into root `package.json` and root `node_modules/`.
- Modularize test files into domain-specific subdirectories under `test/`:
  - `test/auth/`
  - `test/storage/`
  - `test/economy/`
  - `test/armory/`
  - `test/campaign/`
  - `test/gameplay/`
- Introduce a modular, programmatic test runner `test/runner.js` supporting pattern matching and domain filters (e.g. `node test/runner.js auth`).
- Normalize all test relative imports to reference `../../src/...`.
- Standardize all Puppeteer test static HTTP servers to serve files from repository root (`path.resolve(__dirname, '../../')`).
- Completely remove the `tron/` directory and all its contents.
- Ensure 100% test pass rate across all 25 test suites.

**Non-Goals:**
- Modifying game logic or production behavior in `src/`.
- Modifying game UI markup or styles in root `index.html`.
- Switching test framework from Node.js built-in `assert` and `child_process` to third-party runners like Jest or Vitest.

## Decisions

### 1. Domain Grouping for Tests
We organize the 25 flat test files into 6 intuitive domain directories matching the submodules of `src/`:

```
test/
├── runner.js                      (Suite runner & CLI dispatcher)
├── auth/
│   ├── auth_header.test.js
│   ├── auth_input_isolation.test.js
│   ├── auth_integration.test.js
│   ├── auth_mock_provider.test.js
│   ├── auth_save_state.test.js
│   ├── auth_sfx.test.js
│   ├── auth_terminal_integration.test.js
│   └── supabase_auth_provider.test.js
├── storage/
│   ├── storage_manager.test.js
│   ├── cloud_sync_resolver.test.js
│   ├── cross_tab_sync.test.js
│   ├── offline_resilience.test.js
│   └── supabase_cloud_sync.test.js
├── economy/
│   └── economy_manager.test.js
├── armory/
│   └── armory_manager.test.js
├── campaign/
│   ├── campaign_phase1.test.js
│   ├── campaign_phase2.test.js
│   └── campaign_phase3.test.js
└── gameplay/
    ├── physics_and_combat.test.js
    ├── multiplayer.test.js
    ├── rematch.test.js
    ├── fullscreen_mode.test.js
    ├── mobile_controls.test.js
    ├── mobile_modal_scrolling.test.js
    └── unified_flow.test.js
```

*Rationale*: Flat test directories become unwieldy as features grow. Grouping by domain allows developers to run targeted domain suites quickly (e.g. `npm run test:campaign`). Renaming `test_*.js` to `*.test.js` aligns with standard JavaScript testing conventions.

*Alternatives Considered*:
- Flat `test/` directory: Reintroduces clutter and doesn't solve domain scoping.
- Splitting tests by `unit/` vs `integration/`: Many suites (e.g. `campaign_phase2.js` or `auth_integration.js`) mix simulated DOM, unit assertions, and headless browser tests; domain grouping is much cleaner and maps 1:1 with features.

### 2. Dependency Elevation
Merge `dependencies` from `tron/package.json` (`@supabase/supabase-js`, `puppeteer`) into root `package.json`. Move or install `node_modules` at repository root.

*Rationale*: Running Node commands from repository root requires Node module resolution to find `node_modules` in the root or parent directories without needing `tron/` in the path.

### 3. Test Runner Design (`test/runner.js`)
Build an ES module runner that:
- Defines an ordered registry of test suites by domain.
- Accepts an optional CLI argument filter (e.g., `node test/runner.js campaign` runs only the 3 campaign suites).
- Spawns each test child process sequentially with `{ stdio: 'inherit' }`.
- Prints formatted progress headers and returns exit code 0 on all passes or 1 on failure.

### 4. Static HTTP Server Path Resolution in Tests
Puppeteer tests (`auth_integration.test.js`, `auth_terminal_integration.test.js`, `fullscreen_mode.test.js`, etc.) instantiate an internal Node HTTP server to serve the game assets to headless Chrome.
- **Root directory:** Compute `const REPO_ROOT = path.resolve(__dirname, '../../')`.
- **File serving:** Map request path directly to `path.join(REPO_ROOT, reqPath)` with fallback for root to `/index.html`.
- This eliminates the fragile fallback check (`if (!fs.existsSync(filePath)) ... rootPath`) because all paths (`/src/...`, `/vendor/...`, `/index.html`) naturally exist directly under `REPO_ROOT`.

## Risks / Trade-offs

- **[Risk] Relative Import Depth**: Moving tests into `test/<domain>/` changes their directory depth from 1 to 2.
  → *Mitigation*: Systematically replace `../src/` with `../../src/` and verify every moved file.
- **[Risk] Puppeteer Working Directory & Navigation**: Tests reading `index.html` via `fs.readFileSync(new URL('../index.html', import.meta.url))` will fail if not updated to `../../index.html`.
  → *Mitigation*: Update all `new URL(..., import.meta.url)` instances to reference `../../index.html`.
- **[Risk] Node.js Package Resolution**: Puppeteer on Windows sandbox occasionally checks parent directories for config.
  → *Mitigation*: Ensure `node_modules` is placed at root and tests run with `BypassSandbox: true` when executing browser tests.

## Migration Plan

1. **Root `package.json` Updates**: Add dependencies from `tron/package.json` and configure granular test scripts.
2. **Move Dependencies**: Move `tron/node_modules` to root `node_modules`.
3. **Directory Scaffolding**: Create `test/auth/`, `test/storage/`, `test/economy/`, `test/armory/`, `test/campaign/`, `test/gameplay/`.
4. **Relocate and Rename Tests**: Move each `tron/test_*.js` into its designated domain folder as `*.test.js`, deleting the obsolete stubs in root `test/`.
5. **Update Paths & Servers**: Normalize imports to `../../src/` and update server roots to `../../`.
6. **Implement `test/runner.js`**: Create the unified domain test runner.
7. **Purge `tron/`**: Remove the entire `tron/` directory.
8. **Verification**: Run `npm test` and domain test scripts to verify 100% pass across all 25 suites.
