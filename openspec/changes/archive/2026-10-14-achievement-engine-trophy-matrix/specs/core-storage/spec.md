# Spec Delta

## ADDED Requirements

### Requirement: Combat Telemetry Metrics Persistence
The system SHALL persist monotonic combat telemetry counters in `stats`—specifically `totalDerezzes`, `parriesExecuted`, and `curveEliminations`—initialized to zero in default save states.

#### Scenario: Initializing default combat telemetry stats
- **WHEN** a client initializes a new default save state
- **THEN** `stats.totalDerezzes`, `stats.parriesExecuted`, and `stats.curveEliminations` are instantiated as 0.

#### Scenario: Validating telemetry metrics
- **WHEN** validating a state payload containing telemetry metrics
- **THEN** the system requires `stats.totalDerezzes`, `stats.parriesExecuted`, and `stats.curveEliminations` to be non-negative finite numbers.

### Requirement: Structured Achievement Unlock Records
The system SHALL support structured unlock entries within the `achievements` array preserving immutable identification, unlock timestamps, and distributed reward metadata.

#### Scenario: Persisting achievement unlock entry
- **WHEN** an achievement is unlocked and stored in `achievements`
- **THEN** the system records the unlock payload while ensuring interoperability with set-union cloud sync reconciliation.
