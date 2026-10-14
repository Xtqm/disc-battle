# Tasks

## 1. Storage Schema & Swarm Economy Bridge

- [x] 1.1 Update `src/core/storage/schema.js` and `StorageManager.js` to validate and default `stats.swarmHighestWave` (defaulting to `1` or legacy `stats.highestWave`) and verify with `npm run test:storage`.
- [x] 1.2 Implement `src/modes/SwarmEconomyBridge.js` with base wave yield (15 Bits), compound survival streak scaling, milestone chests on waves 5/10/15/20+, and monotonic high watermark updates to `stats.swarmHighestWave`.
- [x] 1.3 Wire `SwarmEconomyBridge` wave completion handling into `src/entities/Bot.js` and implement unit tests in `test/economy/swarm_economy_bridge.test.js` verifying streak scaling, milestone chests, and monotonic high wave tracking.

## 2. Duel Economy Bridge & Kinetic Floating Neon HUD

- [x] 2.1 Implement kinetic floating neon `+Bits` HUD overlay generator with CSS keyframe upward float and glow animations within `src/ui/hud.js` and verify DOM mounting/cleanup lifecycle.
- [x] 2.2 Implement `src/modes/DuelEconomyBridge.js` providing match victory payouts (50 Bits + XP for AI, 100 Bits + XP for multiplayer), defeat participation XP, and high-skill combat maneuver rewards (+Bits for confirmed parries, multi-ricochet hits, and curve eliminations).
- [x] 2.3 Integrate `DuelEconomyBridge` combat maneuver hooks into `src/entities/Disc.js` and match termination flows into `src/entities/Bot.js`, `src/network/roomManager.js`, and `src/ui/modals.js`.
- [x] 2.4 Create unit tests in `test/economy/duel_economy_bridge.test.js` verifying victory/defeat payouts, combat maneuver criteria, and floating HUD indicator dispatches.

## 3. Dynamic Duel Map Selection Lobby

- [x] 3.1 Implement `src/ui/duel/DuelMapSelector.js` defining unified arena metadata combining Campaign Sector arenas (`arena_grid_01`, `arena_solar_sail`, `arena_sea_sim`, `arena_core_pinnacle`) and Armory Exotic arenas (`arena_zero_g_nexus`, `arena_derez_chasm`).
- [x] 3.2 Build interactive arena cards evaluating `inventory.unlockedMaps` from `StorageManager`, displaying unlocked status, active selection glow, and explicit unlock directives for locked arenas (`DEFEAT GRID 02 ARBITER` or `UNLOCK IN ARMORY`).
- [x] 3.3 Integrate `DuelMapSelector` into Host Match modal and Practice / Solo Duel configuration flows in `src/ui/menus.js` and `src/ui/arenaSelector.js`, updating `state.selectedArenaMap` and applying sector themes.
- [x] 3.4 Create unit tests in `test/ui/duel_map_selector.test.js` verifying card generation, unlock status resolution, directive text rendering, and click selection state.

## 4. Full Verification & Regression Suite

- [x] 4.1 Run all domain test suites (`npm run test:economy`, `npm run test:storage`, `npm run test:armory`, `npm run test:campaign`, `npm run test:gameplay`) and verify 100% test pass rate across the full test suite.
