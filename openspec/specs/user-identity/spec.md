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

### Requirement: Diegetic Main Menu Identity Status Header
The system SHALL render a persistent identity status indicator in the top-right of the main menu displaying the player's active authorization state, callsign, and level tier.

#### Scenario: Guest sub-routine identity display
- **WHEN** the player enters the main menu with an anonymous guest session
- **THEN** the status badge displays an amber wireframe motif with text format `[GUEST] SUB-ROUTINE // ID: <short_id>` and an interactive pulsating `[ SECURE IDENTITY ]` trigger.

#### Scenario: Authenticated user identity display
- **WHEN** the player authenticates or resumes an identified user session
- **THEN** the status badge displays a Tron Cyan glowing aesthetic with text format `[USER RECOGNIZED] <CALLSIGN> // LVL <level>` accompanied by a green status circuit indicator.

#### Scenario: Reactive update on auth transition
- **WHEN** the auth engine broadcasts an identity state change or profile update event
- **THEN** the main menu identity badge updates immediately without requiring a page reload or menu re-initialization.

### Requirement: Grid Authorization Terminal Modal
The system SHALL provide a diegetic Grid Authorization Terminal modal interface featuring CRT scanline shaders, monospaced typography, and emissive grid styling.

#### Scenario: Opening authorization terminal
- **WHEN** the player activates the identity header trigger or `[ SECURE IDENTITY ]` button
- **THEN** the terminal modal opens over the current menu display, focuses the terminal input, and displays the current identity details.

#### Scenario: Direct Passkey authentication tab
- **WHEN** the player submits valid credentials in the "Direct Passkey" tab (Email and Password)
- **THEN** the system validates the credentials, promotes or binds the session to the authenticated identity, and updates persistent save state.

#### Scenario: Quick Sync authentication tab
- **WHEN** the player activates an external authentication provider button (Google or Discord) in the "Quick Sync" tab
- **THEN** the system dispatches the provider authentication request and links the returned credentials to the active user session.

#### Scenario: Callsign customization
- **WHEN** the player modifies their callsign / display name in the terminal and commits changes
- **THEN** the system sanitizes the handle, saves it to persistent storage, and dispatches a profile update event across all UI subsystems.

### Requirement: PointerLock and Canvas Modal Safety
The system SHALL safely isolate mouse and touch input between active modal terminals and the Three.js canvas, guaranteeing PointerLock release upon terminal launch.

#### Scenario: PointerLock release on terminal launch
- **WHEN** the authorization terminal is opened
- **THEN** pointer lock is explicitly exited, cursor display is restored to default, and canvas click-through events are suppressed.

#### Scenario: Returning from terminal to menu
- **WHEN** the authorization terminal is closed via exit trigger or completion
- **THEN** the modal cleanly unmounts or hides, returning the player to the underlying menu state without triggering accidental PointerLock re-acquisition.

