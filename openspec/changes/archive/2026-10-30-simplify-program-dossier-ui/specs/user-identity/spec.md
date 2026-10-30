# Spec Delta

## MODIFIED Requirements

### Requirement: Grid Authorization Terminal Modal
The system SHALL provide a diegetic Grid Authorization Terminal modal interface aligned with the Main Menu design language, featuring clean legible typography, rounded glassmorphism, an authenticated Program Dossier hub, elevated Quick Sync authentication, a 2-step account creation wizard with Callsign pre-fill, and dedicated exit control.

#### Scenario: Opening authorization terminal
- **WHEN** the player activates the identity header trigger or `[ SECURE IDENTITY ]` button
- **THEN** if authenticated, the terminal modal opens directly to a streamlined Program Dossier view displaying active callsign, unified progression telemetry, system clearance, and an identity switching action without redundant status banners; if unauthenticated or guest, the terminal modal opens to Step 1 of the authentication wizard.

#### Scenario: Direct Passkey authentication tab
- **WHEN** the player submits valid credentials in the Direct Passkey section (Email and Password) under Sign In mode
- **THEN** the system validates the credentials, promotes or binds the session to the authenticated identity, skips Step 2, and updates persistent save state.

#### Scenario: Quick Sync authentication tab
- **WHEN** the player activates an external authentication provider button (Google or GitHub) in the prominent Quick Sync section
- **THEN** the system dispatches the provider authentication request and links the returned credentials to the active user session.

#### Scenario: Callsign customization
- **WHEN** the player proceeds to Step 2 ("Choose Callsign") during account registration or edits their callsign inline within the Program Dossier
- **THEN** the system pre-fills or sanitizes any committed handle, saves it to persistent storage, updates cloud user metadata if connected, and dispatches a profile update event across all UI subsystems.

#### Scenario: Strict modal exit control
- **WHEN** the authorization terminal is open
- **THEN** dismissal is permitted exclusively via activation of the explicit `[ X ]` exit control button, preventing accidental closures from backdrop clicks or key presses while entering credentials.

#### Scenario: Viewing live telemetry in Program Dossier
- **WHEN** the Program Dossier view is active
- **THEN** the system renders the player's progression level, bits balance, highest wave reached, and total score in a unified, non-redundant telemetry panel without excessive border nesting.

#### Scenario: Switching identity or signing out from Program Dossier
- **WHEN** the player activates the switch identity action in the Program Dossier
- **THEN** the terminal switches the active view from the dossier to the authentication wizard (Step 1), permitting sign in with alternative credentials or new account creation.

#### Scenario: Terminal tabbed navigation
- **WHEN** the Program Dossier modal is opened
- **THEN** the terminal displays a clean horizontal tab bar for `[ IDENT MATRIX ]`, `[ LOADOUT ]`, and `[ DIRECTIVES ]` that preserves dedicated spacing for the exit control without awkward text-wrapping or crowded borders.
