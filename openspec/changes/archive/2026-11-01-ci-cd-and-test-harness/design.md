# Design: CI/CD Pipeline & Test Harness Architecture

## Context

Arc League currently executes tests and builds manually on local developer workstations. See `proposal.md` for motivation.

Existing constraints and observations:
1. Nine Puppeteer integration tests each spin up their own `http.createServer` on fixed, hardcoded ports (e.g. 8097, 8098), causing port collisions when executed concurrently or when sockets remain in `TIME_WAIT`.
2. Headless Chromium tests require software WebGL rendering (`--use-gl=angle --use-angle=swiftshader`) to execute 3D Three.js logic on headless CI runners.
3. `desktop/main.cjs` already implements `ELECTRON_TEST_MODE=1` which boots the Electron shell and auto-exits on `did-finish-load` or after a 3.5s timeout.
4. `electron-builder.json` currently specifies only Windows targets (`nsis` and `portable`).

## Goals / Non-Goals

**Goals:**
- Provide a zero-collision, ephemeral-port test server and lifecycle helper (`withBrowserTest`) shared by all Puppeteer tests.
- Maintain 100% test pass rate while eliminating copy-pasted server boilerplate across tests.
- Implement GitHub Actions CI workflows for automated pull request verification (unit tests, integration tests, and desktop boot smoke tests).
- Implement an automated release workflow matrix that produces Windows, Linux, and macOS standalone executables and attaches them to GitHub Releases on version tags.
- Align `package.json` test scripts with `test/runner.js` domains and eliminate duplicate test execution.

**Non-Goals:**
- Steamworks auto-publishing via `steamcmd` (Steam publishing requires sensitive partner account credentials and 2FA; depot build scripts will be validated in CI, but automated depot upload to Steam backend is deferred).
- Commercial code signing certificates (Apple Developer ID / Windows Authenticode EV certs); release artifacts will provide unsigned binaries with SHA-256 checksums.
- Migrating test runners to Jest/Vitest (the custom lightweight runner `test/runner.js` is fast and zero-overhead; we preserve its design).

## Decisions

### 1. Ephemeral Port Allocation for Integration Tests
- **Decision:** In `test/helpers/browserHarness.js`, bind the HTTP server to port `0` (`server.listen(0)`). The OS kernel automatically assigns an unallocated ephemeral port.
- **Rationale:** Guarantees zero port collisions (`EADDRINUSE`) across concurrent test processes or rapid test restarts.
- **Interface:**
  ```javascript
  export async function withBrowserTest(callback, options = {}) {
    const harness = await startTestHarness(options);
    try {
      await callback(harness);
    } finally {
      await harness.cleanup();
    }
  }
  ```
  `harness` exposes `{ server, browser, page, url, port }`.
- **Alternatives Considered:**
  - *Hardcoded port incrementing (8090, 8091...):* Fragile; fails if another local service is using that port.
  - *External npm package (`portfinder` / `get-port`):* Unnecessary external dependency; Node's built-in `server.listen(0)` is synchronous, native, and 100% reliable.

### 2. Multi-Stage GitHub Actions CI Workflows
- **Decision:** Split continuous integration into three discrete jobs in `.github/workflows/ci.yml`:
  1. `unit-tests`: Runs on `ubuntu-latest` and `windows-latest`. Executes fast in-memory domain tests (`auth`, `storage`, `economy`, `armory`, `campaign`, `achievements`, `graphics`).
  2. `integration-tests`: Runs on `ubuntu-latest`. Installs SwiftShader/Chromium libraries, runs `node test/runner.js gameplay` and auth integration suites.
  3. `desktop-smoke`: Runs on `windows-latest`. Executes `ELECTRON_TEST_MODE=1 npx electron .` to verify that the native Electron window initializes and exits without error.
- **Rationale:** Fast test jobs give instant developer feedback in ~2-3 seconds, while heavier integration jobs run in parallel without blocking initial sanity checks.

### 3. Multi-Platform Desktop Build Matrix
- **Decision:** Configure `electron-builder.json` to declare:
  - `win`: `nsis`, `portable`
  - `linux`: `AppImage`
  - `mac`: `dmg`
  In `.github/workflows/release.yml`, run a matrix across `[windows-latest, ubuntu-latest, macos-latest]`.
- **Rationale:** Cross-compiling macOS or Windows builds from Linux often leads to missing native toolchains. Native runners on GitHub Actions ensure seamless binary packaging for each target OS.

### 4. Deduplication and Domain Sync in `test/runner.js`
- **Decision:** Remove `ui/duel_map_selector.test.js` from `TEST_DOMAINS.gameplay` (retaining it in `TEST_DOMAINS.economy`), and add missing npm scripts `test:graphics` and `test:achievements` to `package.json`.
- **Rationale:** Eliminates redundant test runs during full-suite passes and ensures all test domains defined in `test/runner.js` have dedicated, runnable npm scripts.

## Risks / Trade-offs

- **[Risk] Headless WebGL rendering inconsistencies on Linux CI runners**
  → *Mitigation:* Ensure Puppeteer launch flags include `--use-gl=angle --use-angle=swiftshader --no-sandbox --disable-setuid-sandbox` and install Mesa GL libraries in the GitHub Actions runner.
- **[Risk] macOS unsigned binary warnings (Gatekeeper)**
  → *Mitigation:* Document in release notes how to bypass Gatekeeper for unsigned developer preview builds (`xattr -cr`), and generate SHA-256 checksums for each release asset.
- **[Risk] Slower CI run times due to Puppeteer dependency download**
  → *Mitigation:* Cache `~/.cache/puppeteer` across CI workflow runs using `actions/cache`.

## Migration Plan

1. Create `test/helpers/browserHarness.js` with port 0 ephemeral server and lifecycle wrapper.
2. Refactor `test/auth/*.test.js` and `test/gameplay/*.test.js` to import and utilize `withBrowserTest`.
3. Update `test/runner.js` and `package.json` with domain scripts and deduplicated entries.
4. Verify all tests pass locally (`npm test`).
5. Update `electron-builder.json` with Linux and Mac packaging configurations.
6. Create `.github/workflows/ci.yml` and `.github/workflows/release.yml`.
7. Verify CI workflow syntax and packaging dry-runs.
