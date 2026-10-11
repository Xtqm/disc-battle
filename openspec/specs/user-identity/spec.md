# user-identity Specification

## Purpose
Establishes provider-agnostic user identity, guest sub-routine session provisioning, authentication event distribution, and local save state orchestration.

## Requirements

### Requirement: Provider-Agnostic Auth Architecture
The system SHALL define a standardized authentication provider contract providing asynchronous initialization, session verification, and reactive state change subscriptions.

#### Scenario: Querying authentication state
- **WHEN** the application starts or queries user authentication status
- **THEN** the active auth provider reports the current authenticated user object or null without exposing underlying provider implementation details.

### Requirement: Authentication Event Distribution
The system SHALL broadcast standardized identity events through an authentication event bus when auth state changes or profiles are updated.

#### Scenario: Auth state transition event
- **WHEN** a user logs in, logs out, or switches identity sessions
- **THEN** an auth state changed event is dispatched to all registered application listeners.

### Requirement: Zero-Barrier Guest Sub-routine Provisioning
The system SHALL automatically provision an anonymous Guest Sub-routine identity with a stable unique identifier and transient session token upon initial launch.

#### Scenario: Initial guest provisioning
- **WHEN** a player launches the game with no existing stored identity credentials
- **THEN** the system generates a unique guest identifier, assigns a default grid handle, and creates an active guest session without user friction.

#### Scenario: Guest persistence across browser reloads
- **WHEN** a player reloads or re-enters the game on the same client
- **THEN** the previously generated guest identity and credentials are restored from local persistence without creating a redundant profile.

### Requirement: Save State Synchronization (TronSaveState)
The system SHALL bind player preferences, progression, and statistics to the authenticated user identifier via a structured local save state schema.

#### Scenario: Save state loading on identity resolution
- **WHEN** user identity resolution completes during startup
- **THEN** the system retrieves or creates the player save state linked to that user identifier and populates active player configuration.

### Requirement: Offline-First Instant Boot Performance
The system SHALL guarantee that local identity resolution and save state initialization complete in less than 1.5 seconds on page load without requiring network access.

#### Scenario: Offline page boot
- **WHEN** the application loads in an offline environment with no external network connectivity
- **THEN** guest authentication and save state initialization complete in under 1.5 seconds with all single-player game modes immediately playable.
