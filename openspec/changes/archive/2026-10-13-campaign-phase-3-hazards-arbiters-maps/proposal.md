# Proposal

## Why

Phase 1 established the authoritative campaign data registry, deterministic 3-star scoring engine, and monotonic progression. Phase 2 delivered the interactive Sector Grid Selector, Tactical Mission Brief, in-combat objective tracker, and post-trial debrief modal.

However, campaign battles currently execute inside a static visual arena with standard bot behaviors across all 4 Grids. To realize the distinct identity and escalating tactical challenge envisioned in SPEC-CAMP-001 Phase 3, each Grid requires unique sector environmental hazards, dedicated Rival Arbiter boss encounters with multi-layer shields and advanced combat AI, and an arena propagation pipeline that permanently unlocks defeated sectors as deployable arenas in Practice and Duel modes.

## What Changes

- **Sector Themes & Environmental Hazards (`src/arena/hazards/SectorHazardBuilder.js`)**:
  - Grid 01 (Outlands Boot-Sector): Cyan neon theme, reflective slate floor, static ricochet pillars for angle shots.
  - Grid 02 (Solar Sail Junction): Amber/orange lattice, vertical jump pads for vertical mobility, elevated turret platforms.
  - Grid 03 (Sea of Simulation): Deep cobalt/violet theme, oscillating forcefield barriers, timed laser gates.
  - Grid 04 (The Core Pinnacle): Crimson/gold theme, lethal floor de-rez void zones requiring dash/jump traversal.
- **Rival Arbiter Boss AI (`src/ai/ArbiterBossController.js`)**:
  - Specialized boss AI controller for final nodes (`level_01_06`, `level_02_07`, `level_03_07`, `level_04_08`).
  - Multi-layer Rival Shield mechanic absorbing hits before exposing Arbiter core.
  - Aggressive curve-disc volley attacks and reactive dash-evasion routines.
  - Dedicated Boss Health Bar HUD overlay tracking multi-layer shield integrity and core HP.
- **Arena Propagation Pipeline**:
  - On first-time defeat of each Grid's Rival Arbiter, automatically append the sector's map ID (`arena_grid_01`, `arena_solar_sail`, `arena_sea_sim`, `arena_core_pinnacle`) to `inventory.unlockedMaps` in `StorageManager`.
  - Schema extension for `inventory.unlockedMaps` with default map unlock (`arena_grid_01`).
  - Celebratory unlock banner notifying the player that the arena is now deployable in Practice and Duel modes.
  - Integration with Practice and Duel mode map selection.

## Capabilities

### New Capabilities

*(None. All new requirements extend existing system capability domains).*

### Modified Capabilities

- `arena-environment`: Add requirements for sector-specific visual themes and interactive environmental hazards (static ricochet pillars, vertical jump pads, turret platforms, oscillating forcefield barriers, timed laser gates, and lethal floor de-rez void zones).
- `combat-ai`: Add requirements for Rival Arbiter boss AI behavior, multi-layer Rival Shield mechanics, aggressive curve-disc volleys, and reactive dash-evasion routines.
- `campaign-progression`: Add requirements for Rival Arbiter boss encounter lifecycle, dedicated Boss Health Bar HUD, first-time Arbiter defeat map propagation pipeline, and celebratory unlock banner notifications.
- `core-storage`: Add requirement for `inventory.unlockedMaps` schema support, default state initialization, and persistence synchronization.

## Impact

- **Arena & Physics**: `src/arena/hazards/SectorHazardBuilder.js`, `src/entities/Arena.js`, `src/physics/collision.js` interact with jump pads, forcefields, laser gates, and void zones.
- **AI & Combat**: `src/ai/ArbiterBossController.js`, `src/entities/Bot.js`, `src/entities/Disc.js` updated for multi-layer shield mitigation, curve volleys, and boss state transitions.
- **UI & HUD**: Dedicated Boss Health Bar component in `src/ui/campaign/CampaignHUD.js` or dedicated HUD module, plus celebratory unlock banner in `TrialDebriefModal.js` or UIManager.
- **Storage & Economy**: `src/core/storage/schema.js`, `StorageManager.js` updated to include `inventory.unlockedMaps`.
- **Game Modes**: Practice and Duel mode selection menus in `src/ui/menus.js` updated to allow choosing unlocked sector arenas.
