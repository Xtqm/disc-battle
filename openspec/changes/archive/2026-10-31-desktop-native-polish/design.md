# Design: Desktop Native Polish & Settings (Phase 2)

## Context

Phase 1 established the Electron desktop shell (`desktop/main.cjs`, `desktop/preload.cjs`). Now, the desktop experience requires deep polish: persistent local filesystem storage immune to browser cache clearance, an in-game settings modal for display, audio, and graphics performance, and native gamepad UI navigation.

See `proposal.md` for background and `specs/` for behavioral requirements across `system-settings`, `core-storage`, and `gamepad-input`.

## Goals / Non-Goals

**Goals:**
- Provide native filesystem save operations via Electron IPC (`app.getPath('userData')/saves/profile.json`), with automatic fallback to `localStorage` in browser environments.
- Introduce a centralized `SettingsModal` supporting:
  - Display: Fullscreen/Windowed toggling.
  - Performance: Frame rate capping (60, 120, 144 FPS, Uncapped).
  - Audio: Master and SFX volume controls scaling procedural audio gains.
  - Graphics: Particle density and bloom toggles.
- Enable full gamepad menu and modal navigation via D-pad/analog sticks with glowing neon focus indicators and A/B button confirmation/cancel actions.

**Non-Goals:**
- Steam Cloud synchronization or Steamworks API integration (scoped for Phase 3).
- Custom key remapping / rebinding UI (scoped for future phases).

## Decisions

### 1. File Persistence Bridge via IPC
- **Choice:** Implement `desktop:load-profile` and `desktop:save-profile` in `desktop/main.cjs` using Node's `fs/promises`, saving state to `path.join(app.getPath('userData'), 'saves', 'profile.json')`.
- **Rationale:** Keeps filesystem operations securely contained in the Electron main process, respecting `contextIsolation: true`. `StorageManager.js` invokes these methods when `window.electronDesktop?.isDesktop` is detected.
- **Alternatives Considered:** Direct Node.js `fs` in renderer. Rejected because enabling `nodeIntegration: true` breaks Electron security standards.

### 2. Centralized Audio Gain Routing
- **Choice:** Route all synthesizer effects in `src/audio/synth.js` through a cascaded gain network:
  `[Oscillator] --> [SFX Gain Node] --> [Master Gain Node] --> [AudioContext Destination]`.
- **Rationale:** Allows instantaneous, clickless volume adjustments without altering the individual envelope parameters of each procedural sound effect.
- **Alternatives Considered:** Modifying gain values inside every individual sound generator (`sfx.js`). Rejected due to maintenance overhead and risk of desynchronized volumes.

### 3. Render Loop Frame Rate Throttling
- **Choice:** In `src/core/main.js`, throttle Three.js rendering passes based on `settings.fpsCap`. If `fpsCap !== 'uncapped'`, calculate `minFrameDelta = 1.0 / fpsCap`. Skip renderer draw calls when `delta < minFrameDelta`.
- **Rationale:** Lowers GPU power consumption on high-refresh desktop monitors and provides standard PC graphics options without desynchronizing physics steps.

### 4. Gamepad UI Traversal System
- **Choice:** Create a UI focus manager in `src/input/gamepad.js` that inspects the currently visible modal or menu container, queries focusable interactive buttons (`.btn, .mode-btn, input, button`), and navigates with D-pad Up/Down with debounce. Controller Button 0 (`A`) dispatches `.click()`, and Button 1 (`B`) triggers the back/close handler.
- **Rationale:** Requires no heavy UI framework dependencies; directly animates existing DOM elements with a neon `.gamepad-focus` CSS pulse.

## Risks / Trade-offs

- **[Risk]** Gamepad focus conflicts between game combat controls and UI modals.
  - *Mitigation:* Suspend combat gamepad dispatch (`handleGamepadInput` locomotion and disc throwing) whenever a modal or menu is actively displayed (`state.mode === 'MENU'` or modal visible).
- **[Risk]** First-time migration from `localStorage` to desktop disk.
  - *Mitigation:* On initial desktop launch, if `profile.json` does not exist on disk but `localStorage` contains an existing profile, automatically migrate the `localStorage` payload to disk.
