# Proposal

## Why

Discord authentication is not configured for the project and introduces unnecessary UI clutter and maintenance overhead in the Grid Authorization Terminal. Removing Discord streamlines the sign-in and sign-up experience down to Google, GitHub, and Direct Passkeys (Email/Password).

## What Changes

- Remove the Discord Quick Sync button (`#btnSyncDiscord`) and its `.discord-sync` styling rules from `index.html`.
- Remove Discord event bindings and references from `src/ui/authTerminal.js`.
- Clean up docstrings and references in `src/auth/SupabaseAuthProvider.js`.
- Update `user-identity` specification scenarios to scope supported Quick Sync OAuth providers to Google and GitHub.
- Update test assertions in `test/auth/auth_terminal_integration.test.js` and `test/auth/supabase_auth_provider.test.js`.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `user-identity`: Update the Quick Sync authentication requirement and Supabase provider requirement to remove Discord from the supported OAuth provider list, keeping Google and GitHub.

## Impact

- `index.html`: Eliminates the `#btnSyncDiscord` DOM element and associated CSS.
- `src/ui/authTerminal.js`: Removes `btnDiscord` lookup and click handler.
- `src/auth/SupabaseAuthProvider.js`: Cleans provider documentation.
- `test/auth/`: Updates Quick Sync provider test assertions to verify Google and GitHub.
