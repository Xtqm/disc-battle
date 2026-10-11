# Proposal

## Why

Tron Disc Arena is an established 3D WebGL combat game featuring complex mechanics including discrete Euler trajectory simulation, Magnus effect disc curving, destructible arena floor grids, autonomous bot combat, real-time multiplayer synchronization via Firebase Firestore, and procedural Web Audio synthesis. However, the project currently lacks durable OpenSpec specifications.

Establishing baseline specifications formalizes the existing system contracts and behavioral boundaries, ensuring that future feature development, performance optimizations, and balance updates have verifiable requirements and acceptance scenarios.

## What Changes

This change captures the existing codebase behaviors into 7 formal OpenSpec capabilities without modifying runtime game code:

- Formalize Identity Disc physics, curved trajectory, specular bounces, rear-strike multipliers, and recall mechanics.
- Formalize player locomotion, aerial mobility, directional dash, resource costs, and holographic shield parry.
- Formalize the 24x24 de-rezzing arena grid, tile states, reconstruction timers, void survival windows, and lip collision boundaries.
- Formalize autonomous bot AI tracking, evasive jumps, counter-catch parry responses, and the failsafe re-arm watchdog.
- Formalize game mode lifecycles for Swarm wave progression and Duel AI victory flow.
- Formalize Firestore multiplayer room matchmaking, decoupled 18 Hz state synchronization, rematch protocols, and unpaused escape handling.
- Formalize zero-asset procedural Web Audio synthesis for core combat SFX.

## Capabilities

### New Capabilities
- `disc-combat`: Flight physics, Euler trajectory prediction parity, Magnus effect curve acceleration, surface ricochets, rear-strike damage multipliers, and disc return.
- `player-character`: Ground locomotion, double jump, coyote time, directional dash, and frontal holographic shield deflection.
- `arena-environment`: 24x24 destructible tile grid, warning strobes, void drop, 12s tile reconstruction, void survival recovery, and lip colliders.
- `combat-ai`: Bot targeting, lateral evasion, predictive jumping, counter-catch interception within 2.2m, and 2.5s disc re-arm watchdog.
- `game-modes`: Solo Swarm wave progression and Solo Duel AI 1v1 match lifecycle.
- `multiplayer-networking`: Firestore room creation/joining via 4-character codes, 18 Hz state sync, client interpolation, rematch voting, and cursor unlock overlay.
- `procedural-audio`: Web Audio API synthesizer generating real-time waveforms for throws, ricochets, parries, collapses, and catches.

### Modified Capabilities
*(None - this establishes initial baseline specifications for the project)*

## Impact

- **Code Impact**: No code modifications; this change establishes foundational specification documents.
- **System Impact**: Establishes formal OpenSpec specifications under `specs/` that will serve as the source of truth for subsequent feature and balance changes.
