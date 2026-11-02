# Proposal: Automated CI/CD, Multi-Platform Desktop Build & Test Harness Refactoring

## Why

Arc League currently has no automated continuous integration or deployment pipelines: test execution, multi-platform desktop packaging, and release generation are entirely manual processes. Additionally, 9 Puppeteer integration test files duplicate ~40 lines of static HTTP server boilerplate with hardcoded, colliding port assignments (such as duplicate ports 8097 and 8098), causing potential `EADDRINUSE` port collisions, flakiness, and high maintenance overhead when executing tests locally or in parallel CI environments.

Establishing automated GitHub Actions CI, multi-platform desktop packaging workflows, and a centralized dynamic test harness guarantees consistent build quality, eliminates test interference, and automates desktop release delivery.

## What Changes

- **Centralized Test Harness (`test/helpers/browserHarness.js`)**:
  - Create a shared testing utility providing dynamic ephemeral port allocation (`port: 0`), centralized static file serving with MIME mapping, standardized Chromium launch flags (`--no-sandbox`, `--use-angle=swiftshader`), and managed lifecycle cleanup (`withBrowserTest(...)`).
  - Refactor all 9 integration test files (`test/auth/auth_integration.test.js`, `test/auth/auth_terminal_integration.test.js`, `test/gameplay/fullscreen_mode.test.js`, `test/gameplay/mobile_controls.test.js`, `test/gameplay/mobile_modal_scrolling.test.js`, `test/gameplay/multiplayer.test.js`, `test/gameplay/physics_and_combat.test.js`, `test/gameplay/rematch.test.js`, `test/gameplay/unified_flow.test.js`) to consume the shared harness, eliminating hardcoded ports and duplicate server implementations.
  - Deduplicate `ui/duel_map_selector.test.js` from `TEST_DOMAINS` in `test/runner.js` and add missing npm scripts (`test:graphics`, `test:achievements`) in `package.json`.

- **Automated Test CI (`.github/workflows/ci.yml`)**:
  - Create a GitHub Actions workflow triggered on push and pull requests to `main`.
  - Execute fast unit and domain suites (`test:auth`, `test:storage`, `test:economy`, `test:armory`, `test:campaign`, `test:graphics`, `test:achievements`) across Node.js LTS versions.
  - Run headless Puppeteer integration tests under Linux runners with required Chromium sandbox and SwiftShader software-rendering dependencies.
  - Run headless Electron smoke test verification via `ELECTRON_TEST_MODE=1` to ensure desktop window boots without crashing.

- **Multi-Platform Desktop Packaging & Release Workflow (`.github/workflows/release.yml`)**:
  - Update `electron-builder.json` to define packaging targets for Windows (NSIS, portable), Linux (AppImage), and macOS (dmg).
  - Add npm script `desktop:build:all` (or platform-specific targets) to `package.json`.
  - Create a release workflow triggered on release tags (`v*.*.*`) that matrix-builds desktop binaries across `windows-latest`, `ubuntu-latest`, and `macos-latest`.
  - Automatically publish release drafts on GitHub Releases with packaged installer artifacts and SHA-256 checksums.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `desktop-shell`: Broaden executable packaging configuration requirements to support multi-platform desktop builds (Windows, Linux, macOS) and automated continuous deployment packaging.

## Impact

- **Codebase / Test Suite**:
  - Replaces ~400 lines of copy-pasted server/browser setup across 9 test files with a single robust helper in `test/helpers/browserHarness.js`.
  - Prevents port collisions and socket leaks during parallel test execution.
  - Synchronizes `package.json` test scripts and test runner domain registries.
- **Packaging & Infrastructure**:
  - `electron-builder.json`: Expanded with Linux and Mac build definitions and artifact naming conventions.
  - `.github/workflows/`: Adds `ci.yml` and `release.yml`.
- **Dependencies**: Uses existing `electron-builder`, `puppeteer`, and standard Node.js libraries; no heavyweight third-party build systems required.
