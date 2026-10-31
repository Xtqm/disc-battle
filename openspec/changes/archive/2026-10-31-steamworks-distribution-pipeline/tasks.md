# Tasks: Steamworks Distribution Pipeline

## 1. Steamworks Native Subsystem & Desktop IPC Bridge

- [x] 1.1 Add `steamworks.js` dependency to `package.json` and verify dependency installation succeeds.
- [x] 1.2 Implement `desktop/steam.cjs` providing safe initialization, App ID resolution (480 Spacewar default or `STEAM_APP_ID`), achievement activation, and Rich Presence setting with fail-safe error handling; verify module loads cleanly via Node.
- [x] 1.3 Register Steam IPC handlers (`steam:init`, `steam:unlock-achievement`, `steam:set-rich-presence`) in `desktop/main.cjs` and expose safe APIs in `desktop/preload.cjs`; verify desktop startup cleanly passes in `ELECTRON_TEST_MODE=1`.

## 2. In-Game Achievement Forwarding & Rich Presence Telemetry

- [x] 2.1 Connect `src/achievements/AchievementManager.js` to forward achievement unlocks to the desktop Steam bridge concurrently with in-game toasts; verify through existing achievement unit tests that local execution remains 100% functional.
- [x] 2.2 Wire game state transitions in `src/core/main.js` to update Steam Rich Presence status (Menu, Swarm Mode Wave, Campaign Sector); verify that state updates dispatch correctly without impacting frame rate or gameplay loops.

## 3. Steam Depot Packaging & App ID Configuration

- [x] 3.1 Add root `steam_appid.txt` and configure `npm run desktop:steam` in `package.json` to build an unpacked Windows directory via `electron-builder --dir`.
- [x] 3.2 Execute `npm run desktop:steam` and verify that `dist/win-unpacked/` is created containing `TRON  DISC ARENA.exe` and `steam_appid.txt`.

## 4. Integration Verification & Regression Testing

- [x] 4.1 Run full automated test suite (`npm test`) to ensure all economy, storage, armory, campaign, and gameplay suites pass without regressions.
- [x] 4.2 Launch desktop shell in test mode to verify non-blocking degradation when Steam is offline, confirming zero uncaught exceptions.
