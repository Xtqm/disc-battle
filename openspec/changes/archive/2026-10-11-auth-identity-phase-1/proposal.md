# Proposal

## Why

Tron Disc Arena currently generates ad-hoc anonymous identities solely within `firebaseSetup.js` when connecting to multiplayer rooms, lacking a centralized, provider-agnostic identity and authentication subsystem. Players have no persistent local identity, and single-player game modes run with unmanaged identity state.

Establishing Phase 1 of the User Authentication & Identity Engine (SPEC-AUTH-001) introduces a decoupled, provider-agnostic authentication architecture (`IAuthProvider`) with an instant-boot `MockAuthProvider` and `AuthManager`. This provides a zero-barrier Guest Sub-routine experience that initializes in <1.5s, works 100% offline-first, persists player identity and save state locally via `TronSaveState`, and paves the way for future production auth providers.

## What Changes

- **Core Architecture & Event Bus**: Establish a pluggable `IAuthProvider` interface and lightweight auth event bus (`auth:state_changed`, `auth:user_updated`, `auth:error`).
- **Mock / Guest Auth Provider**: Implement `MockAuthProvider` to generate stable guest UUIDs, issue transient session tokens, simulate profile persistence, and store guest credentials in local storage without network dependencies.
- **Identity Orchestrator (`AuthManager`)**: Create `AuthManager` to manage active auth providers, expose reactive authentication state to the game, and connect directly to the `TronSaveState` storage schema.
- **Instant Boot & Offline Compatibility**: Guarantee that game bootstrap completes identity initialization synchronously or near-instantaneously (<1.5s) even with zero network connectivity.

## Capabilities

### New Capabilities
- `user-identity`: Provider-agnostic authentication abstraction, guest sub-routine lifecycle, auth event bus, and persistent local save state orchestration (`TronSaveState`).

### Modified Capabilities
*(None - existing combat, arena, and multiplayer capabilities are preserved without requirement modifications)*

## Impact

- **New Subsystem**: Creates `tron/src/auth/` containing `IAuthProvider.js`, `MockAuthProvider.js`, `AuthManager.js`, and `events.js`.
- **Core Initialization**: Integrates `AuthManager.init()` into `tron/src/core/main.js` during page startup before mode selection or multiplayer connections.
- **State Store**: Bridges `state.currentUser` and persistent `TronSaveState` with `AuthManager`.
- **Dependencies & Network**: Zero external network calls required for guest boot; 100% offline-first compatibility.
