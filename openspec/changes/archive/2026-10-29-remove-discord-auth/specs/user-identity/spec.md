# Spec Delta

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
- **WHEN** the player activates an external authentication provider button (Google or GitHub) in the prominent Quick Sync section
- **THEN** the system dispatches the provider authentication request and links the returned credentials to the active user session.

#### Scenario: Callsign customization
- **WHEN** the player proceeds to Step 2 ("Choose Callsign") during account registration
- **THEN** the system pre-fills the callsign with the external provider username or guest handle, sanitizes any committed handle, saves it to persistent storage, and dispatches a profile update event across all UI subsystems.

#### Scenario: Strict modal exit control
- **WHEN** the authorization terminal is open
- **THEN** dismissal is permitted exclusively via activation of the explicit `[ X ]` exit control button, preventing accidental closures from backdrop clicks or key presses while entering credentials.

### Requirement: Supabase Cloud Authentication Provider
The system SHALL provide a Supabase-backed authentication provider supporting live client instantiation in the browser, native anonymous sign-in, account upgrade linking, OAuth providers (Google, GitHub) with URL redirect session capture, direct credentials/magic link verification, and resilient in-memory fallback.

#### Scenario: Supabase client initialization
- **WHEN** the authentication provider initializes
- **THEN** it resolves environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or runtime configuration to instantiate the Supabase client with persistent session handling, falling back to simulated authentication if client libraries or network endpoints are unavailable.

#### Scenario: Native anonymous authentication
- **WHEN** a player launches the game without an active session
- **THEN** the provider invokes native anonymous sign-in via Supabase Auth, establishing a valid cloud UID and issuing an active session token.

#### Scenario: Anonymous account upgrade via identity linking
- **WHEN** an anonymous user signs in or links credentials via OAuth or email passkey
- **THEN** the provider links the identity to the existing user profile without wiping or changing the primary user identifier.

#### Scenario: OAuth provider sign-in
- **WHEN** a player selects Google or GitHub in the authorization interface
- **THEN** the provider initiates OAuth authorization with the chosen provider, redirects or verifies credentials, and returns or updates the authenticated session.

#### Scenario: Password and Magic Link credentials
- **WHEN** a player requests login via password passkey or magic link OTP
- **THEN** the provider authenticates with Supabase Auth and updates current session state.

#### Scenario: OAuth redirect session capture
- **WHEN** a player returns from an external OAuth provider redirect to the application URL
- **THEN** the system extracts authentication tokens from the URL fragment or query parameters, hydrates the authenticated session, and cleans the URL fragment via history manipulation without triggering page reload.

#### Scenario: Resilient offline simulation fallback
- **WHEN** network connectivity is unavailable or live cloud authentication endpoints fail
- **THEN** the provider activates the in-memory simulated authentication client without interrupting local gameplay or throwing unhandled exceptions.
