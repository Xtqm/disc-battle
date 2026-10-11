# Design

## Context

Tron Disc Arena operates on a modular ES6 architecture (`tron/src/`) where identity has historically been handled informally: `firebaseSetup.js` creates a random UID (`'user_' + Math.random()...`) only when multiplayer networking is initialized.

Single-player modes (`swarm`, `duel_ai`) run without an initialized `state.currentUser`, and player preferences (sensitivity, invert Y) and performance stats (waves survived, highest tier, scores) are ephemeral and wiped on page refresh.

See `proposal.md` for overall motivation and `specs/user-identity/spec.md` for requirement contracts.

## Goals / Non-Goals

**Goals:**
- Provide a clean, provider-agnostic `IAuthProvider` interface that abstracts identity retrieval, sign-in, and state change listeners.
- Implement `MockAuthProvider` providing instant, zero-friction guest sub-routine provisioning using local UUID generation and local storage persistence.
- Provide a lightweight event bus (`AuthEventBus`) dispatching standardized identity lifecycle events.
- Create `AuthManager` as the single identity orchestrator that bridges auth providers with game state and manages the `TronSaveState` schema.
- Guarantee <1.5s instant boot time (under normal conditions <15ms) with 100% offline-first execution.
- Maintain backward compatibility with existing multiplayer modules relying on `state.currentUser.uid`.

**Non-Goals:**
- Full integration with remote Firebase Auth SDK or third-party OAuth providers (scoped for Phase 2).
- Cloud database replication of `TronSaveState` across devices (scoped for Phase 2/3).
- Full account management UI modals (account settings screens, linking accounts), though HUD display of guest handle is enabled.

## Decisions

### 1. Provider-Agnostic Contract (`IAuthProvider`)
- **Choice**: Define an ES6 interface / base class `IAuthProvider` requiring methods:
  - `init(): Promise<void>`
  - `getCurrentUser(): UserIdentity | null`
  - `signInGuest(): Promise<UserIdentity>`
  - `signOut(): Promise<void>`
  - `onAuthStateChanged(callback): () => void`
- **Alternatives Considered**:
  - *Hardcoding mock auth directly in state.js*: Rejected because Phase 2 requires dropping in Firebase Auth and external providers without refactoring call sites.
  - *Adopting full Firebase Auth SDK as the baseline interface*: Rejected because it introduces a heavy external library dependency, fails offline without network, and violates the zero-friction offline-first instant boot goal.

### 2. Standalone Event Bus (`AuthEventBus`)
- **Choice**: Implement a tiny pub/sub event bus (`tron/src/auth/events.js`) emitting:
  - `auth:state_changed` (`{ user, provider }`)
  - `auth:profile_updated` (`{ user }`)
  - `auth:error` (`{ error }`)
- **Rationale**: Prevents circular dependencies between `AuthManager`, `state.js`, `network/sync.js`, and `ui/hud.js`. Subsystems subscribe cleanly to auth changes.

### 3. Save State Architecture (`TronSaveState`)
- **Choice**: Manage local persistence under localStorage key `tron_save_state_<userId>` with an in-memory fallback.
- **Schema**:
  ```json
  {
    "version": 1,
    "userId": "uuid-v4-string",
    "handle": "GUEST_SUBROUTINE_4A7F",
    "createdAt": 1728662400000,
    "lastActiveAt": 1728662400000,
    "stats": {
      "matchesPlayed": 0,
      "wins": 0,
      "highestWave": 1,
      "highestTier": 1,
      "totalScore": 0
    },
    "settings": {
      "sens": 0.0022,
      "invertY": false
    }
  }
  ```
- **Rationale**: Isolates user save state per identity ID, enabling multiple guest profiles or seamless migration when users link an account later.

### 4. Boot Sequence Integration
- **Choice**: In `tron/src/core/main.js`, invoke `await AuthManager.init()` immediately at module load or start of `DOMContentLoaded`.
- **Performance**: `MockAuthProvider` reads local storage synchronously/microtask without remote network round-trips, executing well under the 1.5s budget (<20ms).

## Architecture Flow

```
+-------------------------------------------------------------------------------+
|                             BOOT INITIALIZATION                               |
+-------------------------------------------------------------------------------+
|                                                                               |
|   main.js  ───────>  AuthManager.init()                                       |
|                            │                                                  |
|                            ▼                                                  |
|                   MockAuthProvider.init()                                     |
|                            │                                                  |
|                            ├──> [ Existing Guest Found? ]                     |
|                            │          │ YES: Restore session                  |
|                            │          │ NO:  Generate UUID & default handle   |
|                            ▼                                                  |
|                   AuthManager loads TronSaveState                             |
|                            │                                                  |
|                            ├──> Syncs state.currentUser                       |
|                            ├──> Dispatches 'auth:state_changed'               |
|                            ▼                                                  |
|                   UI & Engine Boot Ready (<15ms)                              |
|                                                                               |
+-------------------------------------------------------------------------------+
```

## Risks / Trade-offs

- **[Storage Access Blocked]**: In private browsing mode or sandboxed iframes, `localStorage` access may throw a SecurityError.
  - *Mitigation*: Wrap all storage operations with a fallback to transient in-memory map storage so the game boots seamlessly even without persistent storage.
- **[Multi-tab Concurrency]**: Two tabs running simultaneously might write conflicting `TronSaveState` data.
  - *Mitigation*: Read-modify-write helper with timestamp checking, and optional `storage` event listener to sync state across open tabs.
- **[ID Collisions in Mock Network]**: Random guest IDs colliding in multiplayer mock broadcast.
  - *Mitigation*: Use standard UUID v4 format (`crypto.randomUUID()` with fallback), providing negligible collision probability.
