# Spec Delta

## ADDED Requirements

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
