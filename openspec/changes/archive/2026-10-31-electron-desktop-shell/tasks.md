# Tasks

## 1. Electron Dependencies & Build Configuration

- [x] 1.1 Install `electron` and `electron-builder` as devDependencies, add `desktop:dev` and `desktop:build` scripts to `package.json`, and verify dependencies resolve without errors.
- [x] 1.2 Configure `electron-builder` settings in `package.json` or `electron-builder.json` targeting Windows (portable and NSIS targets, app ID `com.tron.disc-arena`, product name "TRON :: DISC ARENA"), and verify JSON configuration validity.

## 2. Desktop Shell Architecture & Preload Script

- [x] 2.1 Create `desktop/preload.cjs` utilizing `contextBridge` to expose safe desktop platform flags (`window.isDesktop`) and window focus/blur event listeners to the renderer, and verify the module exports expected bridge APIs.
- [x] 2.2 Create `desktop/main.cjs` with Chromium GPU switches (`enable-gpu-rasterization`, `ignore-gpu-blocklist`), window initialization with borderless fullscreen support, and load path pointing to `index.html`, verifying clean script execution without syntax errors.

## 3. Window Controls, Input Filtering & Quirk Suppression

- [x] 3.1 Implement keyboard interceptor in `desktop/main.cjs` via `webContents.on('before-input-event')` to suppress reload hotkeys (`F5`, `Ctrl+R`, `Ctrl+Shift+R`) and wire `Alt+Enter` and `F11` to toggle fullscreen, verifying keypress events are intercepted.
- [x] 3.2 Implement context-menu and drag-and-drop suppression in the desktop shell so right-click is reserved for shield/parry and canvas/asset dragging is prevented, verifying right-click produces no context menu.
- [x] 3.3 Wire window `blur` and `focus` events to suspend synthesizer audio when minimized or unfocused, verifying audio context state toggles.

## 4. Verification & Distribution Build

- [x] 4.1 Test the development desktop shell by running `npm run desktop:dev`, verifying the game window opens directly to the Tron arena with WebGL rendering and full input control.
- [x] 4.2 Run `npm run desktop:build` and verify `electron-builder` packages the application into a standalone Windows executable in the `dist/` directory.

## Workflow follow-up

- Archive the change after implementation and testing are verified.
- Proceed to Phase 2 (Native local filesystem storage in `%APPDATA%`, display settings UI, and gamepad menu navigation).
