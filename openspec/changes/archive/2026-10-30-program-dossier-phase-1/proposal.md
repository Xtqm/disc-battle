# Proposal: Program Dossier (Phase 1)

## Why

Currently, clicking the `[ TERMINAL ]` button in the Main Menu identity header opens the Grid Identity Terminal modal directly to generic Sign In / Create Account forms. For an already-authenticated user (e.g., `[USER RECOGNIZED] CALEBELIVS // LVL 01`), this creates cognitive friction and breaks immersion: the system has already recognized them, yet offers no dedicated profile or progression view.

Phase 1 introduces the diegetic **Program Dossier** view within the terminal modal. When an authenticated program activates the terminal, they are immediately greeted by their operational dossier—displaying their callsign (with inline editing), live combat telemetry, and system clearance status—while establishing an extensible tabbed interface ready for future integration of Loadout (Armory) and Directives (Achievements).

## What Changes

- **Program Dossier View**: When an authenticated user opens the terminal, default to a dedicated `PROGRAM DOSSIER` view rather than the authentication/creation form.
- **Inline Callsign Management**: Authenticated users can edit and save their callsign directly from their dossier, validated and persisted via `authManager.updateCallsign()` with real-time reactive UI updates.
- **Combat Telemetry & Progression Display**: Display live progression metrics in the dossier sourced from `saveState` (Progression Level, Bits Balance, Highest Wave Reached, Total Score, Matches Played).
- **System Clearance & Sync Status**: Display active auth provider details (Google, GitHub, Passkey), cloud synchronization state, and user identifier.
- **Switch Identity / Sign Out Action**: Provide a clear action within the dossier to switch identities or sign out, seamlessly returning to the sign-in/account creation wizard.
- **Extensible Tabbed Navigation (Future-Ready)**: Introduce in-universe tab navigation inside the terminal (`[ IDENT MATRIX ]`, `[ LOADOUT ]` *(Coming Soon)*, `[ DIRECTIVES ]` *(Coming Soon)*) to lay architectural groundwork for Phase 2 without disrupting existing standalone modals.
- **Guest Identity Handling**: Maintain zero-friction onboarding for Guest Sub-routines clicking `[ SECURE IDENTITY ]`, directing them to the secure credentials wizard while providing context on their transient guest ID.

## Capabilities

### Modified Capabilities
- `user-identity`: Update the `Grid Authorization Terminal Modal` requirement to mandate the Program Dossier view for authenticated sessions, inline callsign customization, live telemetry display, and identity switching.

## Impact

- **UI / DOM**: `index.html` (modal markup for `#authModal`, adding the dossier panel, stats readout, and tab controls), `src/ui/authTerminal.js` (view toggling, dossier data population, callsign edit handlers, tab switching).
- **CSS**: Add Tron-themed styles for the dossier telemetry panels, stat chips, and tab navigation in `index.html`.
- **Tests**: Update and expand `test/auth/auth_header.test.js` and `test/auth/auth_terminal_integration.test.js` to assert dossier rendering, callsign updating, and view switching.
