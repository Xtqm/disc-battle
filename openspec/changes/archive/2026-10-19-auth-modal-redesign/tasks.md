# Tasks

## 1. Modal Markup & Styling Refactor

- [x] 1.1 Refactor `#authModal` in `index.html` to adopt Main Menu `.card` structure: remove intrusive `.terminal-scanlines` overlay, add dedicated top-right `[ X ]` dismiss button (`#btnCloseTerminal`), and verify markup renders cleanly in browser.
- [x] 1.2 Update CSS in `index.html` to replace Courier New monospace with clean `Segoe UI` typography, style the new mode toggle tabs ("Sign In" vs "Create Account"), style prominent Quick Sync buttons, and verify card visual alignment with the main menu.

## 2. Multi-Step Logic & Pre-filling in `authTerminal.js`

- [x] 2.1 Implement state machine and step navigation in `src/ui/authTerminal.js` to manage Step 1 (Sign In / Create Account) and Step 2 (Choose Callsign).
- [x] 2.2 Connect Quick Sync and credentials validation so that "Sign In" bypasses Step 2 directly upon successful authentication.
- [x] 2.3 Add Callsign pre-fill logic in Step 2 extracting from federated provider profile metadata, email prefix, or active guest ID before user customization.
- [x] 2.4 Restrict modal dismissal exclusively to `#btnCloseTerminal` (`[ X ]`), disabling click-outside and Escape key dismissal handlers.

## 3. Integration Testing & Verification

- [x] 3.1 Update `test/auth/auth_terminal_integration.test.js` to assert the 2-step account creation wizard, Quick Sync prominence, and single-step sign-in bypass.
- [x] 3.2 Update `test/auth/auth_input_isolation.test.js` to verify that `[ X ]` is the sole dismiss path and run test suite via `node test/auth/auth_terminal_integration.test.js` and `node test/auth/auth_input_isolation.test.js`.
