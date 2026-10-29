# Tasks

## 1. UI and Markup Cleanup

- [x] 1.1 Remove the `#btnSyncDiscord` button element and `.discord-sync` CSS styles from `index.html`. Verify that Discord button is removed from the DOM.
- [x] 1.2 Remove the `btnDiscord` DOM lookup and click event listener from `src/ui/authTerminal.js`. Verify script loads without runtime reference errors.

## 2. Provider Documentation & Test Suite Updates

- [x] 2.1 Update JSDoc comments in `src/auth/SupabaseAuthProvider.js` to reflect Google and GitHub as the active OAuth providers. Verify file passes syntax check.
- [x] 2.2 Update `test/auth/auth_terminal_integration.test.js` and `test/auth/supabase_auth_provider.test.js` to verify Google and GitHub Quick Sync buttons without expecting Discord. Run test suite (`npm run test:auth`) and verify all tests pass.
