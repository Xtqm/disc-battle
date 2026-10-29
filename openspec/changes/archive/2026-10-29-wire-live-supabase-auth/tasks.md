# Tasks

## 1. Browser Runtime Setup & Client Instantiation

- [x] 1.1 Add official `@supabase/supabase-js` v2 CDN `<script>` tag to `index.html` before the application module entry and verify `window.supabase.createClient` is accessible in the browser environment.
- [x] 1.2 Refactor `SupabaseAuthProvider.init()` in `src/auth/SupabaseAuthProvider.js` to instantiate the live client with `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`. Verify initialization cleanly falls back to `InMemorySupabaseAuth` if the network or CDN is unavailable.

## 2. Live Authentication & Identity Linking

- [x] 2.1 Implement URL fragment/hash session detection and cleanup in `SupabaseAuthProvider.init()` so returning from an OAuth redirect immediately establishes the authenticated session without leaving tokens in the browser address bar. Verify URL parsing with test cases.
- [x] 2.2 Wire up real email/password sign-in, account creation, and guest account upgrading in `SupabaseAuthProvider.signInWithCredentials()` and `linkIdentity()`. Verify with unit tests in `test/auth/supabase_auth_provider.test.js`.
- [x] 2.3 Wire up live federated OAuth dispatch (`signInWithOAuth`) in `SupabaseAuthProvider.signInWithFederated()` for Google, Discord, and GitHub, flushing the active save state to `localStorage` before redirect. Verify dispatch parameters and return structures.

## 3. UI Terminal Integration & Verification

- [x] 3.1 Refine `src/ui/authTerminal.js` to handle live authentication state transitions, displaying clear diegetic console feedback on provider errors (e.g. unconfigured OAuth providers, invalid passwords) and updating the header badge reactively.
- [x] 3.2 Run the auth test suite (`npm run test:auth`) and verify that all test suites pass with both live-capable code and simulated fallbacks.
