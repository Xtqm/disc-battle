# core-storage Specification

## Purpose
Establishes the core client state schema, atomic keypath mutation, debounced persistence pipeline, corruption recovery, forward schema migrations, and cross-tab synchronization for Tron Disc Arena (SPEC-ECON-001).

## Requirements

### Requirement: Structured State Schema Enforcement
The system SHALL enforce a structured versioned save state containing player profile, loadout, campaign progression, inventory, achievements, and gameplay statistics.

#### Scenario: Initializing new player state
- **WHEN** a client creates a default save state
- **THEN** the system generates an immutable payload with schema version 1.0.0 containing default player identity, loadout slots, campaign nodes, inventory items, achievements, and gameplay statistics.

#### Scenario: Validating state integrity
- **WHEN** a state payload is validated against the schema
- **THEN** the system verifies required top-level branches and types, rejecting malformed objects missing core categories.

### Requirement: Event-Driven Persistence Engine
The system SHALL provide centralized state retrieval, path-based mutation, full reset, JSON export, and JSON import operations with reactive lifecycle notifications.

#### Scenario: Path-based state mutation
- **WHEN** a system mutates a nested value using a dot-delimited keypath
- **THEN** the persistence engine updates the targeted field, queues state synchronization, and broadcasts a mutation lifecycle event containing the path, new value, and previous value.

#### Scenario: JSON state export and import
- **WHEN** an operator exports the current state to JSON and later imports a valid JSON payload
- **THEN** the persistence engine re-hydrates the state, validates schema compatibility, commits the restored state, and notifies listeners.

### Requirement: Debounced Auto-Save and Emergency Flush
The system SHALL batch state write operations using a debounced persistence pipeline while executing an immediate synchronous flush upon window unload.

#### Scenario: Debouncing rapid consecutive mutations
- **WHEN** multiple state mutations occur within the debounce threshold
- **THEN** storage write operations are deferred until mutation activity pauses for the debounce window, committing only the latest accumulated state.

#### Scenario: Emergency flush on window termination
- **WHEN** the browser triggers a page unload or hide event while pending mutations are queued
- **THEN** the persistence engine immediately executes a synchronous flush to persistent storage before document destruction.

### Requirement: Storage Corruption Detection and Recovery
The system SHALL detect corrupt or unparseable persistence payloads, preserve the defective data as a backup file, and cleanly restore default state.

#### Scenario: Recovering from malformed storage data
- **WHEN** persistent storage contains syntactically invalid JSON or unrecoverable schema corruption during load
- **THEN** the system preserves the raw defective string under a dedicated backup storage key, emits a corruption alert event, and initializes a clean default save state.

### Requirement: Schema Migration Registry
The system SHALL support sequential schema upgrades through an extensible migration registry when loading states with older version numbers.

#### Scenario: Upgrading legacy state versions
- **WHEN** a persisted state with an older supported schema version is loaded
- **THEN** the system executes registered migration transformations in sequential version order to bring the payload up to the current schema before initializing.

### Requirement: Cross-Tab Storage Synchronization
The system SHALL synchronize storage mutations across multiple active browser tabs without producing feedback loops or desynchronization.

#### Scenario: Receiving mutation from peer tab
- **WHEN** an external browser tab writes a new state to persistent storage
- **THEN** the local instance detects the storage modification, updates its in-memory representation, and dispatches a mutation notification to registered consumers without re-triggering a disk write.

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

### Requirement: Swarm Survival High Watermark Record Persistence
The system SHALL persist the player's peak Swarm survival performance in `stats.swarmHighestWave` within StorageManager, updating the value monotonically whenever a new wave record is achieved.

#### Scenario: Advancing survival wave record
- **WHEN** a player completes a Swarm wave that exceeds their previous `stats.swarmHighestWave` value
- **THEN** the system updates `stats.swarmHighestWave` to match the new wave number and commits the updated record to persistent storage.

#### Scenario: Completing wave lower than established record
- **WHEN** a player completes a Swarm wave that is less than or equal to their recorded `stats.swarmHighestWave`
- **THEN** the system leaves `stats.swarmHighestWave` intact without reducing or overwriting the player's personal best record.
