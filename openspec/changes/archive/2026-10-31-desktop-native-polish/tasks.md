# Tasks

## 1. Native Desktop Filesystem Storage

- [x] 1.1 Add IPC handlers (`desktop:save-profile`, `desktop:load-profile`) in `desktop/main.cjs` storing profile state in `app.getPath('userData')/saves/profile.json` and expose them via `desktop/preload.cjs`, verifying file write/read logic.
- [x] 1.2 Update `StorageManager.js` to integrate the desktop storage adapter on initialization and save flushes when running in desktop mode with localStorage fallback, verifying `npm test` passes.

## 2. Centralized Audio Routing & Volume Control

- [x] 2.1 Refactor `src/audio/synth.js` to route audio nodes through master and SFX gain stages with `setMasterVolume()` and `setSFXVolume()` helpers, verifying gain updates scale output volume.
- [x] 2.2 Ensure procedural sound generators in `src/audio/sfx.js` connect into the centralized SFX bus, verifying sound generation produces no audio node errors.

## 3. Settings Management & UI Modal

- [x] 3.1 Create `src/core/settings.js` to manage and persist player preferences (display mode, FPS cap, volumes, graphics quality), verifying state serialization.
- [x] 3.2 Create `src/ui/modals/SettingsModal.js` with neon-styled tabs and sliders for Display, Graphics, and Audio, and attach Settings buttons to main menu and pause screen, verifying modal presentation.
- [x] 3.3 Connect FPS cap settings to the render loop in `src/core/main.js` to throttle Three.js drawing when a cap (60, 120, 144) is active, verifying loop timing.

## 4. Gamepad Menu & Modal Navigation

- [x] 4.1 Implement UI navigation polling in `src/input/gamepad.js` to advance focus on D-pad Up/Down, trigger clicks on Button 0 (A), and dismiss modals on Button 1 (B), verifying input event dispatching.
- [x] 4.2 Add `.gamepad-focus` CSS styling in `index.html` providing a pulsing neon cyan focus ring on active interactive elements, verifying visual contrast.

## 5. Verification & Testing

- [x] 5.1 Run the full test suite (`npm test`) to ensure storage, economy, and gameplay systems pass without regression.
- [x] 5.2 Launch the desktop shell in test mode (`npm run desktop:dev`) to verify settings initialization and clean desktop execution.

## Workflow follow-up

- Archive the change after implementation and verification are complete.
