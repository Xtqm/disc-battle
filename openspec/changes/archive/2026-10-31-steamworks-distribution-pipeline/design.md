# Design: Steamworks Distribution Pipeline

## Context

Phase 1 established the Electron desktop shell (`desktop/main.cjs`, `desktop/preload.cjs`, `electron-builder.json`), and Phase 2 introduced local `%APPDATA%` profile persistence, audio gain controls, and gamepad UI navigation. 

To prepare *Tron Disc Arena* for Steam release, the application requires platform-level integration with the Steamworks SDK:
1. Initializing the client safely without crashing when Steam is offline, uninstalled, or running in a web browser.
2. Synchronizing achievements between the local `AchievementManager` and the Steam user profile.
3. Transmitting dynamic Rich Presence tokens (e.g. current mode, wave count, sector).
4. Generating an unpacked Steam depot build artifact equipped with `steam_appid.txt`.

## Goals / Non-Goals

**Goals:**
- Provide a modular `desktop/steam.cjs` adapter using `steamworks.js` that abstracts all Steam client API interactions.
- Ensure safe degradation: all Steam calls return gracefully without errors when running offline, in non-Steam environments, or in web browsers.
- Wire `AchievementManager.js` to dispatch achievement unlock events to the desktop Steam bridge.
- Wire game lifecycle transitions in `state.js` / `main.js` to broadcast rich presence status tokens to Steam friends.
- Provide a dedicated npm script (`npm run desktop:steam`) producing an unpacked directory for direct Steam depot ingestion via SteamCMD.

**Non-Goals:**
- Steam Cloud API implementation (Steam Auto-Cloud can directly synchronize `%APPDATA%/TronDiscArena/saves/profile.json` configured in Steamworks partner settings without code changes).
- Steam Workshop integration or Steam Inventory microtransactions.
- Steam P2P matchmaking (existing peer-to-peer / WebSocket architecture handles multiplayer independently).

## Decisions

### 1. Library Selection: `steamworks.js`
- **Choice**: Use `steamworks.js` as the Electron native binding for the Steamworks SDK.
- **Rationale**: `steamworks.js` is actively maintained, features precompiled binaries for Electron ABI versions, eliminates manual node-gyp C++ compilation hurdles on Windows, and provides clean JavaScript APIs for client initialization, achievements, and rich presence.
- **Alternatives Considered**:
  - `greenworks`: Abandoned, incompatible with modern Electron versions.
  - Custom C++ addon: Adds significant toolchain maintenance overhead (Visual Studio C++, Python build steps).

### 2. Default App ID and Environment Configuration
- **Choice**: Default to App ID `480` (Valve's Spacewar test ID) if no `STEAM_APP_ID` environment variable or configuration file is provided.
- **Rationale**: Allows immediate development, QA, and local testing of Steam Overlay, Rich Presence, and API calls prior to receiving an official Steam App ID from Valve. When a commercial App ID is assigned, it can be passed via `process.env.STEAM_APP_ID` or packaging flags without modifying game code.

### 3. IPC Architecture & Safe Web/Offline Degradation
- **Choice**: Structure the bridge across three layers with fail-safe boundaries:
  - `desktop/steam.cjs`: Encapsulates `steamworks.js`. Handles `init(appId)`, `unlockAchievement(id)`, `setRichPresence(key, value)`. Catches all native errors and flags `isInitialized = false`.
  - `desktop/main.cjs`: Registers IPC handlers `steam:init`, `steam:unlock-achievement`, and `steam:set-rich-presence`.
  - `desktop/preload.cjs`: Exposes `window.electronAPI.steam` methods safely to renderer. If Electron is not running (web mode), `window.electronAPI` is undefined and game subsystems fall back to standard local operations.
- **Rationale**: Prevents any native Steam exception from bubbling up to crash the game or disrupt active combat loops.

### 4. Achievement Mapping & Synchronization
- **Choice**: In-game achievement identifiers (e.g. `ach_first_blood`, `ach_swarm_survivor`) map 1:1 to Steam achievement API names.
- **Rationale**: Keeps configuration declarative and synchronized between the Steamworks partner dashboard and `src/achievements/AchievementManager.js`. If an achievement unlock is attempted while Steam is offline, the local reward/toast still succeeds completely.

### 5. Steam Depot Distribution Output
- **Choice**: Configure an npm script `npm run desktop:steam` that invokes `electron-builder --dir --config.win.target=dir` and automatically copies `steam_appid.txt` into the unpacked output directory (`dist/win-unpacked/`).
- **Rationale**: Steam depot publishing tools (SteamCMD) require a raw unpacked directory of binaries and assets rather than an NSIS `.exe` installer wizard.

## Risks / Trade-offs

- **[Risk]** Native dependency ABI mismatch when building or launching under different Node/Electron versions.
  - **Mitigation**: `steamworks.js` includes prebuilt binaries for common Electron versions. We wrap `require('steamworks.js')` in a robust try/catch block so failed native resolution cleanly degrades into an inactive Steam status without crashing.
- **[Risk]** Missing Steam achievement definitions in Spacewar (App ID 480) during local testing.
  - **Mitigation**: `unlockAchievement` calls log an informational debug message if the Steam client rejects an unknown achievement ID, but do not interrupt local game logic or trigger renderer-side errors.
- **[Risk]** Rich Presence spam during rapid game state changes.
  - **Mitigation**: Throttle and deduplicate Rich Presence updates so only distinct status transitions (menu entry, game start, wave increment) trigger Steam API calls.

## Migration Plan

1. Install `steamworks.js` in `package.json`.
2. Implement `desktop/steam.cjs` module.
3. Integrate Steam IPC handlers in `desktop/main.cjs` and `desktop/preload.cjs`.
4. Connect `AchievementManager.js` to dispatch unlock events to the Steam bridge.
5. Connect `main.js` / game modes to update Rich Presence.
6. Add `steam_appid.txt` and `npm run desktop:steam` build scripts.
7. Verify all existing tests pass and game degrades cleanly in browser and offline desktop modes.
