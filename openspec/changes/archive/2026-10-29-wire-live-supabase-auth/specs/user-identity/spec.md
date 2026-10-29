# Spec Delta

## MODIFIED Requirements

### Requirement: Supabase Cloud Authentication Provider
The system SHALL provide a Supabase-backed authentication provider supporting live client instantiation in the browser, native anonymous sign-in, account upgrade linking, OAuth providers (Google, Discord, GitHub) with URL redirect session capture, direct credentials/magic link verification, and resilient in-memory fallback.

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
- **WHEN** a player selects Google, Discord, or GitHub in the authorization interface
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
