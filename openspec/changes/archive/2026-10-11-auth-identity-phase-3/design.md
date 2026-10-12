# Design

## Context

Phase 1 established the headless authentication framework (`IAuthProvider`, `MockAuthProvider`, `TronSaveState`, and `AuthManager`) and Phase 2 delivered the diegetic "Grid Authorization Terminal" UI and procedural audio cues. However, player identities and save states are currently restricted to local browser storage (`localStorage` and memory maps). If a player switches browsers, clears site data, or plays across multiple tabs/devices, their progression (bits, levels, star mastery, inventory, and achievements) is vulnerable to loss or state divergence.

Phase 3 introduces production cloud authentication via Supabase and a resilient Monotonic State Synchronization Engine ("Master Grid Protocol") to guarantee data persistence, seamless account upgrades, offline survival, and cross-tab coherence.

See `proposal.md` for motivation and `specs/user-identity/spec.md` for formal requirement contracts.

## Goals / Non-Goals

**Goals:**
- Implement `SupabaseAuthProvider` conforming to the `IAuthProvider` interface:
  - Initialize the Supabase JS Client with environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or runtime configuration.
  - Native anonymous authentication (`signInAnonymously`) issuing genuine cloud session tokens.
  - Account upgrading via identity linking (`linkIdentity`) to promote guest sessions without wiping user progress.
  - OAuth federated authentication for Google, Discord, and GitHub via `signInWithOAuth`.
  - Direct credentials support with Magic Link OTP and password passkeys.
- Implement the Monotonic State Synchronization Engine (`CloudSyncResolver`):
  - Enforce the "Master Grid Protocol":
    - `Bits = max(Local, Cloud)`
    - `Level = max(Local, Cloud)`
    - `StarMastery = max(Local, Cloud)` per level
    - `Inventory = Local ∪ Cloud` (set union of unlocked discs, skins, and cosmetic trails)
    - `Achievements = Local ∪ Cloud` (set union of unlocked badges and milestones)
  - Ensure progression is strictly non-decreasing; cloud sync can never revoke earned items or stars.
- Implement Network Resilience and Multi-Tab Synchronization:
  - Diegetic offline detection banner (`#offlineSyncBanner`) with background durable mutation queue for pending cloud saves.
  - Cross-tab session sync using `BroadcastChannel` and storage events to prevent multi-tab desynchronization or conflicting write overwrites.
- Ensure dual path compatibility: Provide files at `src/core/auth/SupabaseAuthProvider.js` and `src/core/storage/CloudSyncResolver.js` alongside standard `tron/src/` pathing.

**Non-Goals:**
- Server-side administrative dashboard or manual database migration tooling.
- Modifying peer-to-peer multiplayer match synchronization (multiplayer rooms remain in Firestore / WebRTC; this sync engine is purely for persistent user progression and identity).

## Architecture Flow

```
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                         TRON DISC ARENA - PHASE 3 SYNC ARCHITECTURE                           |
+───────────────────────────────────────────────────────────────────────────────────────────────+
|                                                                                               |
|     [ Player / Browser Tab A ]                      [ Player / Browser Tab B ]                |
|                 │                                               │                             |
|                 ├────────────────── BroadcastChannel ───────────┤                             |
|                 │            (Cross-Tab Session & Save Sync)    │                             |
|                 ▼                                               ▼                             |
|        +─────────────────+                             +─────────────────+                    |
|        |   AuthManager   |                             |   AuthManager   |                    |
|        +────────┬────────+                             +────────┬────────+                    |
|                 │                                               │                             |
|        +────────▼──────────────────+                   +────────▼──────────────────+          |
|        |   SupabaseAuthProvider   |                   |   SupabaseAuthProvider   |          |
|        +────────┬──────────────────+                   +────────┬──────────────────+          |
|                 │                                               │                             |
|        +────────▼───────────────────────────────────────────────▼───────────+                  |
|        |                     CloudSyncResolver                              |                  |
|        |                 ("Master Grid Protocol")                           |                  |
|        |                                                                    |                  |
|        |   • Bits        = max(Local.bits, Cloud.bits)                      |                  |
|        |   • Level       = max(Local.level, Cloud.level)                    |                  |
|        |   • StarMastery = max(Local.stars[k], Cloud.stars[k])              |                  |
|        |   • Inventory   = Local.inventory ∪ Cloud.inventory               |                  |
|        |   • Achievements= Local.achievements ∪ Cloud.achievements          |                  |
|        +────────┬───────────────────────────────────────────────┬───────────+                  |
|                 │                                               │                             |
|        +────────▼──────────────────+                   +────────▼──────────────────+          |
|        |    Network Monitor &      |                   |    Network Monitor &      |          |
|        |    Offline Save Queue     |                   |    Offline Save Queue     |          |
|        |   (#offlineSyncBanner)    |                   |   (#offlineSyncBanner)    |          |
|        +────────┬──────────────────+                   +────────┬──────────────────+          |
|                 │                                               │                             |
|                 └───────────────────────┬───────────────────────┘                             |
|                                         │ HTTPS / WebSockets                                  |
|                                         ▼                                                     |
|                           +───────────────────────────+                                       |
|                           |   Supabase Cloud Platform |                                       |
|                           |   • Gotrue / Auth Engine  |                                       |
|                           |   • PostgREST / Save State|                                       |
|                           +───────────────────────────+                                       |
+───────────────────────────────────────────────────────────────────────────────────────────────+
```

## Decisions

### 1. Provider Contract Adherence & Supabase Implementation (`SupabaseAuthProvider.js`)
- **Choice**: Implement `SupabaseAuthProvider` extending `IAuthProvider`.
  - Credentials discovery order:
    1. Runtime options passed to constructor.
    2. `window.__ENV__?.SUPABASE_URL` and `window.__ENV__?.SUPABASE_ANON_KEY`.
    3. `import.meta.env?.VITE_SUPABASE_URL` and `import.meta.env?.VITE_SUPABASE_ANON_KEY`.
    4. Node-compatible `process.env?.SUPABASE_URL` and `process.env?.SUPABASE_ANON_KEY`.
  - Native anonymous sign-in: Calls `supabase.auth.signInAnonymously()`.
  - Linking upgrades: Implements `linkIdentity(credentials)` using `supabase.auth.linkIdentity()` or `supabase.auth.updateUser()` so that anonymous players can link Google, Discord, GitHub, or direct passkeys without losing their account UID or save state.
  - OAuth and Magic Link: Maps `signInWithFederated(provider)` to `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` and passkey authentication to `signInWithPassword` or `signInWithOtp`.
  - Defensive fallback: If credentials are missing or network calls fail, the provider gracefully reports detailed diagnostic events without crashing the game loop.
- **Alternatives Considered**: Direct REST fetch without the Supabase client. *Rejected* because the official Supabase JS Client handles session refresh tokens, PKCE flows for OAuth, and event subscriptions cleanly.

### 2. Monotonic State Synchronization Engine (`CloudSyncResolver.js`)
- **Choice**: Implement mathematical monotonic CRDT-style resolution ("Master Grid Protocol"):
  - Mathematical rules:
    $$\text{Bits}_{\text{merged}} = \max(\text{Bits}_{\text{local}}, \text{Bits}_{\text{cloud}})$$
    $$\text{Level}_{\text{merged}} = \max(\text{Level}_{\text{local}}, \text{Level}_{\text{cloud}})$$
    $$\text{Stars}_{\text{merged}}[k] = \max(\text{Stars}_{\text{local}}[k], \text{Stars}_{\text{cloud}}[k]) \quad \forall k \in \text{Levels}$$
    $$\text{Inventory}_{\text{merged}} = \text{Inventory}_{\text{local}} \cup \text{Inventory}_{\text{cloud}}$$
    $$\text{Achievements}_{\text{merged}} = \text{Achievements}_{\text{local}} \cup \text{Achievements}_{\text{cloud}}$$
  - Strictly non-decreasing guarantee: A verification step checks that no metric or unlock in the merged state is inferior to either input state.
  - Conflict Resolution: Rather than Last-Write-Wins (LWW) which can cause progress loss if an older offline tab syncs, monotonic union/max ensures progress is permanent.
- **Alternatives Considered**: Last-Write-Wins (LWW) via timestamps. *Rejected* because a player playing offline on an un-synced laptop could accidentally overwrite higher progress achieved on desktop.

### 3. Network Resilience & Pending Save Queue
- **Choice**:
  - `NetworkMonitor` listens to `window.addEventListener('online')` and `'offline'`, and checks `navigator.onLine`.
  - Diegetic offline banner `#offlineSyncBanner`: Fixed top bar with Tron amber styling (`[GRID OFFLINE] SYNC BUFFER ACTIVE // PROGRESS SAFEGUARDED`).
  - Durable mutation queue: Stores pending save payloads in `localStorage` under `tron_pending_cloud_sync`.
  - Reconnection flush: When online status returns, the queue drains payloads with exponential backoff and merges them via `CloudSyncResolver`.
- **Alternatives Considered**: Blocking the game when offline. *Rejected* because Tron Disc Arena is strictly offline-first.

### 4. Cross-Tab Session Synchronization
- **Choice**:
  - `BroadcastChannel('tron_grid_sync')` broadcasts `{ type: 'AUTH_STATE_CHANGED' }` and `{ type: 'SAVE_MUTATION' }` across all open tabs.
  - Fallback to window `storage` event listener for browsers without `BroadcastChannel`.
  - When a tab receives a save mutation from another tab, it loads the updated state, applies the monotonic resolver to avoid overwriting ongoing changes, and triggers `AuthEvents.PROFILE_UPDATED`.
- **Alternatives Considered**: Polling localStorage on an interval. *Rejected* because interval polling consumes CPU cycles and is sluggish compared to push events.

### 5. File Layout & Path Bridging
- **Choice**:
  - Place primary implementations in `src/core/auth/SupabaseAuthProvider.js` and `src/core/storage/CloudSyncResolver.js` (matching the user's prompt).
  - Also provide aliases / re-exports at `tron/src/auth/SupabaseAuthProvider.js` and `tron/src/storage/CloudSyncResolver.js` so imports from existing Tron code resolve seamlessly.

## Risks / Trade-offs

- **[Risk]** Supabase JS Client dependency unavailable without a bundler.
  - **Mitigation**: Implement ES module import with CDN fallback (`https://esm.sh/@supabase/supabase-js@2` or `jsdelivr`) and provide a self-contained mock/stub client if offline or CDN is blocked.
- **[Risk]** OAuth redirects cause page navigation and lose ephemeral canvas state.
  - **Mitigation**: Persist active game state to `localStorage` before OAuth redirect, or support popup-based OAuth flows where applicable.
- **[Risk]** Simultaneous edits across multiple tabs creating race conditions.
  - **Mitigation**: Cross-tab lock/debounce via `BroadcastChannel` and strictly monotonic merge logic prevents data corruption.
