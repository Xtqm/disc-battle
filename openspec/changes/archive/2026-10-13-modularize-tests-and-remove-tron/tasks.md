# Tasks: Modularize Tests into Root test/ Directory and Remove Legacy tron/ Folder

## 1. Consolidate Root Dependencies & Package Configuration

- [x] 1.1 Update root `package.json` to include dependencies (`@supabase/supabase-js`, `puppeteer`) and configure domain test scripts (`test`, `test:auth`, `test:storage`, `test:economy`, `test:armory`, `test:campaign`, `test:gameplay`); verify syntax.
- [x] 1.2 Move `tron/node_modules/` and `tron/package-lock.json` to project root (or install if needed); verify `node -e "import('@supabase/supabase-js'); import('puppeteer')"` succeeds from repository root.

## 2. Scaffold Modular Test Directory Structure

- [x] 2.1 Remove legacy 5 stub files in root `test/` (`armory_manager.test.js`, `campaign_phase1.test.js`, `economy_manager.test.js`, `storage_manager.test.js`, `supabase_cloud_sync.test.js`); verify clean `test/` folder.
- [x] 2.2 Create domain subdirectories: `test/auth/`, `test/storage/`, `test/economy/`, `test/armory/`, `test/campaign/`, and `test/gameplay/`; verify directory creation.

## 3. Relocate and Modernize Test Suites

- [x] 3.1 Migrate Auth suites (8 files) to `test/auth/`:
  - `test_auth_header.js` -> `test/auth/auth_header.test.js`
  - `test_auth_input_isolation.js` -> `test/auth/auth_input_isolation.test.js`
  - `test_auth_mock_provider.js` -> `test/auth/auth_mock_provider.test.js`
  - `test_auth_save_state.js` -> `test/auth/auth_save_state.test.js`
  - `test_auth_sfx.js` -> `test/auth/auth_sfx.test.js`
  - `test_auth_terminal_integration.js` -> `test/auth/auth_terminal_integration.test.js`
  - `test_supabase_auth_provider.js` -> `test/auth/supabase_auth_provider.test.js`
  - `test_auth_integration.js` -> `test/auth/auth_integration.test.js`
  - Update imports to `../../src/...` and static HTTP server roots to `../../`; verify all 8 auth tests pass.
- [x] 3.2 Migrate Storage & Sync suites (5 files) to `test/storage/`:
  - `test_storage_manager.js` -> `test/storage/storage_manager.test.js`
  - `test_cloud_sync_resolver.js` -> `test/storage/cloud_sync_resolver.test.js`
  - `test_cross_tab_sync.js` -> `test/storage/cross_tab_sync.test.js`
  - `test_offline_resilience.js` -> `test/storage/offline_resilience.test.js`
  - `test_supabase_cloud_sync.js` -> `test/storage/supabase_cloud_sync.test.js`
  - Update imports to `../../src/...`; verify all 5 storage tests pass.
- [x] 3.3 Migrate Economy and Armory suites (2 files):
  - `test_economy_manager.js` -> `test/economy/economy_manager.test.js`
  - `test_armory_manager.js` -> `test/armory/armory_manager.test.js`
  - Update imports to `../../src/...`; verify both economy and armory tests pass.
- [x] 3.4 Migrate Campaign suites (3 files) to `test/campaign/`:
  - `test_campaign_phase1.js` -> `test/campaign/campaign_phase1.test.js`
  - `test_campaign_phase2.js` -> `test/campaign/campaign_phase2.test.js`
  - `test_campaign_phase3.js` -> `test/campaign/campaign_phase3.test.js`
  - Update imports to `../../src/...` and `index.html` references to `../../index.html`; verify all 3 campaign tests pass.
- [x] 3.5 Migrate Gameplay & UX suites (7 files) to `test/gameplay/`:
  - `test_physics_and_combat.js` -> `test/gameplay/physics_and_combat.test.js`
  - `test_multiplayer.js` -> `test/gameplay/multiplayer.test.js`
  - `test_rematch.js` -> `test/gameplay/rematch.test.js`
  - `test_fullscreen_mode.js` -> `test/gameplay/fullscreen_mode.test.js`
  - `test_mobile_controls.js` -> `test/gameplay/mobile_controls.test.js`
  - `test_mobile_modal_scrolling.js` -> `test/gameplay/mobile_modal_scrolling.test.js`
  - `test_unified_flow.js` -> `test/gameplay/unified_flow.test.js`
  - Update imports to `../../src/...` and static HTTP server roots to `../../`; verify all 7 gameplay tests pass.

## 4. Implement Unified Test Runner & Eliminate tron/ Directory

- [x] 4.1 Implement `test/runner.js` supporting running all tests or domain filters (`auth`, `storage`, `economy`, `armory`, `campaign`, `gameplay`); verify runner execution across domain filters.
- [x] 4.2 Delete legacy `tron/` directory entirely (including `tron/src/`, `tron/vendor/`, `tron/index.html`, `tron/test_*.js`, `tron/node_modules/`, `tron/package*.json`, `tron/start.*`); verify `tron/` directory no longer exists.
- [x] 4.3 Execute full regression test suite `npm test` across all 25 test suites; verify 100% clean passes without errors.

## Workflow follow-up

- Archive the change after implementation and test verification (`openspec archive --yes "modularize-tests-and-remove-tron"`).
- Commit clean working tree to git.
