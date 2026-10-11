# Proposal

## Why

While Phase 1 established the headless `AuthManager`, `MockAuthProvider`, and `TronSaveState` engine, the player experience lacks in-game visual representation and authentication controls. Players have no visual feedback indicating whether they are running as a transient guest sub-routine or an identified user, nor do they have a diegetic interface to claim their identity, customize their callsign, or sync external credentials.

Phase 2 introduces the diegetic "Grid Terminal" visual layer and main menu identity badge directly aligned with Tron aesthetic lore. This gives players an atmospheric, CRT scanline-styled identity header and authorization terminal with audio-visual feedback that integrates cleanly with the existing Three.js canvas and PointerLock lifecycle.

## What Changes

- **Main Menu Identity Header**:
  - Persistent identity badge in the top-right corner of the main menu overlay.
  - Amber wireframe state for Guests: `[GUEST] SUB-ROUTINE // ID: XXXX` with a pulsating `[ SECURE IDENTITY ]` button triggering the terminal.
  - Tron Cyan glowing state for Authenticated Users: `[USER RECOGNIZED] CALLSIGN // LVL XX` with a green status circuit indicator.
- **Grid Authorization Terminal (`AuthModal`)**:
  - Diegetic CRT scanline overlay, glowing monospaced typography, and emissive grid styling matching the Tron visual language.
  - Dual-tab authentication interface:
    - "Direct Passkey" tab: Email and password fields with local/mock validation and account conversion.
    - "Quick Sync" tab: One-click federated provider hooks (Google, Discord).
  - Callsign / Display Name customization input allowing users to update their identity handle and sync with save state.
- **Audio-Visual Feedback & Engine Coordination**:
  - Zero-asset Web Audio synth routines for terminal interactions: modal boot hum/chirp, mechanical typing clicks, access granted chime, and access denied / error buzz.
  - PointerLock and input safeguards ensuring modal opening/closing cleanly releases and blocks pointer lock without corrupting canvas mouse/touch tracking.

## Capabilities

### New Capabilities
*(None - extends existing identity and audio capability specifications)*

### Modified Capabilities
- `user-identity`: Adds requirements for the diegetic main menu identity status header, interactive Grid Authorization Terminal (`AuthModal`) with dual-tab authentication & callsign customization, and PointerLock-safe UI transition orchestration.
- `procedural-audio`: Adds requirements for terminal procedural audio synthesis covering terminal activation, typing clicks, access granted authorization confirmation, and error buzzer sounds.

## Impact

- **UI & Menus**: Updates `tron/src/ui/menus.js`, `tron/src/ui/modals.js`, and adds terminal markup/styles to `tron/index.html` or dedicated UI modules.
- **Audio Subsystem**: Extends `tron/src/audio/sfx.js` with terminal procedural sound generators (`playTerminalOpenSound`, `playTerminalKeySound`, `playAccessGrantedSound`, `playErrorBuzzSound`).
- **Auth Layer**: Integrates with `tron/src/auth/AuthManager.js` and `authEventBus` to reactively update the identity header and execute sign-in/callsign update workflows.
- **Input & PointerLock**: Guarantees cursor release upon modal entry and prevents game loop input capture while the terminal is active.
