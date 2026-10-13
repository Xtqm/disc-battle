# Design: Phase 1 Campaign Data Registry, Star Gating & Objective Evaluator (SPEC-CAMP-001)

## Context

Tron Disc Arena already possesses a solid foundation for persistence via `StorageManager` (`SPEC-ECON-001` Phase 1) and progression mechanics via `EconomyManager` (`SPEC-ECON-001` Phase 2). The default state schema (`TronSaveState`) provisions baseline campaign fields:
- `campaign.completedNodes`: array of completed level identifiers
- `campaign.unlockedNodes`: array of accessible level identifiers
- `campaign.currentNode`: active selected level
- `campaign.starsEarned`: cumulative star rating
- `campaign.chapter`: active grid/chapter index

Phase 1 introduces the complete data architecture and lifecycle management for the single-player campaign without modifying underlying combat rendering or Three.js scene code. It bridges storage, economy, and combat telemetry into a deterministic, testable progression pipeline.

See [proposal.md](proposal.md) for motivation and [specs/campaign-progression/spec.md](specs/campaign-progression/spec.md) for requirement specifications.

## Goals / Non-Goals

**Goals:**
- Implement `CampaignRegistry.js` defining all 4 Grids across 28 levels with enemy wave compositions, difficulty tiers, Star thresholds, and tiered Bit/XP rewards.
- Define cumulative Star requirements for Grids: Grid 01 (0 Stars), Grid 02 (10 Stars), Grid 03 (22 Stars), Grid 04 (36 Stars).
- Implement `StarEvaluator.js` as a pure, deterministic engine scoring 1 to 3 Stars across Star 1 (De-Rez), Star 2 (Integrity $\ge 75\%$), and Star 3 (Mastery: time limit OR precision curve/ricochet hits).
- Implement `CampaignManager.js` to manage trial state (`startTrial`, `recordMetric`, `completeTrial`, `failTrial`), monotonic Star upgrades, differentiated first-time vs repeat economy payouts, and persistence to `StorageManager`.
- Provide complete automated unit and integration tests covering registry data integrity, star evaluation math, trial lifecycles, and storage persistence.

**Non-Goals:**
- UI campaign map navigation, node graph rendering, or modal dialogues (scheduled for UI integration in subsequent phases).
- Three.js enemy spawning hooks and spatial spawn animations (handled by game loop orchestrator in combat integration).
- Custom shader visual assets for new Grids (handled by graphics pipeline).

## Decisions

### 1. Separation into Registry, Pure Evaluator, and Stateful Manager
- **Decision:** Split campaign progression into three decoupled modules:
  1. `CampaignRegistry`: Immutable configuration metadata and query methods.
  2. `StarEvaluator`: Pure function / stateless class evaluating metrics against level criteria.
  3. `CampaignManager`: Stateful orchestrator managing in-flight trial sessions, emitting events, interfacing with `StorageManager` and `EconomyManager`.
- **Rationale:** Keeps telemetry scoring 100% deterministic and testable without mock timers, while isolating configuration data from runtime state.
- **Alternatives Considered:** Monolithic `CampaignManager` containing embedded level data and evaluation logic (rejected: hard to test, poor maintainability as grid count expands).

### 2. Campaign Level Structure and Progression Hierarchy
- **Decision:** 4 Grids with 28 levels:
  - **Grid 01: Outlands Boot-Sector** (6 levels): Levels `level_01_01` to `level_01_06` (Arbiter: Sentinel Arbiter). Star unlock: 0.
  - **Grid 02: Solar Sail Junction** (7 levels): Levels `level_02_01` to `level_02_07` (Arbiter: Sailmaster Arbiter). Star unlock: 10.
  - **Grid 03: Sea of Simulation** (7 levels): Levels `level_03_01` to `level_03_07` (Arbiter: Subroutine Sovereign Arbiter). Star unlock: 22.
  - **Grid 04: The Core Pinnacle** (8 levels): Levels `level_04_01` to `level_04_08` (Arbiter: Master Control Arbiter). Star unlock: 36.
  Total maximum stars across the campaign: $28 \times 3 = 84$ Stars.
- **Rationale:** Provides clear pacing with escalating star requirements and distinct Arbiter encounters capping each Grid.
- **Alternatives Considered:** Dynamic procedural levels (rejected: handcrafted levels provide structured tutorials, difficulty curves, and repeatable speedrun challenges).

### 3. Star Evaluation Logic & Precision Metric Aggregation
- **Decision:**
  - **Star 1 (De-Rez)**: Unconditionally requires eliminating all hostiles (`cleared === true`). If the player is de-rezzed, 0 stars are awarded.
  - **Star 2 (Integrity)**: Awarded if `cleared === true` AND player end-of-trial integrity is $\ge 75\%$ (`finalHp / maxHp >= 0.75`).
  - **Star 3 (Mastery)**: Awarded if `cleared === true` AND either:
    1. `elapsedSeconds <= targetTimeSeconds` OR
    2. `confirmedPrecisionHits >= targetPrecisionHits` (where precision hits include both confirmed ricochet hits and curved disc hits).
- **Rationale:** Giving players two paths to Star 3 accommodates different playstyles (aggressive fast clear vs calculated tactical precision throws).
- **Alternatives Considered:** Requiring both speed AND precision simultaneously (rejected: overly punishing for an initial 3-star rating).

### 4. Monotonic Star Delta Accounting
- **Decision:**
  - The manager maintains a record per level: `levelRecords[levelId] = { stars, bestTime, bestIntegrity, completed, clears }`.
  - When a trial completes:
    $$\Delta\text{Stars} = \max(0, \text{newStars} - \text{previousStars})$$
    $$\text{totalStars} \leftarrow \text{totalStars} + \Delta\text{Stars}$$
    $$\text{levelRecord.stars} \leftarrow \max(\text{previousStars}, \text{newStars})$$
- **Rationale:** Ensures total stars never regress if a player replays a level with a lower score.

### 5. First-Time vs Repeat Payout Strategy
- **Decision:**
  - Standard Trials:
    - First clear: 100 to 250 Bits, 150 to 500 XP.
    - Repeat clear: 25 to 50 Bits, 25 to 100 XP.
  - Arbiter Boss Encounters:
    - First clear: 500 Bits, 500 to 1000 XP.
    - Repeat clear: 100 Bits, 100 to 200 XP.
  - Payouts are dispatched through `EconomyManager.awardBits(amount, source)` and `EconomyManager.awardXP(amount, source)` with distinct audit sources (`campaign_first_clear_${levelId}`, `campaign_repeat_clear_${levelId}`).
- **Rationale:** Rewards progression milestones heavily while maintaining a healthy grinding economy for cosmetics and upgrades without hyperinflation.

### 6. Storage Schema Integration
- **Decision:** Store campaign data within the existing `campaign` namespace in `TronSaveState`:
  - `campaign.starsEarned`: cumulative integer total.
  - `campaign.completedNodes`: array of unique completed level IDs.
  - `campaign.unlockedNodes`: array of unlocked level IDs.
  - `campaign.unlockedGrids`: array of unlocked grid IDs (`['grid_01', 'grid_02', ...]`).
  - `campaign.levelRecords`: dictionary mapping level ID to `{ stars, bestTime, bestIntegrity, clears }`.
- **Rationale:** Seamlessly integrates with the existing `StorageManager` keypath engine (`set('campaign.levelRecords', ...)`).

## Risks / Trade-offs

- **[Risk] State Desynchronization between `starsEarned` and individual level records** → Mitigation: `CampaignManager` computes `recalculateTotalStars()` on initialization or repair if the stored total differs from the sum of `levelRecords` values.
- **[Risk] In-flight trial abandonment when page refreshes** → Mitigation: `_activeTrial` is transient in-memory state; abandoned trials do not alter persistent state or deduct resources.
- **[Risk] Fractional HP causing rounding discrepancies for Star 2** → Mitigation: `StarEvaluator` compares with floating tolerance $\ge 0.7499$ or rounds integrity percentage.

## Migration Plan

1. Verify existing default save state loads cleanly without errors.
2. Initialize default `campaign.levelRecords = {}` and `campaign.unlockedGrids = ['grid_01']` if missing.
3. Zero breaking changes to `StorageManager` or `EconomyManager`.
