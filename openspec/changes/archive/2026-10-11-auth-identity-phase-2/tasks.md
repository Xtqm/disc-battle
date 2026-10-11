# Tasks

## 1. Procedural Audio Synthesis for Terminal

- [x] 1.1 Implement terminal procedural sound routines in `tron/src/audio/sfx.js` (`playTerminalOpenSound`, `playTerminalKeySound`, `playAccessGrantedSound`, `playErrorBuzzSound`) using Web Audio API oscillators and gain nodes.
- [x] 1.2 Create audio unit test in `tron/test_auth_sfx.js` verifying that each sound routine executes cleanly without throwing errors or referencing missing context.

## 2. Diegetic Main Menu Identity Status Header

- [x] 2.1 Implement identity status badge container, CRT scanline styling, and CSS states in `tron/index.html` and `tron/src/ui/menus.js` supporting both Amber wireframe (`[GUEST] SUB-ROUTINE // ID: XXXX` with pulsating `[ SECURE IDENTITY ]`) and Tron Cyan glowing (`[USER RECOGNIZED] CALLSIGN // LVL XX` with circuit indicator) modes.
- [x] 2.2 Wire reactive subscription in `tron/src/ui/menus.js` to `authEventBus` (`auth:state_changed`, `auth:profile_updated`) to dynamically re-render the header badge upon boot and identity transitions, verified with a DOM state test.

## 3. Grid Authorization Terminal Modal (`AuthModal`)

- [x] 3.1 Create `tron/src/ui/authTerminal.js` defining the `AuthModal` component with CRT scanline effect, monospaced typography, emissive grid borders, and dual-tab container ("Direct Passkey" and "Quick Sync").
- [x] 3.2 Implement tab switching, callsign / display name input editing with regex validation (`^[A-Za-z0-9_-]{3,16}$`), and save state synchronization through `AuthManager`.
- [x] 3.3 Implement Direct Passkey (Email/Password) and Quick Sync (Google/Discord simulation hooks) authentication forms with status messages and validation feedback.
- [x] 3.4 Wire audio feedback triggers into terminal lifecycle: modal open chirp, keystroke clicks on input, confirmation chime on successful authorization/save, and error buzz on validation failure.

## 4. Input & PointerLock Safety Integration

- [x] 4.1 Update `tron/src/ui/modals.js` and `tron/src/ui/authTerminal.js` to release PointerLock, restore system cursor, and block canvas click-through whenever the terminal is opened or closed.
- [x] 4.2 Update `tron/src/input/keyboard.js` to prevent game action keys (WASD, Space, Shift, Q, E) from firing while focus resides inside terminal text inputs while preserving Esc for modal dismissal, verified by an input isolation test.

## 5. End-to-End Integration & Verification

- [x] 5.1 Implement comprehensive test script `tron/test_auth_terminal_integration.js` verifying cold boot identity badge rendering, terminal opening, tab switching, callsign updating, audio triggering, and PointerLock safety.
