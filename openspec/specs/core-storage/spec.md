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
