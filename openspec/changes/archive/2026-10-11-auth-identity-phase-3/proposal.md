# Proposal

## Why

While Phase 1 established the decoupled `IAuthProvider` contract with an offline `MockAuthProvider` and Phase 2 introduced the diegetic "Grid Authorization Terminal" UI, player progression and authentication remain confined to local browser storage. If a player switches browsers, clears site data, or plays across multiple tabs/devices, their progression (bits, levels, star mastery, inventory, and achievements) is vulnerable to loss or state divergence.

Phase 3 introduces production cloud persistence via Supabase Auth and a resilient Monotonic State Synchronization Engine ("Master Grid Protocol"). This provides real-world remote authentication (native anonymous auth, account conversion/linking, OAuth for Google, Discord, and GitHub, and Magic Link/password credentials), strictly non-decreasing progression synchronization where cloud sync can never revoke earned rewards, and network resilience with multi-tab coherence.

## What Changes

- **Supabase Cloud Auth Provider (`SupabaseAuthProvider`)**:
  - Implements the `IAuthProvider` contract using the `@supabase/supabase-js` client initialized via environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or client runtime config.
  - Native anonymous guest sign-in (`signInAnonymously`) enabling instant play with cloud-backed UUIDs.
  - Seamless identity linking (`linkIdentity`) allowing players to upgrade guest accounts to permanent accounts without losing progress.
  - OAuth identity providers (Google, Discord, GitHub) via `signInWithOAuth`.
  - Password and Magic Link authentication workflows (`signInWithPassword`, `signInWithOtp`, `signUp`).
- **Monotonic State Synchronization Engine (`CloudSyncResolver`)**:
  - Implements the "Master Grid Protocol" mathematical merge rules:
    - `Bits = max(Local, Cloud)`
    - `Level = max(Local, Cloud)`
    - `StarMastery = max(Local, Cloud)` per level
    - `Inventory = Local ∪ Cloud` (set union preserving all unlocked discs, skins, and trails)
    - `Achievements = Local ∪ Cloud` (set union preserving unlocked badges and milestones)
  - Guarantees strictly monotonic (non-decreasing) progression: cloud synchronization can never revoke earned stars, downgrade levels, or erase acquired equipment.
- **Network Resilience & Pending Mutation Queue**:
  - Diegetic offline detection banner (`#offlineSyncBanner`) that appears when network connectivity drops.
  - Background durable mutation queue for pending cloud saves that retries and flushes upon network restoration.
- **Cross-Tab Synchronization**:
  - `BroadcastChannel` and `storage` event synchronization between open game tabs to propagate auth transitions and prevent multi-tab desynchronization or race conditions.

## Capabilities

### New Capabilities
*(None - extends existing user identity and save state orchestration capabilities)*

### Modified Capabilities
- `user-identity`: Adds requirements for Supabase Cloud Auth Provider (native anonymous auth, account linking, OAuth, Magic Link/password), Monotonic State Synchronization Engine (Master Grid Protocol), offline resilience queue with UI banner, and cross-tab session coherence.

## Impact

- **Auth Subsystem**: Adds `src/core/auth/SupabaseAuthProvider.js` (and `tron/src/auth/SupabaseAuthProvider.js`), updating `AuthManager.js` to support provider switching and linking callbacks.
- **Storage & State Subsystem**: Adds `src/core/storage/CloudSyncResolver.js` (and `tron/src/storage/CloudSyncResolver.js`), extending `saveState.js` with monotonic merge utilities and cross-tab synchronization.
- **UI & DOM**: Adds the `#offlineSyncBanner` element and styles to `tron/index.html` and updates `authTerminal.js` to trigger Supabase OAuth (Google, Discord, GitHub) and Magic Link flows.
- **Dependencies**: Integrates Supabase JS Client (`@supabase/supabase-js`) via ES module import / CDN bundle fallback for zero-install client compatibility.
