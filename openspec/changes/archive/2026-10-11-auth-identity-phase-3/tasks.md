# Tasks

## 1. Supabase Client Setup & Authentication Provider

- [x] 1.1 Implement `src/core/auth/SupabaseAuthProvider.js` (with `tron/src/auth/SupabaseAuthProvider.js` compatibility export) conforming to `IAuthProvider`, resolving environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) or runtime configuration with graceful fallback, and verify client initialization.
- [x] 1.2 Implement native anonymous authentication (`signInAnonymously`) issuing genuine cloud session tokens and verifying guest state generation.
- [x] 1.3 Implement account linking and identity upgrading (`linkIdentity`) enabling anonymous guest programs to link OAuth or passkeys without losing their account UID or save state.
- [x] 1.4 Implement OAuth sign-in (`signInWithOAuth` for Google, Discord, and GitHub) and Direct Passkey authentication (Password and Magic Link OTP via `signInWithPassword` and `signInWithOtp`).
- [x] 1.5 Create unit tests in `tron/test_supabase_auth_provider.js` verifying anonymous login, identity linking, OAuth dispatch, and credentials handling, and confirm all test assertions pass.

## 2. Monotonic State Synchronization Engine ("Master Grid Protocol")

- [x] 2.1 Implement `src/core/storage/CloudSyncResolver.js` (with `tron/src/storage/CloudSyncResolver.js` compatibility export) implementing numerical monotonic max rules: `Bits = max(Local, Cloud)` and `Level = max(Local, Cloud)`.
- [x] 2.2 Implement per-level StarMastery maximization (`max(Local.stars[lvl], Cloud.stars[lvl])`) and set unions for Inventory (`Local ∪ Cloud`) and Achievements (`Local ∪ Cloud`).
- [x] 2.3 Implement strictly non-decreasing invariant verification ensuring cloud synchronization can never revoke earned stars, downgrade levels, or remove inventory items.
- [x] 2.4 Create unit tests in `tron/test_cloud_sync_resolver.js` testing divergent local/cloud states, partial level matrices, disjoint inventories, and monotonic invariants, and verify all test assertions pass.

## 3. Network Resilience & Offline Save Queue

- [x] 3.1 Implement `OfflineSyncQueue` in `src/core/storage/OfflineSyncQueue.js` to buffer save payloads in `localStorage` when offline or upon remote network error, providing automatic retry and queue flushing with exponential backoff.
- [x] 3.2 Add the diegetic `#offlineSyncBanner` DOM element and Tron amber styles to `tron/index.html` and wire `online`/`offline` event listeners in `tron/src/ui/hud.js` and `authTerminal.js`.
- [x] 3.3 Create automated tests in `tron/test_offline_resilience.js` validating offline queue buffering, UI banner visibility toggling, and reconnection flush, and verify all test assertions pass.

## 4. Cross-Tab Session Synchronization

- [x] 4.1 Implement `CrossTabSync` in `src/core/storage/CrossTabSync.js` using `BroadcastChannel('tron_grid_sync')` with storage event fallback to broadcast auth state changes and save state invalidations.
- [x] 4.2 Connect `AuthManager.js` and `saveState.js` to broadcast and consume cross-tab synchronization events without triggering circular write loops.
- [x] 4.3 Create automated tests in `tron/test_cross_tab_sync.js` validating message exchange between simulated browser contexts and non-destructive state synchronization.

## 5. End-to-End Integration & Terminal UI Wiring

- [x] 5.1 Wire `SupabaseAuthProvider` into `AuthManager.js`, `main.js`, and `authTerminal.js`, adding GitHub to Quick Sync and Magic Link OTP to the Direct Passkey tab.
- [x] 5.2 Run the unified test suite across all auth and sync tests (`test_auth_*.js`, `test_supabase_auth_provider.js`, `test_cloud_sync_resolver.js`, `test_offline_resilience.js`, `test_cross_tab_sync.js`) and verify all tests pass with zero regressions.
