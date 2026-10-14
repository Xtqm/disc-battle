# Spec Delta

## ADDED Requirements

### Requirement: Arena Map Inventory Schema Support
The system SHALL support an `unlockedMaps` array within the `inventory` branch of the persistent save state schema to record unlocked arena environments.

#### Scenario: Initializing default unlocked maps
- **WHEN** a new player save state is initialized
- **THEN** `inventory.unlockedMaps` is instantiated containing `['arena_grid_01']` by default.

#### Scenario: Migrating legacy state without unlockedMaps
- **WHEN** a legacy save state is loaded where `inventory.unlockedMaps` is undefined
- **THEN** the storage engine automatically populates `inventory.unlockedMaps` with default map `['arena_grid_01']` without corrupting other inventory fields.

#### Scenario: Persisting newly unlocked arena map
- **WHEN** a new map ID is appended to `inventory.unlockedMaps`
- **THEN** the updated array is persisted across sessions and cross-tab storage synchronizations.
