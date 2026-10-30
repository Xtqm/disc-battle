# Design: Program Dossier (Phase 1)

## Context

The Main Menu Identity Header dynamically renders either an Amber Wireframe badge (`[GUEST] SUB-ROUTINE`) with `[ SECURE IDENTITY ]` or a Tron Cyan glowing badge (`[USER RECOGNIZED] CALLSIGN // LVL XX`) with `[ TERMINAL ]`. Currently, activating either button invokes `showAuthTerminal()` in `src/ui/authTerminal.js`, which unconditionally displays Step 1 of the authentication wizard (`#authStep1`).

For authenticated users, this is redundant and disorienting. The `saveState` schema (`src/auth/saveState.js`) already tracks rich player telemetry (`level`, `bits`, `stats.highestWave`, `stats.totalScore`, `stats.matchesPlayed`) and `AuthManager.updateCallsign()` already supports reactive callsign updates.

See `proposal.md` for motivation and `specs/user-identity/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Provide a diegetic `PROGRAM DOSSIER` view inside `#authModal` that opens automatically for authenticated users.
- Support inline callsign viewing and editing with immediate local persistence, optimistic UI updates, and background cloud sync.
- Render combat and progression telemetry chips (Level, Bits, Highest Wave, Total Score, Matches Played).
- Establish future-ready tab navigation in the terminal header: `[ IDENT MATRIX ]` (active), `[ LOADOUT ]` (coming soon), and `[ DIRECTIVES ]` (coming soon).
- Provide a clear `[ SWITCH IDENTITY / SIGN OUT ]` transition that switches the modal into credential/account creation mode.
- Maintain existing input isolation, PointerLock release, and strict `[ X ]` exit safety.

**Non-Goals:**
- Relocating the 3D Armory preview scene (`ArmoryModal.js`) or full Achievements tree (`AchievementsModal.js`) into this modal (Phase 2 scope).
- Modifying underlying `saveState` schema version or database table definitions.
- Removing or altering the Main Menu's current `ARMORY` and `ACHIEVEMENTS` buttons in this phase.

## Decisions

### 1. Unified Modal Container with View Switching
- **Decision**: Keep `#authModal` as the single overlay container and introduce two main sub-views: `#dossierView` (profile, telemetry, callsign edit) and `#authView` (credential tabs, Step 1 Quick Sync, Step 2 wizard).
- **Rationale**: Reuses established modal mechanics (`state.authModalOpen`, PointerLock safety, keyboard input isolation, `.card` styling) without introducing duplicate modal states or listener collision.
- **Alternative Considered**: Creating a standalone `#profileModal`. Rejected because it duplicates modal lifecycle, backdrop, and input suppression code, and requires coordinating two separate modals when switching accounts.

### 2. View Routing on Terminal Launch
- **Decision**: In `showAuthTerminal()`, check `authManager.currentUser && !authManager.currentUser.isAnonymous`. If authenticated, show `#dossierView`; if guest or anonymous, show `#authView` (Step 1).
- **Rationale**: Matches player intent. Guests want to secure credentials; authenticated users want to inspect and manage their profile.

### 3. Inline Callsign Editing UX
- **Decision**: Display callsign in an interactive field group with `[ EDIT ]` / `[ SAVE ]` toggle and real-time validation (3-16 alphanumeric characters or underscores). On save, call `authManager.updateCallsign()`, which updates `currentUser`, `saveState`, localStorage, and emits `PROFILE_UPDATED`.
- **Rationale**: Immediate responsiveness without requiring a multi-step modal wizard.

### 4. Telemetry Readout Grid
- **Decision**: Layout telemetry into structured Tron-themed data blocks:
  - **Progression**: Level badge and Total Bits balance.
  - **Grid Records**: Highest Wave Reached, Total Score, Matches Played.
  - **Clearance**: Connection type (e.g., Passkey, Google, GitHub, Local Sync) and active Grid ID.
- **Rationale**: Gives players immediate recognition of their accomplishments and identity persistence.

### 5. Extensible Terminal Header Tabs
- **Decision**: Render terminal tabs in the modal header:
  - `IDENT MATRIX`: Active by default.
  - `LOADOUT`: Styled with Tron dim-glow border and a subtle `[ COMING SOON ]` pill.
  - `DIRECTIVES`: Styled with Tron dim-glow border and a subtle `[ COMING SOON ]` pill.
- **Rationale**: Validates the visual architecture and prepares players for Phase 2 without broken interactivity.

## Risks / Trade-offs

- **[Risk] Test breakage on existing `#authModal` selectors**: Existing tests in `test/auth/` check for elements like `#tabSignIn`, `#btnAuthorizePasskey`, `#terminalIdentityReadout`.
  → *Mitigation*: Keep existing DOM element IDs and compatibility bridges within `#authView`. Wrap `#authView` and `#dossierView` cleanly so existing selector hierarchies remain valid.
- **[Risk] Input target collision with game controls**: Editing callsign inside `#dossierView` could trigger game movement keys if input isolation fails.
  → *Mitigation*: Ensure the dossier callsign input uses standard input events and that `state.authModalOpen` continues to guard all keyboard actions in `src/input/keyboard.js`.
