# Design: Electron Desktop Shell (Phase 1)

## Context

Tron Disc Arena is an ES6 modular WebGL game powered by Three.js, Web Audio synthesizer, and DOM overlays. In a standard browser, players experience window bars, right-click context menus, and risk accidental reloads. Packaging the game with Electron provides a dedicated runtime environment with native OS window controls, direct hardware acceleration, and the foundation for desktop distribution.

See `proposal.md` for overall motivation and `specs/desktop-shell/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Provide a zero-friction Electron desktop wrapper that loads `index.html` and executes the existing WebGL/Three.js engine without breaking web browser compatibility.
- Configure borderless fullscreen launch with hotkey-based fullscreen toggling (`Alt+Enter` / `F11`).
- Suppress unwanted browser defaults (right-click menus, page reloads, text/image dragging).
- Structure the desktop layer cleanly in a dedicated `desktop/` directory (`main.cjs`, `preload.cjs`).
- Configure `electron-builder` to produce a standalone Windows executable (`.exe`).

**Non-Goals:**
- Local filesystem save adapters (`%APPDATA%` file I/O) — scoped for Phase 2.
- In-game graphics resolution / V-Sync settings UI — scoped for Phase 2.
- Steamworks API integration (Steam overlay, achievements, cloud saves) — scoped for Phase 3.

## Decisions

### 1. CommonJS (`.cjs`) for Electron Main Process
- **Choice:** Implement `desktop/main.cjs` and `desktop/preload.cjs` as CommonJS modules.
- **Rationale:** While the game renderer uses browser-standard ES modules (`type="module"`), Electron's main process and tooling ecosystem (`electron-builder`) maintain optimal stability and startup speed with CommonJS.
- **Alternatives Considered:** Native ESM main process (`main.mjs`). Rejected due to occasional bundling friction with `electron-builder` and Node CJS/ESM interop quirks.

### 2. Main Process Input Filtering (`before-input-event`)
- **Choice:** Trap and handle system navigation keys (`F5`, `Ctrl+R`, `Ctrl+Shift+R`, `F11`, `Alt+Enter`) in the main process via `mainWindow.webContents.on('before-input-event', ...)`.
- **Rationale:** Intercepting reload commands at the webContents level ensures reload attempts cannot bypass renderer listeners or reset match state mid-game.
- **Alternatives Considered:** Renderer-only `window.addEventListener('keydown')`. Rejected because system hotkeys like `F5` or `F11` can trigger browser-level actions before renderer scripts receive them.

### 3. Context Isolation & Security Architecture
- **Choice:** Enable `contextIsolation: true`, disable `nodeIntegration: false`, and expose only minimal desktop lifecycle APIs via `desktop/preload.cjs` using `contextBridge`.
- **Rationale:** Follows Electron security best practices, ensuring the renderer remains an isolated WebGL environment safe from arbitrary shell execution while retaining IPC hooks for window state and focus notifications.

### 4. GPU Hardware Acceleration Flags
- **Choice:** Pass Chromium switches (`enable-gpu-rasterization`, `ignore-gpu-blocklist`) in `main.cjs` prior to app ready.
- **Rationale:** Guarantees discrete GPU engagement on dual-GPU laptops and maximizes Three.js 60 FPS WebGL rendering stability.

## Risks / Trade-offs

- **[Risk]** Package Size: Bundling Electron results in a ~120–150 MB distribution build.
  - *Mitigation:* This is standard for modern desktop game packaging (e.g. *Vampire Survivors*, *CrossCode*); compression via NSIS and UPX keeps download size manageable.
- **[Risk]** Relative Path Resolution: When loaded via `loadFile('index.html')`, relative asset paths (textures, audio modules, vendor Three.js) must resolve consistently.
  - *Mitigation:* The existing project uses relative paths (`./src/core/main.js`, `../../vendor/three.module.js`) which resolve natively in Chromium file protocols.
