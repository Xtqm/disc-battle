# Spec Delta

## ADDED Requirements

### Requirement: Cloud Database Persistence and Row-Level Security
The system SHALL persist player save states to a remote PostgreSQL `save_states` table in Supabase protected by Row Level Security (RLS) policies that isolate records strictly to the authenticated user.

#### Scenario: User saves state to remote cloud database
- **WHEN** an authenticated user commits local progress changes while online
- **THEN** the system executes an upsert to the `save_states` table matching the user's primary key (`user_id = auth.uid()`), persisting handle, bits, level, star mastery, inventory, achievements, stats, and settings.

#### Scenario: User queries own save state from cloud database
- **WHEN** an authenticated user initializes their session while online
- **THEN** the system executes a select query on `save_states` for records where `user_id = auth.uid()` and receives the remote record.

#### Scenario: Cross-user data isolation enforced by RLS
- **WHEN** a client session attempts to select, insert, or update a save state record where `user_id` does not match the active session's `auth.uid()`
- **THEN** the PostgreSQL engine rejects the operation or returns zero rows according to Row Level Security policies.

### Requirement: Runtime Cloud Configuration Provisioning
The system SHALL resolve live Supabase API endpoint configuration and publishable client credentials at runtime from client environment variables or injected configuration bridges.

#### Scenario: Resolving live credentials in browser environment
- **WHEN** the client application boots in a browser runtime
- **THEN** the authentication and persistence providers resolve `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the window configuration bridge (`window.__ENV__`) or environment exports before initializing network clients.

#### Scenario: Missing or unconfigured cloud credentials fallback
- **WHEN** the client boots and cloud credentials are missing or set to placeholder values
- **THEN** the system logs a non-fatal warning and operates in local-only fallback mode without throwing uncaught exceptions.
