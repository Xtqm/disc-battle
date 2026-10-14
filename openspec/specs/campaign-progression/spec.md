# campaign-progression Specification

## Purpose

Defines the core campaign registry, Grid metadata, wave compositions, star rating evaluation, monotonic gating, trial lifecycle orchestration, and payout management for Tron Disc Arena (SPEC-CAMP-001 Phase 1).

## Requirements

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

### Requirement: Sector Grid Navigation and Star-Gated Visual Overlays
The system SHALL provide a campaign navigation interface displaying Grids 01 through 04, distinct sector color themes, per-grid and global star progress counters, and lock overlays for star-gated sectors.

#### Scenario: Displaying sector grids with visual themes
- **WHEN** the player accesses the campaign Grid selector interface
- **THEN** the system renders Grids 01 through 04 featuring their respective visual themes (Outlands Cyan, Solar Sail Amber, Simulation Teal, and Core Red).

#### Scenario: Displaying star progress counters
- **WHEN** the Grid selector interface renders
- **THEN** the system displays individual progress counters for each Grid (e.g., `14 / 18 STARS`) and a cumulative campaign total across all sectors.

#### Scenario: Rendering lock overlays on star-gated Grids
- **WHEN** a Grid has an unlock star threshold higher than the player's total earned stars
- **THEN** the system overlays a visual lock banner indicating the required star threshold and the count of stars needed to unlock.

#### Scenario: Navigating to an unlocked Grid
- **WHEN** the player selects an unlocked Grid
- **THEN** the system opens the Level Node Matrix view for that Grid.

### Requirement: Level Node Matrix and Trial Selection View
The system SHALL provide an interactive level node matrix for the active Grid displaying trial nodes (01 through 06-08) terminating in a Rival Arbiter node, with earned stars, high scores, and difficulty tier badges.

#### Scenario: Displaying level nodes and status
- **WHEN** the Level Node Matrix renders for a Grid
- **THEN** the system displays all trial nodes in sequential order leading to the Arbiter boss node, marking each node as Locked, Unlocked, or Cleared.

#### Scenario: Displaying earned star ratings and personal bests
- **WHEN** a level node has previously been cleared
- **THEN** the system displays its earned star rating (1 to 3 stars), best completion time, and best integrity percentage.

#### Scenario: Displaying difficulty tier badges
- **WHEN** a level node is rendered
- **THEN** the system shows its difficulty classification badge (`RECON`, `INTRUDER`, `GUARDIAN`, `ELITE`, or `ARBITER`).

#### Scenario: Selecting an unlocked level node
- **WHEN** a player clicks or taps an unlocked level node
- **THEN** the system opens the Tactical Mission Brief overlay for that level.

#### Scenario: Preventing initiation of locked level nodes
- **WHEN** a player clicks or taps a locked level node
- **THEN** the system inhibits selection and indicates that the preceding trial must be cleared first.

### Requirement: Tactical Pre-Launch Mission Brief Overlay
The system SHALL render a tactical pre-launch mission brief prior to combat detailing trial parameters, hostile wave compositions, and the three-star criteria.

#### Scenario: Displaying mission briefing details
- **WHEN** a player selects an unlocked level node
- **THEN** the system displays the trial title, description, hostile wave count and enemy unit types, and the explicit criteria for Stars 1, 2, and 3.

#### Scenario: Launching trial from mission brief
- **WHEN** the player activates the "LAUNCH TRIAL" control
- **THEN** the system closes the brief overlay, requests pointer lock, initiates the combat countdown, and starts the active trial lifecycle.

#### Scenario: Dismissing mission brief back to node matrix
- **WHEN** the player cancels or closes the mission brief
- **THEN** the system returns to the Level Node Matrix without modifying trial or player state.

### Requirement: Live In-Combat Objective Header and Floating Accrual Indicators
The system SHALL display an in-combat mission objective header tracking remaining hostiles, live integrity status, and mastery criteria, and SHALL render kinetic floating Bit indicators on confirmed eliminations.

#### Scenario: Tracking remaining hostile sub-routines
- **WHEN** hostile units are present or de-rezzed in combat
- **THEN** the header displays the count of remaining active hostiles, updating immediately as bots are eliminated.

#### Scenario: Visualizing live Program Integrity percentage
- **WHEN** the player takes damage or remains at high integrity
- **THEN** the header displays current integrity percentage, rendering in standard cyan while at or above 75% and transitioning to warning amber/red when falling below the Star 2 threshold.

#### Scenario: Monitoring active mastery threshold
- **WHEN** a trial with time or trickshot criteria is active
- **THEN** the header updates the elapsed combat time and displays confirmed curve or ricochet hits against the Star 3 threshold.

#### Scenario: Spawning kinetic floating Bit indicators
- **WHEN** an enemy is de-rezzed via a confirmed curve throw, ricochet bounce, or shield parry
- **THEN** the system spawns an animated floating `+Bits` accrual indicator that ascends and fades out over the combat view.

### Requirement: Post-Trial Victory and Debrief Modal
The system SHALL provide a post-trial debrief modal presenting trial outcome, sequential animated star ignition with audio chimes, itemized Bit and XP reward breakdowns, and direct trial navigation controls.

#### Scenario: Presenting debrief outcome and metrics
- **WHEN** a trial completes successfully
- **THEN** the debrief modal opens, releasing pointer lock and displaying elapsed time, final integrity %, confirmed trickshots, and cleared status.

#### Scenario: Animating sequential star ignition
- **WHEN** the victory debrief renders earned stars (1 to 3)
- **THEN** the system ignites each earned star sequentially with staggered animation delays accompanied by rising procedural audio chimes.

#### Scenario: Itemizing Bit and XP payouts
- **WHEN** trial rewards are presented
- **THEN** the system itemizes the payout breakdown into Base Clear, Integrity Bonus, and Mastery Bonus, displaying total Bits and XP awarded and total campaign stars.

#### Scenario: Advancing via Next Trial control
- **WHEN** the player activates the "NEXT TRIAL" control
- **THEN** the system advances to the next unlocked level, resets arena tiles and Three.js entities, re-captures pointer lock, and starts the next trial countdown.

#### Scenario: Retrying via Retry Trial control
- **WHEN** the player activates the "RETRY TRIAL" control
- **THEN** the system re-initializes the current level, resets arena tiles and combat entities, re-captures pointer lock, and restarts the trial.

#### Scenario: Returning to grid navigation
- **WHEN** the player activates the "RETURN TO GRID" control
- **THEN** the debrief modal dismisses, the simulation remains halted with pointer lock released, and the Level Node Matrix renders.

### Requirement: Dedicated Boss Health Bar HUD
The system SHALL render a dedicated boss telemetry overlay at the top of the combat screen during Arbiter boss encounters displaying boss identity, multi-layer shield status, and remaining core health.

#### Scenario: Displaying Boss Health Bar during Arbiter encounter
- **WHEN** an Arbiter boss level commences
- **THEN** the system displays the Arbiter callsign, remaining shield layer pips, and a prominent segmented core health bar.

#### Scenario: Updating Boss Health Bar on shield and health depletion
- **WHEN** the Arbiter loses a shield layer or sustains core damage
- **THEN** the corresponding shield pip deactivates and the core health bar smoothly animates down to the new percentage.

### Requirement: First-Time Arbiter Defeat Arena Propagation
The system SHALL append the corresponding sector map ID to `inventory.unlockedMaps` in persistent storage upon the first-time defeat of each Grid's Rival Arbiter.

#### Scenario: Defeating Grid 01 Sentinel Arbiter for the first time
- **WHEN** a player completes `level_01_06` for the first time
- **THEN** `arena_grid_01` is appended to `inventory.unlockedMaps` in storage and persisted.

#### Scenario: Defeating Grid 02 Sailmaster Arbiter for the first time
- **WHEN** a player completes `level_02_07` for the first time
- **THEN** `arena_solar_sail` is appended to `inventory.unlockedMaps` in storage and persisted.

#### Scenario: Defeating Grid 03 Leviathan Arbiter for the first time
- **WHEN** a player completes `level_03_07` for the first time
- **THEN** `arena_sea_sim` is appended to `inventory.unlockedMaps` in storage and persisted.

#### Scenario: Defeating Grid 04 Master Control Arbiter for the first time
- **WHEN** a player completes `level_04_08` for the first time
- **THEN** `arena_core_pinnacle` is appended to `inventory.unlockedMaps` in storage and persisted.

#### Scenario: Re-clearing an already cleared Arbiter encounter
- **WHEN** a player completes an Arbiter level that was previously completed
- **THEN** no duplicate map ID is added to `inventory.unlockedMaps`.

### Requirement: Celebratory Arena Unlock Banner Notification
The system SHALL display a celebratory unlock banner in the post-trial debrief modal when a new arena map is unlocked.

#### Scenario: Displaying arena unlock banner on first Arbiter defeat
- **WHEN** a player defeats a Rival Arbiter for the first time
- **THEN** the debrief modal presents a celebratory banner announcing that the sector arena is now deployable in Practice and Duel modes.

#### Scenario: Suppressing unlock banner on repeat clears
- **WHEN** a player clears an Arbiter boss on a repeat attempt
- **THEN** the celebratory arena unlock banner is not displayed.
