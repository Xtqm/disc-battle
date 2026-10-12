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

### Requirement: Supabase Cloud Authentication Provider
The system SHALL provide a Supabase-backed authentication provider supporting native anonymous sign-in, account upgrade linking, OAuth providers (Google, Discord, GitHub), and direct credentials/magic link verification.

#### Scenario: Supabase client initialization
- **WHEN** the authentication provider initializes
- **THEN** it resolves environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or runtime configuration to instantiate the Supabase client.

#### Scenario: Native anonymous authentication
- **WHEN** a player launches the game without an active session
- **THEN** the provider invokes native anonymous sign-in, establishing a valid cloud UID and issuing an active session token.

#### Scenario: Anonymous account upgrade via identity linking
- **WHEN** an anonymous user signs in or links credentials via OAuth or email passkey
- **THEN** the provider links the identity to the existing user profile without wiping or changing the primary user identifier.

#### Scenario: OAuth provider sign-in
- **WHEN** a player selects Google, Discord, or GitHub in the authorization interface
- **THEN** the provider initiates OAuth authorization with the chosen provider and returns the authenticated session.

#### Scenario: Password and Magic Link credentials
- **WHEN** a player requests login via password passkey or magic link OTP
- **THEN** the provider authenticates with Supabase Auth and updates current session state.

### Requirement: Monotonic State Synchronization (Master Grid Protocol)
The system SHALL implement the Master Grid Protocol to merge local and cloud save states, guaranteeing strictly non-decreasing progression across all metrics and inventory items.

#### Scenario: Monotonic numerical attribute merge
- **WHEN** synchronizing local and cloud states with differing Bits or Level values
- **THEN** the resolved state assigns `Bits = max(Local.bits, Cloud.bits)` and `Level = max(Local.level, Cloud.level)`.

#### Scenario: Star mastery matrix union
- **WHEN** synchronizing differing star mastery scores across arena levels
- **THEN** each level's star rating is resolved as `max(Local.stars[lvl], Cloud.stars[lvl])`.

#### Scenario: Inventory and cosmetic set union
- **WHEN** merging player inventory collections
- **THEN** the resolved inventory contains the mathematical set union of all unlocked discs, skins, and trails (`Local ∪ Cloud`).

#### Scenario: Achievements set union
- **WHEN** merging unlocked achievements and accolades
- **THEN** the resolved achievements list contains the set union of all earned achievement identifiers (`Local ∪ Cloud`).

#### Scenario: Non-decreasing integrity guarantee
- **WHEN** a cloud synchronization cycle completes
- **THEN** no previously unlocked item, star rating, level tier, or currency amount can be decreased or revoked.

### Requirement: Network Resilience and Offline Sync Queue
The system SHALL detect offline network status, display a diegetic warning banner, and queue pending cloud synchronization payloads in a persistent local queue until connectivity is restored.

#### Scenario: Offline state detection and UI indication
- **WHEN** network connectivity drops during gameplay
- **THEN** the system displays a diegetic `#offlineSyncBanner` warning indicating that cloud sync is deferred.

#### Scenario: Offline save mutation queueing
- **WHEN** save state mutations occur while offline or during cloud network errors
- **THEN** mutations are committed to local storage and appended to a persistent queue of pending cloud synchronization payloads.

#### Scenario: Background queue flush on reconnection
- **WHEN** network connectivity is restored
- **THEN** the pending sync queue is automatically processed in sequence, synchronizing local changes with the remote cloud store and dismissing the offline banner.

### Requirement: Cross-Tab Session Synchronization
The system SHALL broadcast identity transitions and state modifications across open browser tabs using BroadcastChannel or storage events to prevent multi-tab state desynchronization.

#### Scenario: Cross-tab auth state propagation
- **WHEN** a user logs in, links an identity, or logs out in one browser tab
- **THEN** all other active game tabs receive the auth change event and update their identity header and session state synchronously.

#### Scenario: Cross-tab save state coherence
- **WHEN** progress or settings are updated in an active tab
- **THEN** other open tabs receive the state update notification and synchronize their local state without overriding uncommitted local changes.

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
