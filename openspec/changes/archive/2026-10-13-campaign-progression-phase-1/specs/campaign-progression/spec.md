# Spec Delta

## Purpose

Defines the core campaign registry, Grid metadata, wave compositions, star rating evaluation, monotonic gating, trial lifecycle orchestration, and payout management for Tron Disc Arena (SPEC-CAMP-001 Phase 1).

## ADDED Requirements

### Requirement: Structured Campaign Grid and Level Metadata
The system SHALL provide an authoritative registry containing structured metadata for campaign Grids 01 through 04 comprising 28 total levels, defining enemy wave compositions, AI difficulty tiers, star thresholds, and base payouts.

#### Scenario: Querying Grid metadata
- **WHEN** a system requests metadata for a valid Grid ID (e.g., Grid 01 Outlands Boot-Sector, Grid 02 Solar Sail Junction, Grid 03 Sea of Simulation, Grid 04 The Core Pinnacle)
- **THEN** the system returns the Grid configuration including display name, description, cumulative star requirement, and ordered level list.

#### Scenario: Querying Level configuration
- **WHEN** a system requests level configuration for a valid level ID within a Grid
- **THEN** the system returns wave compositions, AI difficulty tiers, Star thresholds (Integrity %, target time, curve/ricochet hit count), and base Bit/XP rewards.

#### Scenario: Rejecting invalid Grid or level IDs
- **WHEN** a query requests a non-existent Grid ID or level ID
- **THEN** the system returns null or undefined without throwing an unhandled exception.

### Requirement: Cumulative Star Gating for Grid Unlocks
The system SHALL govern access to campaign Grids based on cumulative star totals earned across all completed levels.

#### Scenario: Unlocking Grid 01 by default
- **WHEN** a new user profile initializes with 0 total stars earned
- **THEN** Grid 01 (Outlands Boot-Sector) is unlocked and its initial level is playable.

#### Scenario: Gating and unlocking Grid 02
- **WHEN** a player accumulates at least 10 cumulative stars across cleared trials
- **THEN** Grid 02 (Solar Sail Junction) transitions from locked to unlocked status.

#### Scenario: Gating and unlocking Grid 03 and Grid 04
- **WHEN** a player accumulates at least 22 cumulative stars for Grid 03 (Sea of Simulation) or 36 cumulative stars for Grid 04 (The Core Pinnacle)
- **THEN** the corresponding Grid transitions to unlocked status.

#### Scenario: Denying access with insufficient stars
- **WHEN** a player attempts to start a trial in a Grid where total earned stars are below the required unlock threshold
- **THEN** the system denies trial initiation and reports the remaining stars required.

### Requirement: Three-Star Trial Telemetry Evaluation Engine
The system SHALL evaluate trial performance telemetry against defined level criteria to determine 1 to 3 Star ratings.

#### Scenario: Earning Star 1 (De-Rez)
- **WHEN** all hostile sub-routines in the trial are eliminated
- **THEN** Star 1 is awarded to the player.

#### Scenario: Earning Star 2 (Integrity)
- **WHEN** the player clears the trial while maintaining at least 75% Program Integrity (HP)
- **THEN** Star 2 is awarded in addition to Star 1.

#### Scenario: Failing Star 2 on low integrity
- **WHEN** the player clears the trial but final Program Integrity is below 75%
- **THEN** Star 2 is not awarded.

#### Scenario: Earning Star 3 via completion time
- **WHEN** the player clears the trial within the target completion time limit
- **THEN** Star 3 is awarded.

#### Scenario: Earning Star 3 via precision throws
- **WHEN** the player clears the trial and achieves at least the required count of confirmed Curve or Ricochet hits
- **THEN** Star 3 is awarded even if the target completion time was exceeded.

#### Scenario: Achieving full three-star rating
- **WHEN** a player eliminates all hostiles, finishes with >= 75% Integrity, and satisfies either the target time or precision throw requirement
- **THEN** the evaluator returns a 3-star rating with individual condition breakdowns.

### Requirement: Active Trial Lifecycle Orchestration
The system SHALL manage the active trial lifecycle across initiation, telemetry capture, successful resolution, and failure states.

#### Scenario: Starting a trial
- **WHEN** `startTrial(levelId)` is invoked for an unlocked level
- **THEN** an active trial session is initialized, capturing the start timestamp, resetting telemetry counters, and locking in the level configuration.

#### Scenario: Recording live gameplay metrics during a trial
- **WHEN** combat events occur (damage taken, enemy de-rezzed, curve throw hit, ricochet hit) and are reported via `recordMetric(type, amount)`
- **THEN** the active trial session accumulates the metrics for post-trial evaluation.

#### Scenario: Completing a trial successfully
- **WHEN** `completeTrial()` is called after eliminating all enemy waves
- **THEN** the session terminates, evaluates telemetry against star criteria, awards payouts, updates persistence, and returns the trial outcome.

#### Scenario: Failing a trial
- **WHEN** `failTrial(reason)` is called due to player de-rez or void plunge
- **THEN** the trial session terminates as a defeat, awarding no completion stars or clear payouts.

### Requirement: Monotonic Star Progression and Level Upgrades
The system SHALL update player star totals monotonically, awarding only delta stars when a player improves an existing level's star record.

#### Scenario: Initial completion of a trial
- **WHEN** a player completes a previously uncompleted level earning N stars (1 to 3)
- **THEN** the level's record is set to N stars and total campaign stars increase by N.

#### Scenario: Replaying with identical or lower star rating
- **WHEN** a player clears a level with fewer or equal stars than their existing high score
- **THEN** the level's saved star rating and the player's total campaign stars remain unchanged.

#### Scenario: Upgrading an existing star record
- **WHEN** a player previously completed a level with 1 star and re-clears the level earning 3 stars
- **THEN** the level record updates to 3 stars and total campaign stars increase by the difference of 2 stars.

### Requirement: Differentiated Economy Payouts for First-Time vs Repeat Clears
The system SHALL award distinct currency and XP payouts depending on whether a clear is a first-time completion or a repeat clear, distinguishing regular trials from Arbiter encounters.

#### Scenario: First-time clear payout for standard trial
- **WHEN** a player completes a standard trial for the first time
- **THEN** the system credits first-time clear rewards (100 to 250 Bits and base XP) via the economy engine.

#### Scenario: First-time clear payout for Arbiter boss
- **WHEN** a player completes an Arbiter boss level for the first time
- **THEN** the system credits premium boss rewards (500 Bits and elite XP) via the economy engine.

#### Scenario: Repeat clear payout for standard trial
- **WHEN** a player completes a previously cleared standard trial
- **THEN** the system credits repeat clear rewards (25 to 50 Bits and reduced XP) via the economy engine.

#### Scenario: Repeat clear payout for Arbiter boss
- **WHEN** a player completes a previously cleared Arbiter boss level
- **THEN** the system credits repeat boss rewards (100 Bits and repeat boss XP) via the economy engine.

### Requirement: Campaign State Persistence
The system SHALL persist completed levels, highest star counts, best trial metrics, unlocked Grids, and cumulative stars to the underlying storage engine.

#### Scenario: Persisting trial completion record
- **WHEN** a trial completes and yields an updated star count or new personal best
- **THEN** the level record and total campaign stars are written to storage with automatic debounced or immediate persistence.

#### Scenario: Restoring campaign progression across sessions
- **WHEN** the campaign system initializes from stored state
- **THEN** all previous level completions, star records, unlocked Grids, and total stars are restored accurately.
