# Tasks

## 1. Cloud Project Provisioning & Secret Extraction

- [x] 1.1 Provision the Supabase cloud project `tron-disc-arena` under organization `iovcniluhunnzkacimaw` in region `us-east-1` and verify project creation succeeds via Supabase API.
- [x] 1.2 Retrieve the project API URL and public Anon Key using Supabase project inspection tools and verify non-empty URL and publishable key strings.

## 2. Postgres Schema & Row Level Security Deployment

- [x] 2.1 Deploy the PostgreSQL DDL migration creating table `public.save_states` with required columns (`user_id`, `handle`, `bits`, `level`, `star_mastery`, `inventory`, `achievements`, `stats`, `settings`, `created_at`, `last_active_at`, `version`) and verify table existence in database.
- [x] 2.2 Configure and apply Row Level Security (RLS) policies on `public.save_states` for `SELECT`, `INSERT`, and `UPDATE` isolating rows to `auth.uid() = user_id`, verifying policy configuration via SQL query.

## 3. Client Environment Configuration & Browser Runtime Bridge

- [x] 3.1 Create `.env` and `tron/.env` files containing `SUPABASE_URL` and `SUPABASE_ANON_KEY`, ensuring `.gitignore` protects secrets while tracking template `.env.example`.
- [x] 3.2 Create client runtime configuration bridge `tron/src/core/env.js` and wire it into `tron/index.html` to populate `window.__ENV__`, verifying variables are accessible in browser runtime.

## 4. Remote Cloud Persistence & Monotonic Sync Integration

- [x] 4.1 Implement `fetchRemoteSaveState` and `upsertRemoteSaveState` with bidirectional camelCase/snake_case row mapping in `tron/src/storage/CloudSyncResolver.js` (and `src/core/storage/CloudSyncResolver.js`), verifying unit tests pass for row serialization.
- [x] 4.2 Integrate remote fetch and upsert synchronization into `tron/src/auth/saveState.js` and `authManager.js` to execute automatic cloud sync upon authentication resolution and mutation events, verifying sync event dispatching.

## 5. End-to-End Verification & Integration Testing

- [x] 5.1 Create unit and integration test suite `test/supabase_cloud_sync.test.js` validating remote state fetch, RLS-conforming payload upsert, and fallback behavior when offline, running all tests via `npm test`.
- [x] 5.2 Validate cross-tab synchronization and offline queueing behavior with live/mock Supabase configuration, verifying zero regressions across all game suites.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
- Commit all changes to source control.
