# Tasks: CI/CD Pipeline & Test Harness Implementation

## 1. Test Harness Refactoring & Ephemeral Port Allocation

- [x] 1.1 Implement `test/helpers/browserHarness.js` providing an ephemeral HTTP server (`server.listen(0)`), MIME type resolution, standardized Puppeteer launch configurations, and the `withBrowserTest()` lifecycle wrapper. Verify port 0 allocation and graceful server/browser termination.
- [x] 1.2 Refactor `test/auth/auth_integration.test.js` and `test/auth/auth_terminal_integration.test.js` to import and consume `withBrowserTest()`, removing hardcoded ports 8097/8098 and redundant `createServer` functions. Verify suites pass with `npm run test:auth`.
- [x] 1.3 Refactor gameplay integration suites (`test/gameplay/fullscreen_mode.test.js`, `test/gameplay/mobile_controls.test.js`, `test/gameplay/mobile_modal_scrolling.test.js`, `test/gameplay/multiplayer.test.js`, `test/gameplay/physics_and_combat.test.js`, `test/gameplay/rematch.test.js`, `test/gameplay/unified_flow.test.js`) to use `browserHarness.js`. Verify suites pass with `npm run test:gameplay`.
- [x] 1.4 Deduplicate `ui/duel_map_selector.test.js` in `test/runner.js` and register missing npm scripts `test:graphics` and `test:achievements` in `package.json`. Verify full execution with `npm test`.

## 2. GitHub Actions Automated Test CI

- [x] 2.1 Create `.github/workflows/ci.yml` defining matrix jobs for `unit-tests` (Node 20/22 on Ubuntu and Windows), `integration-tests` (headless Puppeteer with SwiftShader WebGL on Ubuntu), and `desktop-smoke` (Electron boot verification via `ELECTRON_TEST_MODE=1`). Verify YAML syntax integrity.
- [x] 2.2 Validate all CI-invoked commands locally to confirm clean exit codes and error handling in headless environments.

## 3. Multi-Platform Desktop Build & Release Automation

- [x] 3.1 Update `electron-builder.json` to define packaging specifications for Linux (`AppImage`) and macOS (`dmg`) alongside existing Windows (`nsis`, `portable`) targets. Verify builder configuration validity.
- [x] 3.2 Add `desktop:build:all` script to `package.json` and verify `desktop:build` executes cleanly on Windows.
- [x] 3.3 Create `.github/workflows/release.yml` with multi-platform runners (`windows-latest`, `ubuntu-latest`, `macos-latest`) triggered on version tags (`v*.*.*`), generating release binaries, computing SHA-256 checksums, and publishing GitHub Release drafts.

## 4. Verification & Validation

- [x] 4.1 Execute full test suite `npm test` to confirm zero port collision errors, zero socket leaks, and 100% test pass rate across all domains.
- [x] 4.2 Run `openspec validate ci-cd-and-test-harness` to verify all spec, design, and proposal artifacts adhere to OpenSpec guidelines.

## Workflow follow-up

- Archive the change after implementation and validation via `/opsx-archive`.
- Verify the updated capability specs in `openspec/specs/desktop-shell/spec.md`.
