# Proposal: Phase 1: Campaign Data Registry, Star Gating & Objective Evaluator (SPEC-CAMP-001)

## Why

Following the completion of the baseline storage (`SPEC-ECON-001` Phase 1) and economy progression engines (`SPEC-ECON-001` Phase 2), Tron Disc Arena currently lacks structured single-player campaign progression, objective evaluations, and star-gating mechanics. Phase 1 of `SPEC-CAMP-001` establishes the authoritative campaign data registry across 4 major Grids (28 levels), a pure star evaluation engine, and a campaign manager orchestrating trial lifecycles, monotonic star improvements, distinct first-time vs repeat rewards, and persistent storage synchronization.

## What Changes

- **Campaign Data Registry (`src/campaign/CampaignRegistry.js`)**:
  - Define structured metadata for 4 distinct campaign Grids spanning 28 levels:
    - **Grid 01: Outlands Boot-Sector** (6 levels): Tutorial and basic combat routines, introductory light-cycle sector aesthetics, ending in Sentinel Arbiter.
    - **Grid 02: Solar Sail Junction** (7 levels): Intermediate multi-lane hazards, high-speed flankers, ricochet testing grounds, ending in Sailmaster Arbiter. Unlock requirement: 10 Stars.
    - **Grid 03: Sea of Simulation** (7 levels): Advanced void platforming, shifting floor hazards, aggressive hunter AI swarms, ending in Subroutine Sovereign Arbiter. Unlock requirement: 22 Stars.
    - **Grid 04: The Core Pinnacle** (8 levels): Expert void arenas, elite dual-disc combatants, tactical cover masters, ending in Master Control Arbiter. Unlock requirement: 36 Stars.
  - Specify per-level parameters: enemy wave compositions, AI difficulty tiers, Star thresholds (Integrity %, target completion time, curve/ricochet count), and base Bit/XP rewards.
  - Define grid unlock thresholds and query helpers (`getGrid`, `getLevel`, `getAllGrids`, `getLevelsForGrid`, `isGridUnlocked`, `getNextLevel`).
- **Star Objective Evaluator (`src/campaign/StarEvaluator.js`)**:
  - Pure deterministic mathematical engine calculating 1 to 3 Stars from trial telemetry against level thresholds:
    - **Star 1 (De-Rez)**: All hostile sub-routines eliminated.
    - **Star 2 (Integrity)**: Clear trial with $\ge 75\%$ Program Integrity (HP).
    - **Star 3 (Mastery)**: Clear trial within target time limit OR achieve $\ge N$ confirmed Curve/Ricochet hits.
  - Provide structured result payloads with boolean breakdowns per star condition, earned star count, and detailed metrics.
- **Campaign Manager Engine (`src/campaign/CampaignManager.js`)**:
  - Manage in-flight trial state and lifecycle transitions: `startTrial(levelId)`, `recordMetric(type, amount)`, `completeTrial()`, and `failTrial(reason)`.
  - Calculate monotonic Star upgrades: only increment total stars by the delta when a player beats their previous star rating on a level (e.g. improving from 1 to 3 stars awards +2 delta stars).
  - Enforce tiered economy payouts integrated with `EconomyManager`:
    - First-time clear rewards: 100–250 Bits for regular trials, 500 Bits for Arbiter boss levels.
    - Repeat clear rewards: 25–50 Bits for regular trials, 100 Bits for Arbiter boss levels.
    - Appropriate XP payout distribution for both trial tiers.
  - Persist level records (completion status, best star rating, best completion time, best integrity), total stars, and unlocked grids into `StorageManager`.
- **Module Re-exports & Test Infrastructure**:
  - Export campaign classes and factory singletons for modular consumption.
  - Create comprehensive automated test suite `tron/test_campaign_phase1.js` (and `test/campaign_phase1.test.js`) verifying registry integrity, star evaluation logic, monotonic progression, and payout atomicity.

## Capabilities

### New Capabilities
- `campaign-progression`: Authoritative campaign data registry (Grids 01-04, 28 levels), star rating objective evaluator (De-Rez, Integrity, Mastery), trial lifecycle state machine, monotonic star gating, tiered economy payouts, and persistence integration for Tron Disc Arena (SPEC-CAMP-001 Phase 1).

### Modified Capabilities
*(None — existing capabilities retain their requirements contract; `core-storage` and `core-economy` provide storage and currency backbones without modifying their existing requirement specifications).*

## Impact

- **New Files**:
  - `src/campaign/CampaignRegistry.js`: Grid metadata, wave compositions, level difficulty tiers, and unlock rules.
  - `src/campaign/StarEvaluator.js`: Pure evaluation logic calculating 1-3 stars from trial telemetry.
  - `src/campaign/CampaignManager.js`: Campaign lifecycle manager, trial telemetry coordinator, monotonic star tracker, and economy/storage coordinator.
  - `tron/test_campaign_phase1.js` (and `test/campaign_phase1.test.js`): Automated unit and integration test suite.
- **APIs & Integration**:
  - Consumes `StorageManager` (`get`, `set`, `save`) for persisting `campaign.levelRecords`, `campaign.starsEarned`, `campaign.unlockedGrids`, and `campaign.completedNodes`.
  - Consumes `EconomyManager` (`awardBits`, `awardXP`) for awarding first-time vs repeat payouts upon trial completion.
- **Runtime Dependencies**: Zero external dependencies.
