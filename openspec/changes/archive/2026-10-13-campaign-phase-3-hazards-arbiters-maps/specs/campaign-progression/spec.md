# Spec Delta

## ADDED Requirements

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
