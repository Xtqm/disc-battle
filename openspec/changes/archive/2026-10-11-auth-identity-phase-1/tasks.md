# Tasks

## 1. Core Auth Architecture & Event Bus

- [x] 1.1 Create `tron/src/auth/IAuthProvider.js` defining the provider-agnostic interface and verify class exports and method stubs.
- [x] 1.2 Create `tron/src/auth/events.js` implementing the lightweight `AuthEventBus` and verify subscription and dispatching via unit assertions.

## 2. Mock Auth Provider & Guest Sub-routine

- [x] 2.1 Implement `MockAuthProvider` in `tron/src/auth/MockAuthProvider.js` with UUID generation, guest handles, transient tokens, and local storage persistence.
- [x] 2.2 Create `tron/test_auth_mock_provider.js` and verify guest identity provisioning, fallback generation, and session re-hydration pass without error.

## 3. Save State & AuthManager Orchestration

- [x] 3.1 Implement `TronSaveState` schema and storage helpers in `tron/src/auth/saveState.js` with schema versioning, default stats, and preferences.
- [x] 3.2 Implement `AuthManager` singleton in `tron/src/auth/AuthManager.js` to coordinate provider lifecycle, bridge `state.currentUser`, and manage save state.
- [x] 3.3 Create unit tests in `tron/test_auth_save_state.js` validating save state read, update, and fallback behavior when local storage is disabled.

## 4. Engine Boot Integration & Offline Verification

- [x] 4.1 Wire `AuthManager.init()` into `tron/src/core/main.js` during startup sequence and update `firebaseSetup.js` to consume `AuthManager.currentUser`.
- [x] 4.2 Create `tron/test_auth_integration.js` verifying instant offline boot (<1.5s budget), guest session preservation, and multiplayer compatibility.
- [x] 4.3 Run all existing test suites (`test_physics_and_combat.js`, `test_unified_flow.js`, `test_multiplayer.js`) to verify zero regressions.
