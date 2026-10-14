# Design

## Context

Phase 1 established campaign metadata, deterministic star evaluation, and monotonic persistence (`CampaignRegistry.js`, `StarEvaluator.js`, `CampaignManager.js`). Phase 2 added sector navigation, mission briefing, tactical HUD, and debrief modals.

Currently, all combat trials execute in the standard monolithic 24x24 arena grid defined in `src/entities/Arena.js`, with standard bot AI logic in `src/entities/Bot.js`. For Phase 3 (SPEC-CAMP-001), the system must support sector-specific visual palettes and physical hazards, specialized Arbiter boss AI with multi-layer shields, and a propagation pipeline that unlocks defeated arenas for Practice and Duel modes.

## Goals / Non-Goals

**Goals:**
- Implement modular sector theming and environmental hazards in `src/arena/hazards/SectorHazardBuilder.js` covering Grids 01 through 04.
- Implement `src/ai/ArbiterBossController.js` encapsulating multi-layer Rival Shields, curve-disc volleys, dash-evasion routines, and combat phase management.
- Implement a dedicated Boss Health Bar HUD overlay in `src/ui/campaign/CampaignHUD.js` tracking boss identity, shield pips, and core health.
- Implement the arena propagation pipeline in `CampaignManager.js` and `StorageManager.js` appending unlocked map IDs to `inventory.unlockedMaps` upon first-time Arbiter defeat.
- Present a celebratory unlock banner in `TrialDebriefModal.js` notifying the player of newly deployable arenas.
- Integrate unlocked arena selection into Practice and Duel mode setup in `src/ui/menus.js`.

**Non-Goals:**
- Redesigning standard bot AI routines for non-boss trials.
- Adding arbitrary custom map editors or user-generated arena builders.
- Altering multiplayer networking protocols (multiplayer uses standard duel arenas).

## Decisions

### 1. Modular SectorHazardBuilder vs Hardcoding into Arena.js
- **Decision**: Create an independent builder module `src/arena/hazards/SectorHazardBuilder.js` that attaches to and configures the Three.js scene and collision structures, rather than bloating `Arena.js`.
- **Rationale**: Keeps `Arena.js` focused on core 24x24 tile physics and collapse/regeneration lifecycles while allowing clean sector swapping, setup, and teardown.
- **Alternatives Considered**: Modifying `Arena.js` directly with conditional branches for each Grid. Rejected because it would tightly couple campaign sector logic with generic arena physics.

### 2. ArbiterBossController as Autonomous Subsystem
- **Decision**: Implement `src/ai/ArbiterBossController.js` as an encapsulated class that attaches to boss bot entities, managing shield health layers, attack cooldowns, curve volley sequences, and evasion impulses.
- **Rationale**: Isolates complex multi-layer shield mechanics and curve projectile patterns from standard swarm/recon bot logic in `Bot.js`. `Bot.js` delegates update loops to `ArbiterBossController` when `f.isArbiter` or `f.bossController` is active.
- **Alternatives Considered**: Embedding all Arbiter routines directly in `Bot.js` `updateDuelFoe`. Rejected because `updateDuelFoe` is already over 300 lines and mixing tier logic with campaign boss mechanics increases regression risks.

### 3. Multi-Layer Rival Shield Mechanics
- **Decision**: Represent Rival Shields as an integer layer count (e.g., 2 layers for Grid 01, 3 for Grids 02-03, 4 for Grid 04). Each projectile hit that connects while shields > 0 consumes exactly 1 shield layer, triggers a defensive deflection particle burst, and shields core HP. A recovery timer (6.0s) recharges 1 layer if the boss avoids damage.
- **Rationale**: Provides clear tactical feedback for players. Multi-layer shields demand continuous pressure and precision ricochet/curve attacks to break through before dealing core damage.
- **Alternatives Considered**: Floating-point shield health pool. Rejected because discrete visual pips offer clearer feedback and match the high-readability Tron arcade aesthetic.

### 4. Storage Schema and First-Clear Arena Propagation
- **Decision**: Extend `inventory.unlockedMaps` in `src/core/storage/schema.js` with default `['arena_grid_01']`. In `CampaignManager.completeTrial()`, detect if `levelConfig.type === 'arbiter'` and `firstTimeClear === true`. If so, append the sector's map ID (`arena_grid_01`, `arena_solar_sail`, `arena_sea_sim`, `arena_core_pinnacle`) to `inventory.unlockedMaps`.
- **Rationale**: Leverages existing atomic keypath mutation in `StorageManager.set('inventory.unlockedMaps', ...)`, ensuring seamless persistence and cross-session restoration.
- **Alternatives Considered**: Storing unlocked maps in `campaign.unlockedMaps`. Rejected to maintain consistency with `inventory` containing cosmetics, discs, and playable assets.

### 5. Celebratory Banner & Menu Propagation
- **Decision**: Deliver unlock notifications directly within the victory debrief modal (`TrialDebriefModal.js`) via a high-visibility animated banner, and expose unlocked arenas in `menus.js` for Practice and Solo Duel modes.
- **Rationale**: Gives players immediate gratification upon completing a grueling Arbiter boss fight, and provides immediate replayability in standalone duel modes.

## Risks / Trade-offs

- **[Performance of dynamic hazard colliders and particle effects]** → Keep collision checks bounded to active hazard bounding volumes; pool laser and jump pad particles.
- **[Jump pad and void pit physics conflicts]** → Jump pad applies vertical impulse `vy = 16` directly to player/entity velocity vector, seamlessly integrating with existing jump/gravity physics in `Player.js` and `Bot.js`.
- **[Save state backward compatibility]** → Storage schema validation defaults `inventory.unlockedMaps` to `['arena_grid_01']` if missing, preventing errors on existing legacy save files.
