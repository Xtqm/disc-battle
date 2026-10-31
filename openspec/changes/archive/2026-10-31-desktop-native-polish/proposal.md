# Proposal: Desktop Native Polish & Settings (Phase 2)

## Why

With Phase 1 delivering a native Electron desktop shell, *Tron Disc Arena* now runs as a standalone desktop executable. However, player save state remains bound to browser `localStorage` rather than standard OS user data directories (`%APPDATA%`), players have no in-game interface to tune display resolution, frame rate limits, or audio volumes, and game menus still require a mouse rather than supporting gamepads.

Phase 2 introduces native OS filesystem persistence, a neon-styled Settings modal for display, performance, and audio tuning, and gamepad menu navigation—transforming the desktop build into a fully featured PC game.

## What Changes

- **Desktop Filesystem Persistence**:
  - Implement native file I/O in the Electron main/preload bridge saving to `%APPDATA%\TronDiscArena\saves\profile.json`.
  - Extend `StorageManager.js` with a desktop storage adapter that automatically selects filesystem persistence when running in desktop mode while preserving `localStorage` in browser environments.
  - Ensure emergency flushes and backup creation write to disk synchronously on exit.
- **System Settings Configuration & Modal**:
  - Create a new neon `SettingsModal` accessible from both the main title menu and the in-game pause screen.
  - **Display & Performance**: Toggles for Fullscreen/Windowed, frame rate limits (60, 120, 144 FPS, Uncapped), and graphics fidelity (bloom intensity, particle spark count).
  - **Audio Controls**: Sliders for Master Volume (0–100%) and SFX/Synth Volume (0–100%), with live synthesizer gain updating.
- **Gamepad Menu Navigation**:
  - Enable D-pad and left analog stick navigation across menu buttons, modal selections, and armory catalog items with visible glowing neon focus states.
  - Map controller Button 0 (A / Cross) to confirm/activate and Button 1 (B / Circle) to dismiss/back.

## Capabilities

### New Capabilities
- `system-settings`: Defines user-configurable audio volumes, display modes, frame rate caps, and graphics presets with persistent configuration state.

### Modified Capabilities
- `core-storage`: Adds native desktop filesystem persistence adapter requirements for local OS disk I/O.
- `gamepad-input`: Adds gamepad menu and modal focus navigation requirements.

## Impact

- **Electron Bridge (`desktop/`)**: Expose secure IPC channels for reading and writing save files within `app.getPath('userData')`.
- **Storage Layer (`src/core/storage/`)**: Integrate disk read/write hooks into `StorageManager.js`.
- **UI & Menus (`src/ui/`)**: Introduce `SettingsModal.js`, hook settings button into main menu and pause menu, and add CSS focus rings for controller navigation.
- **Audio Pipeline (`src/audio/`)**: Connect master/SFX gain controls to procedural synth nodes in `synth.js`.
- **Input Pipeline (`src/input/`)**: Add menu navigation event dispatching to `gamepad.js`.
- **Web App Parity**: Pure browser play remains fully supported; non-desktop environments continue using `localStorage` and default settings.
