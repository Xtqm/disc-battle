# Proposal: Sleeker & Simplified Program Dossier UI

## Why

The initial implementation of the Program Dossier modal (`#authModal`) feels visually dense and clunky:
- It renders over 10 individual nested bordered boxes (tabs, status banner, callsign box, 6 separate telemetry boxes, sign-out button, and console box).
- Critical information is repeated multiple times (the callsign and level appear in both the status banner and dedicated boxes).
- The top hub navigation buttons are chunky and wrap awkwardly, colliding visually with the top-right `[ X ]` dismiss button.

This change streamlines and declutters the Program Dossier into a sleek, minimalist Tron interface that feels polished, readable, and in-universe without visual noise.

## What Changes

- **Unified Identity Hero Header**: Merge the redundant status banner and callsign box into a single clean identity section showing the player's callsign, active pulse dot, and connection clearance in one place.
- **Sleek Minimalist Hub Navigation**: Replace the chunky multi-border tabs with a refined horizontal sub-navigation line with glowing active indicator and clean typography that leaves ample breathing room for the `[ X ]` close button.
- **Unified Telemetry Strip**: Consolidate the 6 separate heavy border boxes into a unified, elegant telemetry strip with clean vertical dividers and glowing data typography (Level, Bits, Best Wave, Score).
- **Subtle Callsign Edit Flow**: Simplify inline callsign editing with a discreet `[ EDIT ]` toggle that reveals a streamlined input without stretching or shifting layout cards.
- **Understated Action Controls**: Style `[ SWITCH IDENTITY / SIGN OUT ]` as a clean, low-profile ghost action button and suppress unnecessary idle console readouts in the dossier view.

## Capabilities

### Modified Capabilities
- `user-identity`: Refine the `Grid Authorization Terminal Modal` requirement to mandate a simplified, non-redundant visual layout for the Program Dossier.

## Impact

- **UI / Layout**: `index.html` (refactor `#dossierView` and `#terminalHubNav` markup and CSS styling).
- **Controller**: `src/ui/authTerminal.js` (update DOM population to bind to the simplified structure).
- **Tests**: Verify `test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js` continue to pass.
