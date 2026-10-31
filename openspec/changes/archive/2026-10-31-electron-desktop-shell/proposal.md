# Proposal: Electron Desktop Shell (Phase 1)

## Why

*Tron Disc Arena* is currently distributed as a browser-hosted WebGL application, requiring players to navigate to a URL, manually enter browser fullscreen, and endure browser-specific behaviors such as context menus on right-click, accidental reload hotkeys (`F5`, `Ctrl+R`), and browser sandbox constraints. 

Packaging the game with Electron provides a dedicated, native desktop executable (`.exe`) that launches instantly into an immersive borderless window, secures reliable hardware-accelerated WebGL performance, disables disruptive browser chrome/shortcuts, and establishes the foundational native shell needed for future phases (offline local storage, display settings, and Steamworks distribution).

## What Changes

- **Electron Runtime Integration**: Add Electron main and preload scripts (`desktop/main.cjs`, `desktop/preload.cjs`) to bootstrap the local game assets into a native Chromium window.
- **Window Management & Display**: Configure default borderless fullscreen mode with fallback windowed toggle (`Alt+Enter` / `F11`), custom title, and official app icon integration.
- **Desktop Input & Browser Quirk Suppression**:
  - Suppress right-click context menus across the game window.
  - Disable browser-specific keyboard shortcuts (`Ctrl+R`, `Ctrl+Shift+R`, `F5`, `Ctrl+W`, `Ctrl+P`).
  - Prevent default HTML drag-and-drop of images, text, and canvas.
- **Application Lifecycle**: Handle application launch, window focus/blur events (pausing/resuming audio or tick rate if configured), and clean process exit on window close.
- **Build & Packaging Configuration**: Add npm scripts (`npm run desktop:dev`, `npm run desktop:build`) and `electron-builder` configuration to bundle the application into a standalone Windows executable.

## Capabilities

### New Capabilities
- `desktop-shell`: Defines desktop application windowing, lifecycle handling, browser quirk suppression, and packaging specifications for native desktop execution.

### Modified Capabilities
<!-- No requirement changes to existing in-game mechanics or storage specs in Phase 1 -->

## Impact

- **New Dependencies**: `electron` and `electron-builder` added as devDependencies in `package.json`.
- **Scripts**: New npm run scripts for launching the Electron development window and generating production distribution packages.
- **Web App Parity**: Web deployment (`index.html` running under an HTTP server or static hosting) remains fully functional; the desktop shell wraps the existing codebase without breaking web compatibility.
