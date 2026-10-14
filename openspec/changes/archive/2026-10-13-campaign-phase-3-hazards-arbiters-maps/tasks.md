# Tasks

## 1. Storage Schema & Propagation Foundation

- [x] 1.1 Extend `src/core/storage/schema.js` to support `inventory.unlockedMaps` with default `['arena_grid_01']`, updating `createDefaultSaveState` and schema validators. Verify by running schema assertions in a dedicated test script.
- [x] 1.2 Update `src/campaign/CampaignManager.js` in `completeTrial` to detect first-time Arbiter boss clears, map level IDs (`level_01_06`, `level_02_07`, `level_03_07`, `level_04_08`) to map IDs (`arena_grid_01`, `arena_solar_sail`, `arena_sea_sim`, `arena_core_pinnacle`), and append them to `inventory.unlockedMaps`. Verify by asserting state persistence on first clear vs repeat clear.

## 2. Sector Themes & Environmental Hazards

- [x] 2.1 Create `src/arena/hazards/SectorHazardBuilder.js` providing sector visual theme palettes (Grid 01 Cyan slate, Grid 02 Amber lattice, Grid 03 Simulation violet, Grid 04 Core crimson/gold) and arena floor/wall material builders. Verify theme palette exports and Three.js material configurations.
- [x] 2.2 Implement environmental hazard modules in `SectorHazardBuilder.js`: static ricochet pillars, vertical jump pads with impulse velocity, elevated platforms, oscillating forcefields, timed laser gates, and lethal floor de-rez void zones. Verify hazard collision bounds, state cycles, and update loops in unit tests.
- [x] 2.3 Integrate `SectorHazardBuilder` lifecycle (`buildSectorHazards`, `teardownSectorHazards`, `updateSectorHazards`) into arena reset routines in `src/entities/Arena.js` and trial launches in `CampaignHUD.js`. Verify clean setup, frame updates, and teardown upon round reset.

## 3. Rival Arbiter Boss AI & Multi-Layer Shields

- [x] 3.1 Create `src/ai/ArbiterBossController.js` implementing boss entity state machines, multi-layer Rival Shield tracking, shield hit consumption, and timed shield recharge intervals. Verify shield absorption and damage isolation via unit tests.
- [x] 3.2 Implement offensive routines in `ArbiterBossController.js` supporting multi-disc curve volleys with alternating lateral spin and tier-scaled projectile speeds. Verify volley generation and curve trajectory parameters.
- [x] 3.3 Implement reactive dash-evasion routines in `ArbiterBossController.js` and hook boss updates into `src/entities/Bot.js` and projectile collision in `src/entities/Disc.js`. Verify boss evasion triggers and disc impact resolution.

## 4. Boss Health Bar HUD & Celebratory Debrief Banner

- [x] 4.1 Implement dedicated Boss Health Bar HUD overlay in `src/ui/campaign/CampaignHUD.js` displaying boss identity, interactive shield layer pips, and segmented core health bar. Verify HUD DOM element creation and reactive damage updates.
- [x] 4.2 Update `src/ui/campaign/TrialDebriefModal.js` to render a celebratory unlock banner when `newlyUnlockedMap` is present in the trial outcome payload, accompanied by audio chimes. Verify unlock banner visibility on first clear and absence on repeat clears.

## 5. Practice & Duel Arena Propagation & Integration Verification

- [x] 5.1 Update Practice and Solo Duel configuration in `src/ui/menus.js` to read `inventory.unlockedMaps` from `StorageManager` and provide arena selection controls. Verify menu option rendering and arena skin activation.
- [x] 5.2 Create comprehensive test suite `tron/test_campaign_phase3.js` verifying hazards, boss AI, shield mechanics, storage propagation, and HUD/modal components. Verify by executing `node tron/test_campaign_phase3.js` with 100% test success.

## Workflow follow-up

- Archive the change after implementation and verification are complete.
- Verify the archived result and updated main specs.
