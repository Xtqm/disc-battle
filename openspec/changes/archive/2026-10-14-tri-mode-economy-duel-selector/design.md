# Design: Tri-Mode Economic Integration & Dynamic Duel Arena Selector

## Context

Tron Disc Arena possesses a robust economy engine (`EconomyManager.js`), persistent storage architecture (`StorageManager.js`), and cosmetics store (`ArmoryCatalog.js`). However, these systems operate in isolation from the Swarm Defense endurance loop and the Duel Arena modes. In current builds:
- Swarm waves increment `state.wave` and score, but grant no Bits or progression XP.
- AI and multiplayer duel victories terminate without economic rewards, and defeats yield nothing.
- High-skill disc combat maneuvers (shield parries, multi-bank ricochets, curve shot de-rezzes) award raw score but no economy currency or kinetic visual feedback.
- Map selection in duel/practice lobbies is confined to a basic select input that only exposes early Sector themes, without card-based browsing or clear unlocking directives for locked Campaign and Armory Exotic maps.

See `proposal.md` for full motivation.

## Goals / Non-Goals

**Goals:**
- Implement `SwarmEconomyBridge.js` to process wave completions, scale Bits via compound survival streak curves, award milestone chests on waves 5/10/15/20+, and monotonically update `stats.swarmHighestWave`.
- Implement `DuelEconomyBridge.js` to reward AI victories (50 Bits + XP), multiplayer duel victories (100 Bits + XP), and award anti-farming defeat participation XP.
- Trigger real-time kinetic floating neon `+Bits` HUD indicators when executing confirmed disc parries, multi-ricochet strikes (2+ bounces), and curve eliminations.
- Implement `DuelMapSelector.js` providing a visual card-based arena browser that evaluates `inventory.unlockedMaps` from `StorageManager`, supporting both Campaign Sector arenas and Armory Exotic arenas with explicit unlock directives (`DEFEAT GRID 02 ARBITER` or `UNLOCK IN ARMORY`).
- Maintain backward compatibility with legacy `stats.highestWave`, existing save states, and fallback select dropdowns.

**Non-Goals:**
- Creating new 3D arena meshes or rewriting physics shaders (leverages existing `SectorHazardBuilder.js` and `ArmoryCatalog.js` definitions).
- Modifying core weapon damage or health balancing values.
- Introducing pay-to-win mechanics or consumable microtransactions.

## Decisions

### Decision 1: Dedicated Mode Economy Bridges vs Monolithic Game Loop Coupling
- **Choice**: Introduce modular bridge modules `SwarmEconomyBridge.js` and `DuelEconomyBridge.js` rather than embedding payout math directly into `Bot.js` or `main.js`.
- **Rationale**: Isolates economic business logic, milestone math, and telemetry dispatch from high-frequency physics and combat rendering ticks. Simplifies unit testing with mock storage and economy managers.
- **Alternatives Considered**: Direct inline calls to `economyManager.addBits` inside `Bot.js` and `Disc.js`. Rejected due to tight coupling, duplication, and difficulty of unit testing edge cases.

### Decision 2: Compound Survival Streak Mathematical Model
- **Choice**: Wave Bits formula: $\text{Bits}(w) = \text{floor}(15 \times (1 + (w - 1) \times 0.12))$. Wave XP: $\text{XP}(w) = \text{floor}(40 \times (1 + (w - 1) \times 0.15))$.
- **Milestone Chests**: Every 5th wave ($w \pmod 5 === 0$), award bonus chest:
  $$\text{Bonus Bits}(w) = 75 \times \frac{w}{5}, \quad \text{Bonus XP}(w) = 150 \times \frac{w}{5}$$
- **Rationale**: Provides early-game accessibility (15 Bits on wave 1) while compounding reward density for skilled survivalists reaching waves 15–20+, incentivizing endurance without causing hyper-inflation.
- **Alternatives Considered**: Flat 15 Bits/wave (fails to reward late-game survival difficulty) or pure exponential $15 \times 1.25^w$ (causes runaway inflation by wave 15).

### Decision 3: Monotonic High Watermark Synchronization
- **Choice**: When a wave completes, `stats.swarmHighestWave` is updated strictly via $\max(\text{currentWave}, \text{storedRecord})$. Simultaneously update `stats.highestWave` to ensure seamless legacy compatibility.
- **Rationale**: Prevents accidental record regression when playing earlier waves or restarting runs, and satisfies `SPEC-ACHIEVE-001` telemetry contracts.

### Decision 4: Kinetic Floating Neon HUD Component
- **Choice**: Lightweight CSS-animated DOM overlay anchored in the HUD (`#hud` or dynamic `#floatingEconomyLayer`). Spawns a transient badge (`+15 BITS // PARRY`, `+25 BITS // CURVE KILL`) with cyan/gold glow and `@keyframes neonFloatFade` translating upward $-48\text{px}$ and fading over $800\text{ms}$ before removal.
- **Rationale**: Provides visceral, tactile gratification for mastery maneuvers without impacting WebGL render pipeline throughput or requiring Three.js sprite batching.

### Decision 5: Unified Map Registry for Duel Selection
- **Choice**: Unify metadata from `ARENA_MAP_METADATA` (`SectorHazardBuilder`) and `ARMORY_CATALOG.unlockedMaps` into `DuelMapSelector.js`.
  - Campaign Arenas:
    - `arena_grid_01`: Outlands Boot-Sector (Default Unlocked)
    - `arena_solar_sail`: Solar Sail Junction (Unlock: `DEFEAT GRID 02 ARBITER`)
    - `arena_sea_sim`: Sea of Simulation (Unlock: `DEFEAT GRID 03 ARBITER`)
    - `arena_core_pinnacle`: The Core Pinnacle (Unlock: `DEFEAT GRID 04 ARBITER`)
  - Armory Exotic Arenas:
    - `arena_zero_g_nexus`: Zero-G Nexus (Unlock: `UNLOCK IN ARMORY`)
    - `arena_derez_chasm`: De-rez Chasm (Unlock: `UNLOCK IN ARMORY`)
- **Card States**:
  - `UNLOCKED`: Interactive, cyan glow border on hover, selected outline.
  - `LOCKED`: Opacity 0.45, lock icon overlay, red/amber directive tag explaining requirement.
- **Rationale**: Provides a cohesive UX connecting Campaign progression, Armory economy purchases, and multiplayer/practice combat arenas.

## Risks / Trade-offs

- **[Risk] Multiple Rapid Skill Maneuvers Spamming HUD**:
  - *Mitigation*: Limit concurrent floating badges to a pool of at most 4 active badges; queue or discard excess if triggered within the same $100\text{ms}$ window.
- **[Risk] Defeat Farming (Rapid Intentional Suicides for Participation XP)**:
  - *Mitigation*: Participation XP is bounded (35–50 XP) and requires minimum match duration threshold (e.g., at least 8 seconds of combat active) before qualification.
- **[Risk] Desynchronization in Multiplayer Map Selection**:
  - *Mitigation*: Host dictates room arena selection; clients render host-selected arena card. In solo/practice, local player selection persists immediately.

## Migration Plan

1. Save states automatically preserve existing `inventory.unlockedMaps` and `stats.highestWave`.
2. Schema initializes `stats.swarmHighestWave` to `stats.highestWave || 1` if undefined.
3. No breaking changes to existing UI or networking RPC schemas.
