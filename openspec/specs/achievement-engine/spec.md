# achievement-engine Specification

## Purpose

Establishes the authoritative launch achievement matrix registry, combat telemetry mutation bus, retroactive save state reconciliation, reward distribution pipeline, procedural audio fanfare, mid-match neon toast notifications, and main menu trophy matrix UI modal for Tron Disc Arena (SPEC-ACHIEVE-001).

## Requirements

### Requirement: Authoritative Launch Achievement Matrix Registry
The system SHALL maintain a structured registry defining the six launch achievements with immutable identifiers, display titles, descriptions, target metric thresholds, and associated reward payloads.

#### Scenario: Retrieval of launch achievement definitions
- **WHEN** querying the registry for launch achievements
- **THEN** the system returns records for `ach_first_blood` (1 derez, 100 Bits), `ach_curve_god` (25 curve kills, 300 Bits), `ach_parry_king` (50 parries, 250 Bits), `ach_untouchable` (100% integrity clear, 500 Bits), `ach_swarm_survivor` (wave 15, 750 Bits + `disc_corrupted_void`), and `ach_grid_one_master` (18 stars across Grid 01, 1000 Bits + `chassis_arbiter`).

#### Scenario: Calculation of incremental progress ratio
- **WHEN** evaluating progress for an incremental achievement with a defined numeric target
- **THEN** the system calculates progress as a clamped scalar value between 0.0 and 1.0 representing current metric divided by target threshold.

### Requirement: Telemetry Bus and Reactive Evaluation
The system SHALL observe combat and progression telemetry mutations and evaluate achievement criteria immediately upon metric updates.

#### Scenario: Evaluation on combat telemetry change
- **WHEN** telemetry signals indicate a change in `stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.swarmHighestWave`, or `campaign.levelRecords`
- **THEN** the system compares the updated metrics against all locked achievement criteria and triggers unlock sequences for any newly satisfied achievements.

#### Scenario: Locked achievement unchanged when criteria not met
- **WHEN** a player executes an action that increments a metric below the required threshold (e.g., 20 out of 50 parries)
- **THEN** the system updates the metric progress state without unlocking the achievement or distributing rewards.

### Requirement: Boot-Time Retroactive Reconciliation
The system SHALL inspect existing save state data upon engine initialization to detect and unlock any achievements whose criteria are already satisfied in persistent storage.

#### Scenario: Retroactive unlock for veteran player save state
- **WHEN** the engine boots with a save state where `stats.swarmHighestWave` is 15 or higher but `ach_swarm_survivor` is not marked as unlocked
- **THEN** the system immediately marks `ach_swarm_survivor` as unlocked, distributes the corresponding rewards, and records the unlock in the persistent state.

#### Scenario: No duplicate unlocks on subsequent initializations
- **WHEN** the engine boots with an achievement already recorded in the persistent `achievements` list
- **THEN** the system preserves the existing unlock timestamp and skips duplicate reward distribution.

### Requirement: Reward Distribution and Event Emission
The system SHALL execute atomic reward grants upon achievement completion, dispensing Bits via the economy engine and exclusive cosmetic items via the armory pipeline before broadcasting lifecycle events.

#### Scenario: Unlocking an achievement granting Bits and cosmetics
- **WHEN** `ach_swarm_survivor` or `ach_grid_one_master` satisfies its unlock criteria
- **THEN** the system awards the configured Bits currency, grants the cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, appends the unlock entry to storage, and emits `ACHIEVEMENT_UNLOCKED`.

### Requirement: Mid-Combat Neon Toast Notification
The system SHALL display a non-intrusive neon HUD toast banner sliding onto the screen when an achievement unlocks during active gameplay.

#### Scenario: Toast display on mid-match unlock
- **WHEN** an achievement unlocks while the player is inside an active match or campaign trial
- **THEN** a toast container slides in displaying the achievement title, icon, and reward badges, lingers for a configured duration, and animates out without blocking player inputs.

### Requirement: Procedural Synth Fanfare Audio
The system SHALL synthesize a celebratory procedural multi-tone synth fanfare using the Web Audio API upon achievement unlock.

#### Scenario: Audio fanfare synthesis on unlock
- **WHEN** an achievement unlock sequence executes and an active audio context is available
- **THEN** the system synthesizes an ascending harmonic chime sequence without requesting external audio files.

### Requirement: Diegetic Main Menu Trophy Matrix UI Modal
The system SHALL provide an interactive modal accessible from the main menu displaying player achievement progression, completion percentage, unlocked timestamps, and reward previews.

#### Scenario: Initial page load rendering of Achievements navigation button
- **WHEN** the main menu renders upon initial application load
- **THEN** `#achievementsBtn` is present in `#mainMenuButtons` with compatibility bindings, while the primary player access point is elevated to the Program Hub `[ DIRECTIVES ]` tab.

#### Scenario: Inspection of Trophy Matrix modal
- **WHEN** the user opens the Achievements modal or activates `[ DIRECTIVES ]` in the Program Hub
- **THEN** the system displays overall completion percentage, a badge grid of all launch achievements, current progress bars for incremental goals, and visual previews of unlockable cosmetic skins.
