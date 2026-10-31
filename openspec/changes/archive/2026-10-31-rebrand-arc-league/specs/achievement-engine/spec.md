# Spec Delta: achievement-engine

## MODIFIED Requirements

### Requirement: Authoritative Launch Achievement Matrix Registry
The system SHALL maintain a structured registry defining the six launch achievements with immutable identifiers, display titles, descriptions, target metric thresholds, and associated reward payloads using Arc League terminology and Arc Credits.

#### Scenario: Retrieval of launch achievement definitions
- **WHEN** querying the registry for launch achievements
- **THEN** the system returns records for `ach_first_blood` (1 de-allocation, 100 Arc Credits), `ach_curve_god` (25 curve eliminations, 300 Arc Credits), `ach_parry_king` (50 parries, 250 Arc Credits), `ach_untouchable` (100% integrity clear, 500 Arc Credits), `ach_swarm_survivor` (wave 15, 750 Arc Credits + `disc_corrupted_void`), and `ach_grid_one_master` (18 stars across Circuit 01, 1000 Arc Credits + `chassis_arbiter`).

#### Scenario: Calculation of incremental progress ratio
- **WHEN** evaluating progress for an incremental achievement with a defined numeric target
- **THEN** the system calculates progress as a clamped scalar value between 0.0 and 1.0 representing current metric divided by target threshold.

### Requirement: Telemetry Bus and Reactive Evaluation
The system SHALL observe combat and progression telemetry mutations and evaluate achievement criteria immediately upon metric updates, observing `stats.totalDeallocations` with backward compatibility for legacy `stats.totalDerezzes`.

#### Scenario: Evaluation on combat telemetry change
- **WHEN** telemetry signals indicate a change in `stats.totalDeallocations`, `stats.totalDerezzes`, `stats.parriesExecuted`, `stats.curveEliminations`, `stats.swarmHighestWave`, or `campaign.levelRecords`
- **THEN** the system compares the updated metrics against all locked achievement criteria and triggers unlock sequences for any newly satisfied achievements.

#### Scenario: Locked achievement unchanged when criteria not met
- **WHEN** a player executes an action that increments a metric below the required threshold (e.g., 20 out of 50 parries)
- **THEN** the system updates the metric progress state without unlocking the achievement or distributing rewards.

### Requirement: Reward Distribution and Event Emission
The system SHALL execute atomic reward grants upon achievement completion, dispensing Arc Credits via the economy engine and exclusive cosmetic items via the armory pipeline before broadcasting lifecycle events.

#### Scenario: Unlocking an achievement granting Bits and cosmetics
- **WHEN** `ach_swarm_survivor` or `ach_grid_one_master` satisfies its unlock criteria
- **THEN** the system awards the configured Arc Credits currency, grants the cosmetic skin to player inventory via `ArmoryManager.unlockRewardItem`, appends the unlock entry to storage, and emits `ACHIEVEMENT_UNLOCKED`.
