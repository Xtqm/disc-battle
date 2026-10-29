# Proposal

## Why

Currently, the game runs on an in-memory simulation (`InMemorySupabaseAuth`) in browser environments because the `@supabase/supabase-js` client library is not loaded into the page runtime. While local guest sessions and offline gameplay operate smoothly, clicking "Google", Discord, GitHub, or submitting email passkeys does not create genuine user identities in the live Supabase backend (`dugydwohgjcuwvimxcse.supabase.co`) or synchronize cloud saves to PostgreSQL. 

Wiring up a live Supabase client provides authentic user registration, OAuth federated authorization, account linking from anonymous guest sessions, and persistent cloud save state synchronization across devices, while safeguarding offline playability through automatic fallback.

## What Changes

- Load `@supabase/supabase-js` client library in `index.html` via a reliable high-availability CDN script so `window.supabase.createClient` is accessible to browser modules.
- Ensure `SupabaseAuthProvider.init()` cleanly instantiates the live client using the configured `window.__ENV__.SUPABASE_URL` and `window.__ENV__.SUPABASE_ANON_KEY`.
- Support live OAuth redirection flows (Google, Discord, GitHub), including handling URL callback redirects, token resolution from URL fragments, and immediate session restoration without losing local guest progression.
- Wire up live email/password authentication and account registration, upgrading anonymous guest identities to identified profiles in Supabase Auth.
- Retain `InMemorySupabaseAuth` as a resilient offline fallback when the client has no internet connectivity or when remote endpoints cannot be reached.
- Ensure the Grid Authorization Terminal UI provides feedback during OAuth redirects and displays authentic authentication state upon completion.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `user-identity`: Refine requirements to mandate live client runtime availability, OAuth redirect capture and callback session recovery, and account promotion against the remote Supabase project while preserving offline resilience.

## Impact

- `index.html`: Adds CDN script tag for `@supabase/supabase-js` prior to application module entry.
- `src/auth/SupabaseAuthProvider.js`: Updates client initialization, OAuth redirect handling, session extraction from URL on page load, and linking logic.
- `src/ui/authTerminal.js`: Refines UI feedback and error messaging for live OAuth redirection and email registration.
- `src/storage/CloudSyncResolver.js` & `src/auth/AuthManager.js`: Seamlessly connects authenticated user UID with live Supabase database upserts/queries.
- `test/auth/`: Validates both live-configured and offline fallback execution paths.
