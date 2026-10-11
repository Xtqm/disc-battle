# Design

## Context

Phase 1 implemented the headless identity subsystem: `IAuthProvider`, `MockAuthProvider`, `TronSaveState`, and `AuthManager`, initialized during application bootstrap in `tron/src/core/main.js`. 

Currently, the main menu (`tron/src/ui/menus.js` / `tron/index.html`) displays mode buttons and control instructions but has no visual representation of player identity. Anonymous guests are assigned a handle such as `GUEST_SUBROUTINE_XXXX`, but players cannot view their status, customize their callsign, or link credentials.

See `proposal.md` for problem motivation and `specs/user-identity/spec.md` & `specs/procedural-audio/spec.md` for behavioral requirement contracts.

## Goals / Non-Goals

**Goals:**
- Provide a persistent diegetic identity badge in the top-right of the main menu header that reactively updates across guest and authenticated states.
- Render amber wireframe aesthetics for Guest Sub-routines (`[GUEST] SUB-ROUTINE // ID: XXXX`) with a pulsating `[ SECURE IDENTITY ]` button.
- Render glowing Tron Cyan aesthetics for Authenticated Users (`[USER RECOGNIZED] CALLSIGN // LVL XX`) with an active green status circuit indicator.
- Build the Grid Authorization Terminal (`AuthModal`) with CRT scanline styling, emissive grids, monospaced typography, and dual-tab switching ("Direct Passkey" and "Quick Sync").
- Provide callsign / display name editing directly inside the terminal with sanitization and persistent save state synchronization.
- Implement zero-asset procedural Web Audio generators for terminal launch, typing clicks, access granted chimes, and error buzzers in `tron/src/audio/sfx.js`.
- Guarantee PointerLock and Three.js canvas input isolation so modal navigation never causes unwanted cursor locking or canvas interaction.

**Non-Goals:**
- Live cloud backend OAuth redirect endpoints or remote server databases (scoped for Phase 3). Quick Sync buttons will interface with `IAuthProvider` hooks in simulation/mock mode.
- Mid-combat in-game terminal access (the terminal is restricted to Main Menu and Pause overlays).

## Decisions

### 1. Dedicated Terminal UI Module (`tron/src/ui/authTerminal.js`)
- **Choice**: Encapsulate the terminal modal DOM lifecycle, tab switching, input validation, and event handling within `tron/src/ui/authTerminal.js` rather than bloating `menus.js` or `modals.js`.
- **API Surface**:
  - `initAuthTerminal()`: Binds listeners to `authEventBus` and injects or configures terminal DOM elements.
  - `updateIdentityHeader()`: Re-renders the top-right main menu badge according to `authManager.currentUser` and `authManager.saveState`.
  - `showAuthTerminal()` / `hideAuthTerminal()`: Coordinates terminal modal visibility, focus, and audio triggers.
- **Alternatives Considered**: Inlining all terminal HTML directly into `tron/index.html` and logic into `menus.js`. *Rejected* to keep existing menu code clean and modular.

### 2. Diegetic CRT Scanline & Emissive Grid Visual Design
- **Choice**: Implement CRT scanlines, grid wireframes, and phosphor glow using pure CSS:
  - Scanlines via `repeating-linear-gradient(rgba(0,0,0,0) 0px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.6) 4px)`.
  - Monospaced typography with glowing text-shadow (`0 0 10px var(--cyan)`).
  - Amber wireframe theme for unverified/guest state (`--orange: #ff7b1a` and `#ffaa00`), contrasting with Tron Cyan (`#4ff2ff`) and Circuit Green (`#00ff66`).
- **Alternatives Considered**: Three.js 3D render-to-texture terminal inside the arena. *Rejected* because HTML/DOM terminals ensure superior text input compatibility, accessibility, mobile virtual keyboard support, and crisp resolution.

### 3. Audio Integration & Zero-Asset Synthesis Presets
- **Choice**: Expand `tron/src/audio/sfx.js` with 4 procedural synth routines utilizing `getAudioCtx()`:
  - `playTerminalOpenSound()`: Rising resonant sine/saw sweep (160Hz -> 840Hz, 0.22s) with slight bandpass filter.
  - `playTerminalKeySound()`: Ultra-short transient mechanical click (1400Hz pulse, 0.025s decay).
  - `playAccessGrantedSound()`: Dual-tone ascending harmonic confirmation chime (587Hz -> 880Hz, 0.35s).
  - `playErrorBuzzSound()`: Dissonant low sawtooth pair (130Hz / 138Hz, 0.28s) with rapid gain cutoff.
- **Alternatives Considered**: Loading MP3/WAV UI sound packs. *Rejected* to maintain the project's zero-asset offline-first architecture.

### 4. Input & PointerLock Containment
- **Choice**:
  - When opening `AuthModal`, explicitly call `document.exitPointerLock()` and set cursor to `'default'`.
  - Check `e.target.tagName === 'INPUT'` in `tron/src/input/keyboard.js` to ensure typing credentials does not trigger player movement (WASD), jumping (Space), or pause toggles (P/Esc).
  - Add `e.stopPropagation()` on modal click/touch handlers to prevent 3D canvas `mousedown` listeners from requesting pointer lock.

### 5. Level Calculation & Callsign Management
- **Choice**:
  - Level tier computed dynamically from `TronSaveState`: `Level = Math.max(1, Math.floor((stats.totalScore || 0) / 500) + (stats.highestWave || 1))`.
  - Callsigns validated with regex `^[A-Za-z0-9_-]{3,16}$`.
  - Updating callsign modifies `currentUser.handle` and `saveState.handle`, committing through `AuthManager` and emitting `AuthEvents.PROFILE_UPDATED`.

## Architecture Flow

```
+───────────────────────────────────────────────────────────────────────────────+
|                        DIEGETIC IDENTITY & TERMINAL FLOW                      |
+───────────────────────────────────────────────────────────────────────────────+
|                                                                               |
|   Main Menu Mount ───> updateIdentityHeader()                                 |
|                               │                                               |
|           ┌───────────────────┴───────────────────┐                           |
|           ▼                                       ▼                           |
|   [ Guest Sub-Routine ]                  [ Authenticated User ]               |
|   - Amber Wireframe Motif                - Tron Cyan Glowing Motif            |
|   - "[GUEST] SUB-ROUTINE // ID: XXXX"    - "[USER RECOGNIZED] CALLSIGN // LVL"|
|   - Pulsating [ SECURE IDENTITY ]        - Green Status Circuit Indicator     |
|           │                                       │                           |
|           └───────────────────┬───────────────────┘                           |
|                               ▼ User clicks badge                             |
|                    showAuthTerminal()                                         |
|                               │                                               |
|                               ├──> playTerminalOpenSound()                    |
|                               ├──> document.exitPointerLock()                 |
|                               ├──> Suppresses game keyboard capture           |
|                               ▼                                               |
|                    Grid Authorization Terminal                                |
|                    ┌─────────────────────────────────┐                        |
|                    │  [ DIRECT PASSKEY ]  [ QUICK SYNC ]                      |
|                    │                                 │                        |
|                    │  Callsign: [ ENTER CALLSIGN ]   │                        |
|                    │  Passkey:  [ ••••••••••••••• ]  │                        |
|                    │                                 │                        |
|                    │  [ COMMIT AUTHORIZATION ]       │                        |
|                    └─────────────────────────────────┘                        |
|                               │                                               |
|                 ┌─────────────┴─────────────┐                                 |
|                 ▼ Success                   ▼ Failure                         |
|        playAccessGrantedSound()    playErrorBuzzSound()                       |
|        AuthManager updates state   Display terminal error alert               |
|        updateIdentityHeader()                                                 |
|                                                                               |
+───────────────────────────────────────────────────────────────────────────────+
```

## Risks / Trade-offs

- **[Risk: Keyboard Trap in Input Fields]**: Players typing in terminal inputs could trigger game controls or struggle to dismiss the modal with Esc.
  - *Mitigation*: Update `keyboard.js` to bypass game movement if focus is within an `INPUT` element, but permit `Escape` to close the terminal.
- **[Risk: Mobile Virtual Keyboard Layout Distortion]**: On-screen keyboards in mobile landscape mode reduce viewport height drastically.
  - *Mitigation*: Add responsive scroll rules (`max-height: 85vh`, `overflow-y: auto`, `padding-bottom: 24px`) to the terminal card.
- **[Risk: Web Audio Context Suspension on Boot]**: Terminal audio triggers could throw warnings if user has not yet interacted with the page.
  - *Mitigation*: Terminal opening is initiated via explicit user click on the header button, inherently guaranteeing user gesture activation.
