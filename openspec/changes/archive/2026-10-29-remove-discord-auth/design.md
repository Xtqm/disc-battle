# Design

## Context

The Grid Authorization Terminal modal currently displays three Quick Sync federated OAuth buttons: Google, Discord, and GitHub. Discord is not configured in the Supabase cluster and will not be supported. Removing it cleans up the UI and focuses player sign-in on Google, GitHub, and Direct Passkeys.

## Goals / Non-Goals

**Goals:**
- Completely remove the Discord DOM button (`#btnSyncDiscord`) and corresponding CSS rules (`.discord-sync`) from `index.html`.
- Remove Discord element references and click bindings from `src/ui/authTerminal.js`.
- Clean up references in `SupabaseAuthProvider.js` docstrings.
- Update test cases in `test/auth/auth_terminal_integration.test.js` and `test/auth/supabase_auth_provider.test.js` to assert on active providers (Google, GitHub).

**Non-Goals:**
- Changing Google or GitHub OAuth flows or credentials.
- Restricting `SupabaseAuthProvider.signInWithFederated` with an artificial whitelist (it remains open to any provider passed to it, but the UI only offers active providers).

## Decisions

### 1. Remove DOM element and CSS rather than hiding
- **Choice**: Delete `#btnSyncDiscord` and `.sync-btn.discord-sync` entirely from `index.html`.
- **Rationale**: Deleting dead markup keeps the HTML tidy, eliminates unreachable code paths, and prevents confusion in accessibility trees or automated DOM tests.

### 2. Maintain generic provider interface in `SupabaseAuthProvider`
- **Choice**: Keep `signInWithFederated(providerName)` provider-agnostic.
- **Rationale**: The underlying `signInWithFederated` method forwards the provider string to Supabase Auth. Keeping it generic allows future providers to be added without modifying the core provider class.

## Risks / Trade-offs

- **[Risk]** Test assertions expecting `#btnSyncDiscord` fail.  
  → **Mitigation**: Update `test/auth/auth_terminal_integration.test.js` to verify `#btnSyncGoogle` and `#btnSyncGithub` specifically.
