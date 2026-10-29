# Design

## Context

Tron Disc Arena is an offline-capable browser game built with vanilla ES modules, Three.js, and an event-driven architecture. Currently, `window.__ENV__` in `index.html` defines live Supabase credentials (`SUPABASE_URL` and `SUPABASE_ANON_KEY`), but `@supabase/supabase-js` is not loaded into the browser's global scope. Consequently, `SupabaseAuthProvider.init()` falls back to `InMemorySupabaseAuth`.

When the live Supabase client is connected, authentication actions (OAuth redirects, credential sign-ins, and session tokens) interact with the live PostgreSQL backend, while maintaining resilience for offline and standalone environments.

## Goals / Non-Goals

**Goals:**
- Load `@supabase/supabase-js` v2 into the browser runtime so `window.supabase.createClient` is readily available.
- Instantiate an active `SupabaseClient` with `persistSession: true` and `detectSessionInUrl: true`.
- Support full OAuth redirect round-trips (Google, Discord, GitHub), detecting tokens in URL hashes upon redirect and restoring authenticated sessions.
- Support authentic email/password registration and login, including upgrading anonymous guest identities to identified users.
- Retain the monotonic save synchronization (`Master Grid Protocol`) and offline queueing without regressions.
- Preserve zero-barrier offline gameplay via automatic fallback to `InMemorySupabaseAuth` if CDN or network connectivity fails.

**Non-Goals:**
- Configuring third-party OAuth Client IDs inside the Google Cloud Console or Supabase project dashboard (assumed provisioned or configurable by project admin).
- Replacing or refactoring `IAuthProvider` contract or `AuthManager` event signatures.
- Introducing a Node.js bundler requirement (e.g. Webpack/Vite build steps) for running the game.

## Decisions

### 1. Delivery of `@supabase/supabase-js` via CDN in `index.html`
- **Choice**: Include `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` in `index.html` before the application module entry.
- **Rationale**: The game runs directly in modern browsers without a required bundling step. Including the official UMD/browser build attaches `window.supabase = { createClient }`, allowing vanilla ES modules in `src/` to instantiate live clients without altering the repository's build-free developer experience.
- **Alternatives Considered**:
  - *ESM import from CDN inside `SupabaseAuthProvider.js`*: Dynamic `import('https://esm.sh/@supabase/supabase-js')` works in some browsers but can fail under strict content security environments and introduces bundling friction in test runners.
  - *Full Vite/Rollup build pipeline*: Increases tooling complexity and breaks straightforward static-file hosting.

### 2. Session Hydration and URL Fragment Handling in `SupabaseAuthProvider.init()`
- **Choice**: Enable `detectSessionInUrl: true` in `createClient` and await `auth.getSession()` during `init()`. Clean up URL fragments (e.g. `#access_token=...`) after successful hydration using `window.history.replaceState`.
- **Rationale**: OAuth providers redirect back to the app with access tokens in the URL fragment. Supabase's native client parses and stores these in `localStorage`. Cleaning the hash prevents cluttering the address bar while preserving the user's current URL.
- **Alternatives Considered**:
  - *Custom manual URL regex parsing*: Fragile, reinvents token validation, and duplicates built-in Supabase Auth logic.

### 3. Identity Linking vs Existing Account Reconciliation
- **Choice**: When an anonymous user signs up or links an external OAuth provider:
  1. If currently an anonymous guest, attempt `client.auth.linkIdentity({ provider })` or `client.auth.updateUser({ email, password })`.
  2. If the user already has an existing account (or OAuth linking returns an account collision), authenticate with `signInWithPassword` or `signInWithOAuth`.
  3. Master Grid Protocol in `CloudSyncResolver` automatically merges the local guest save state with the remote cloud save monotonically ($\max(\text{Local}, \text{Cloud})$ for bits/level and union for inventory).
- **Rationale**: Ensures players never lose progress whether they are creating a brand new account or logging into an existing one with prior history.

### 4. Robust Offline Fallback Mechanism
- **Choice**: If `window.supabase` is missing, `navigator.onLine === false`, or `createClient` throws an exception, catch the error, log a diagnostic notice, and set `this._client = { auth: new InMemorySupabaseAuth() }`.
- **Rationale**: Fulfills the strict offline-first requirement of Tron Disc Arena. A broken internet connection or CDN outage must never crash the game loop or prevent offline play.

## Risks / Trade-offs

- **[Risk]** CDN script fails to load due to firewall, ad blocker, or offline startup.  
  → **Mitigation**: `SupabaseAuthProvider` checks for `window.supabase?.createClient` and seamlessly falls back to `InMemorySupabaseAuth`, keeping page load under 1.5 seconds.
- **[Risk]** OAuth redirect unloads the Three.js canvas and loses unsaved local state.  
  → **Mitigation**: `AuthManager` automatically commits the current `saveState` to `localStorage` before initiating `signInWithOAuth`, ensuring state is preserved upon return.
- **[Risk]** Google OAuth is not enabled in the Supabase Dashboard.  
  → **Mitigation**: Catch `auth.signInWithOAuth` errors cleanly in `authTerminal.js` and display a clear diegetic console error (`> OAUTH ERROR: PROVIDER NOT CONFIGURED IN CLUSTER`) instead of an unhandled rejection.
