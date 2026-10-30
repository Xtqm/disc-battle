# Tasks

## 1. Sleek Markup & CSS Refactor

- [x] 1.1 Refactor `#authModal` in `index.html` to streamline `.terminal-hub-nav`, replace duplicate status boxes with a hero identity block, replace `.dossier-telemetry-grid` with `.dossier-stats-strip`, and style `#btnSwitchIdentity` as a sleek ghost button. Verify markup renders cleanly.
- [x] 1.2 Update CSS in `index.html` for clean underline tabs, hero identity typography, and the unified horizontal stats strip with hairline dividers. Verify visual hierarchy and mobile responsiveness.

## 2. Controller & Integration Verification

- [x] 2.1 Update `src/ui/authTerminal.js` to manage view-specific status banner visibility and bind telemetry data cleanly to the streamlined layout. Verify with unit test execution.
- [x] 2.2 Verify and run all unit and integration test suites (`test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js`). Verify all tests pass with zero regressions.
