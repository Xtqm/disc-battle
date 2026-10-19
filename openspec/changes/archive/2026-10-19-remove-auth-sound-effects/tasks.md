# Tasks

## 1. Remove Sound Effects from Auth Terminal

- [x] 1.1 Remove `SFX` import and modal open sound (`SFX.terminalOpen()`) from `src/ui/authTerminal.js`, verifying `showAuthTerminal` opens without invoking audio synthesis.
- [x] 1.2 Remove tab navigation audio and keystroke input event listeners (`input` handlers triggering `SFX.terminalKey()`) from `src/ui/authTerminal.js`, verifying input and tab navigation operate silently.
- [x] 1.3 Remove success (`SFX.accessGranted()`) and error (`SFX.errorBuzz()`) audio triggers from credential submission, OAuth handlers, error handlers, and callsign updates in `src/ui/authTerminal.js`, verifying operations succeed or display errors without audio cues.

## 2. Verification and Testing

- [x] 2.1 Update test suites (including `test/auth/auth_sfx.test.js` and `test/auth/auth_terminal_integration.test.js`) to assert that authentication terminal workflows do not trigger SFX, and verify via `node test/auth/auth_sfx.test.js`.
- [x] 2.2 Run complete auth and campaign test suites (`npm test`, `node test/auth/auth_terminal_integration.test.js`) to verify all tests pass without regressions.
