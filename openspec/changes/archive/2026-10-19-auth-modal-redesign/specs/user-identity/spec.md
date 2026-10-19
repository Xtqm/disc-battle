# Spec Delta: user-identity

## MODIFIED Requirements

### Requirement: Grid Authorization Terminal Modal
The system SHALL provide a diegetic Grid Authorization Terminal modal interface aligned with the Main Menu design language, featuring clean legible typography, rounded glassmorphism, elevated Quick Sync authentication, a 2-step account creation wizard with Callsign pre-fill, and dedicated exit control.

#### Scenario: Opening authorization terminal
- **WHEN** the player activates the identity header trigger or `[ SECURE IDENTITY ]` button
- **THEN** the terminal modal opens over the current menu display with clean, scanline-free typography matching the Main Menu, defaults to Step 1, and displays the current identity details.

#### Scenario: Direct Passkey authentication tab
- **WHEN** the player submits valid credentials in the Direct Passkey section (Email and Password) under Sign In mode
- **THEN** the system validates the credentials, promotes or binds the session to the authenticated identity, skips Step 2, and updates persistent save state.

#### Scenario: Quick Sync authentication tab
- **WHEN** the player activates an external authentication provider button (Google, Discord, or GitHub) in the prominent Quick Sync section
- **THEN** the system dispatches the provider authentication request and links the returned credentials to the active user session.

#### Scenario: Callsign customization
- **WHEN** the player proceeds to Step 2 ("Choose Callsign") during account registration
- **THEN** the system pre-fills the callsign with the external provider username or guest handle, sanitizes any committed handle, saves it to persistent storage, and dispatches a profile update event across all UI subsystems.

#### Scenario: Strict modal exit control
- **WHEN** the authorization terminal is open
- **THEN** dismissal is permitted exclusively via activation of the explicit `[ X ]` exit control button, preventing accidental closures from backdrop clicks or key presses while entering credentials.
