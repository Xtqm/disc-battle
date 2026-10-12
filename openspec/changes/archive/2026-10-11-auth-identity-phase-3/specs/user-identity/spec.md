# Spec Delta

## ADDED Requirements

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
