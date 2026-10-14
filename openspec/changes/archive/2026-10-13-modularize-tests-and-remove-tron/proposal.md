# Proposal: Modularize Tests into Root test/ Directory and Remove Legacy tron/ Folder

## Why

The repository has accumulated architectural debt from an incomplete historical directory migration. While runtime game modules were migrated to the root `src/` directory in a prior refactor, test files, package dependencies, and the test runner were left in a nested `tron/` directory. Consequently, duplicate files emerged (e.g. an obsolete `tron/index.html` vs the active root `index.html`), subsequent features created re-export shims back into `tron/src/`, and test execution relies on cross-directory fallback paths.

This change permanently consolidates dependencies, modularizes the test suite into a structured domain hierarchy under root `test/`, and completely eliminates the legacy `tron/` directory.

## What Changes

- **Consolidate Project Dependencies**: Merge runtime/dev dependencies (`@supabase/supabase-js`, `puppeteer`) from `tron/package.json` into the root `package.json` and move `node_modules/` to the repository root.
- **Modularize Test Suite**:
  - Reorganize all 25 test suites from `tron/test_*.js` into categorized subdirectories under root `test/`:
    - `test/auth/` (8 test suites)
    - `test/storage/` (5 test suites)
    - `test/economy/` (1 test suite)
    - `test/armory/` (1 test suite)
    - `test/campaign/` (3 test suites)
    - `test/gameplay/` (7 test suites)
  - Replace the 5 shallow re-export stubs currently in `test/`.
  - Create a unified `test/runner.js` supporting both full suite runs and granular domain-specific test flags (e.g. `npm run test:auth`, `npm run test:campaign`).
- **Normalize Test Imports and Static Test Servers**:
  - Update all moved test files to import directly from `../../src/...`.
  - Update Puppeteer test HTTP servers to resolve static assets (`/index.html`, `/src/*`, `/vendor/*`) directly from repository root (`path.resolve(__dirname, '../../')`).
- **Purge Legacy Directory**:
  - Delete `tron/` completely, including `tron/index.html`, `tron/src/`, `tron/vendor/`, `tron/node_modules/`, `tron/package.json`, `tron/package-lock.json`, `tron/run_tests.js`, `tron/start.bat`, and `tron/start.sh`.

## Capabilities

### New Capabilities
None (pure structural refactoring and developer experience tooling).

### Modified Capabilities
None (game mechanics, storage schemas, economy equations, campaign progressions, and auth specifications remain unchanged).

> Note: `.openspec.yaml` specifies `skip_specs: true`.

## Impact

- **File Tree**: Complete elimination of `tron/`. Root `test/` becomes the single, clean test hierarchy.
- **NPM Scripts**: `npm test` and domain-specific test scripts in `package.json` point to `test/runner.js` and modularized test files.
- **Web App**: Single authoritative root `index.html` with no duplicate or stale variants.
- **CI / Local Development**: Clear, organized test structure with zero cross-directory relative path fragility.
