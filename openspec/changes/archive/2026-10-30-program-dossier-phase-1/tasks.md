# Tasks

## 1. Markup & Tron Styling

- [x] 1.1 Add the `#dossierView` container, telemetry panels, callsign edit controls, and terminal navigation tabs (`[ IDENT MATRIX ]`, `[ LOADOUT ]`, `[ DIRECTIVES ]`) to `#authModal` in `index.html`, keeping existing `#authView` IDs intact for compatibility. Verify markup renders properly.
- [x] 1.2 Implement Tron CSS styling for `#dossierView` in `index.html`, including glassmorphic telemetry cards, glowing stat pills, tab button states, and disabled indicator pills. Verify responsive styling across desktop and mobile breakpoints.

## 2. Dossier Controller & View Routing

- [x] 2.1 Update `showAuthTerminal()` in `src/ui/authTerminal.js` to route authenticated users directly to `#dossierView` and guest users to `#authView` (Step 1). Verify view routing logic via unit test.
- [x] 2.2 Implement `populateDossierData()` in `src/ui/authTerminal.js` to extract and render active player telemetry (Level, Bits, Highest Wave, Total Score, Matches Played) and system clearance status from `authManager.saveState` and `currentUser`. Verify telemetry display accuracy.
- [x] 2.3 Implement inline callsign editing and validation in `src/ui/authTerminal.js` wired to `authManager.updateCallsign()`, updating identity header and dossier view reactively. Verify callsign update commits cleanly.
- [x] 2.4 Implement view toggle handlers for `[ SWITCH IDENTITY / SIGN OUT ]` and terminal tab navigation headers in `src/ui/authTerminal.js`. Verify smooth transition between dossier and auth credential wizard.

## 3. Automated Testing & Verification

- [x] 3.1 Extend `test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js` with test suites covering dossier rendering, telemetry readout, inline callsign editing, and modal view switching. Verify tests pass by running `node test/auth/auth_header.test.js` and `node test/auth/auth_terminal_integration.test.js`.
