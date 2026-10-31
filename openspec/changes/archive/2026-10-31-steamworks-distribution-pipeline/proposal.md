# Proposal: Steamworks Integration & Distribution Pipeline (Phase 3)

## Why

With Phase 1 delivering the native Electron shell and Phase 2 providing local `%APPDATA%` persistence, in-game settings, and gamepad navigation, *Tron Disc Arena* operates as a complete PC desktop game. To prepare the game for Steam store publication and PC gaming ecosystem integration, Phase 3 implements the Steamworks SDK pipeline.

Integrating Steamworks connects in-game progress with Steam Achievements, exposes live game status via Steam Rich Presence, ensures Steam Overlay compatibility, and provides automated packaging pipelines for Steam depot uploads.

## What Changes

- **Steamworks SDK Client Lifecycle**:
  - Implement a dedicated `desktop/steam.cjs` subsystem using `steamworks.js`.
  - Support automatic initialization using development test App ID 480 (Spacewar) or a custom App ID from environment variables / configuration.
  - Provide safe, zero-crash fallback: if the Steam client is offline or uninstalled, or when running in browser mode, Steamworks calls gracefully no-op.
- **Steam Achievements Synchronization**:
  - Connect `AchievementManager.js` to the Steamworks bridge so every in-game achievement unlock automatically unlocks the corresponding Steam achievement and triggers the native Steam notification banner.
- **Steam Rich Presence**:
  - Transmit real-time player status to Steam friends (e.g., `"In System Menu"`, `"Swarm Mode — Wave 12"`, `"Grid 01 — Mission 4"`, `"1v1 Duel"`).
- **Steam Distribution & Packaging Pipeline**:
  - Add `steam_appid.txt` configuration for local development and testing.
  - Add npm script (`npm run desktop:steam`) producing a clean, unpacked Steam depot directory ready for `steamcmd` ingestion.

## Capabilities

### New Capabilities
- `steamworks-integration`: Defines Steamworks client initialization, safe offline degradation, Rich Presence telemetry dispatch, and Steam depot packaging requirements.

### Modified Capabilities
- `achievement-engine`: Adds requirement for Steamworks Achievement Synchronization.

## Impact

- **Dependencies**: Add `steamworks.js` dependency in `package.json`.
- **Desktop Architecture (`desktop/`)**: Add `desktop/steam.cjs` and expose Steam IPC methods via `desktop/preload.cjs`.
- **Achievements (`src/achievements/`)**: Forward unlock events to the desktop Steam bridge.
- **State & Modes (`src/core/`)**: Emit Rich Presence updates on mode and wave transitions.
- **Non-Breaking Parity**: Standalone web builds and non-Steam desktop executions continue operating with zero degradation when Steam is absent.
