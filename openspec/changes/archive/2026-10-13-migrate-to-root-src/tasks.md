# Tasks: Migrate to Root src/ Directory Architecture

## 1. Relocate Source Modules and Static Vendor Assets

- [x] 1.1 Copy all canonical source directories (`audio`, `auth`, `core`, `entities`, `graphics`, `input`, `network`, `physics`, `ui`) from `tron/src/` into root `src/`, consolidating storage files into `src/core/storage/`; verify all files copied without loss.
- [x] 1.2 Relocate `tron/vendor/` to root `vendor/` so `../../vendor/three.module.js` resolves cleanly across submodules; verify vendor script existence.
- [x] 1.3 Remove all temporary re-export shim files from `src/core/auth/` and `tron/src/`; verify clean file tree without circular shims.

## 2. Normalize Internal Import Paths

- [x] 2.1 Update internal relative imports across `src/core/`, `src/core/storage/`, and `src/auth/` to reference sibling modules within `src/`; verify syntax and module resolution.
- [x] 2.2 Update game loop, UI, and network module imports in `src/` to ensure all inter-module references point to the new unified structure; verify import resolution with Node.js dry-run.

## 3. Web Entry Point and Test Harness Integration

- [x] 3.1 Update `tron/index.html` (and optionally add root `index.html`) to source `./src/core/main.js` from the consolidated tree; verify DOM script tag and asset links.
- [x] 3.2 Update static file serving in Puppeteer test servers (`tron/test_auth_integration.js`, `tron/test_auth_terminal_integration.js`, etc.) to serve modules from root `src/` and `vendor/`; verify server HTTP 200 responses.
- [x] 3.3 Update unit test import paths in `tron/test_*.js` and `test/*.test.js` to import directly from `../src/` instead of legacy paths; verify unit test execution.

## 4. Verification and Regression Testing

- [x] 4.1 Execute `npm run test:storage` and `npm run test:economy` to verify storage and economy engines pass 100%.
- [x] 4.2 Execute full test suite `npm test` across all 14 test suites and verify 100% clean passes without regressions.

