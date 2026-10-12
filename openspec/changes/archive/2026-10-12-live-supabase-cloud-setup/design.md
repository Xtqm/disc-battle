# Design

## Context

Phase 3 established the core contracts for authentication (`SupabaseAuthProvider`), the monotonic "Master Grid Protocol" sync engine (`CloudSyncResolver`), multi-tab synchronization (`CrossTabSync`), and offline mutation queuing (`OfflineSyncQueue`). Currently, in the absence of live cloud infrastructure, the game client falls back to an in-memory simulated auth client and local storage persistence.

See `proposal.md` for background and user goals. This design details how live cloud infrastructure is provisioned, how credentials bridge into the client runtime without breaking the zero-build browser setup, and how Postgres schemas and Row-Level Security policies guarantee robust, isolated profile persistence.

## Goals / Non-Goals

**Goals:**
- Provision a live Supabase project `tron-disc-arena` in organization `iovcniluhunnzkacimaw` (region `us-east-1`).
- Securely extract public project endpoint URL and public Anon Key and inject them into client configuration (`.env` and `tron/src/core/env.js`).
- Deploy a PostgreSQL schema `public.save_states` with primary key `user_id` and strict Row Level Security (RLS) policies isolating reads and writes to `auth.uid()`.
- Equip `CloudSyncResolver.js` and `saveState.js` with remote fetch and upsert capabilities over PostgREST.
- Preserve sub-1.5 second offline boot performance and existing offline fallback behavior when disconnected.

**Non-Goals:**
- Migrating peer-to-peer multiplayer signaling or room match logic away from Firebase (Firebase WebRTC signaling remains intact).
- Storing real-time combat tick physics or replay frames in PostgreSQL (only persistent progression states).
- Exposing the Supabase Service Role key to the client (strictly anonymous public key with Postgres RLS enforcement).

## Decisions

### 1. Project Provisioning & Browser Credential Bridge

- **Decision**: Provision the project `tron-disc-arena` via Supabase MCP management API. Populate root `.env` and `tron/.env`, and provide a runtime bridge file `tron/src/core/env.js` loaded before game scripts to initialize `window.__ENV__`.
- **Rationale**: The game client is built with vanilla ES modules directly served to the browser without a Node bundler like Vite or Webpack. Loading an `env.js` bridge file exposes `window.__ENV__.SUPABASE_URL` and `window.__ENV__.SUPABASE_ANON_KEY` cleanly without breaking the zero-build workflow.
- **Alternatives Considered**:
  - *Hardcoding keys directly into source code*: Vulnerable to accidental commits and prevents switching environments.
  - *Introducing a full bundler (e.g. Vite/Webpack)*: Unnecessary build complexity that disrupts current local file serving and test pipelines.

### 2. Database Schema & State Mapping

- **Decision**: Deploy table `public.save_states` in Postgres with columns matching `TronSaveState`:
  - `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `handle TEXT NOT NULL DEFAULT 'PROGRAM'`
  - `bits BIGINT NOT NULL DEFAULT 0`
  - `level INT NOT NULL DEFAULT 1`
  - `star_mastery JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `inventory JSONB NOT NULL DEFAULT '["disc_default"]'::jsonb`
  - `achievements JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `stats JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `settings JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `version INT NOT NULL DEFAULT 1`
  Provide bidirectional row mapping helpers (`saveStateToRow` and `rowToSaveState`) to seamlessly convert between camelCase in JS and snake_case in Postgres.
- **Rationale**: JSONB columns accommodate dynamic structures like star counts per arena tier and arbitrary achievement badges without needing recurring DDL migrations as game content expands.
- **Alternatives Considered**:
  - *Fully normalized relational tables (e.g., separate tables for each inventory item and achievement)*: Requires multiple round trips and complex join transactions on every game save, significantly degrading performance on mobile and high-latency connections.

### 3. Row Level Security (RLS) Isolation

- **Decision**: Enforce RLS on `save_states` with three discrete policies:
  - `SELECT`: `USING (auth.uid() = user_id)`
  - `INSERT`: `WITH CHECK (auth.uid() = user_id)`
  - `UPDATE`: `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`
- **Rationale**: Supabase client uses PostgREST `upsert()`, which translates to an `INSERT ... ON CONFLICT DO UPDATE`. Having explicit matching `INSERT WITH CHECK` and `UPDATE USING/WITH CHECK` policies ensures atomic upsert requests succeed while strictly forbidding cross-user access.
- **Alternatives Considered**:
  - *Permissive single policy*: Can cause permission evaluation discrepancies during Postgres `ON CONFLICT` updates depending on role grants.

### 4. Asynchronous Cloud Sync Flow

- **Decision**: Execute cloud synchronization asynchronously upon authentication resolution:
  1. Boot game immediately from `localStorage` (guaranteeing sub-1.5s boot).
  2. Once `SupabaseAuthProvider` initializes and verifies active session, execute remote query for `save_states`.
  3. If remote state exists, execute `CloudSyncResolver.resolve(localState, remoteState)` under the Master Grid Protocol.
  4. Write resolved state to `localStorage` and upsert to `save_states` in the cloud.
  5. Any network failure routes the payload into `OfflineSyncQueue`.
- **Rationale**: Eliminates network wait times from initial canvas rendering while ensuring eventual consistency across devices and browser sessions.

## Risks / Trade-offs

- **[Risk] PostgREST schema cache delay after table creation**  
  → **Mitigation**: PostgREST automatically reloads schema on DDL execution, but unit and integration tests will include retry tolerance and explicit verification.
- **[Risk] Missing credentials in developer or local test environments**  
  → **Mitigation**: `resolveSupabaseConfig` already gracefully falls back to mock/simulated providers, allowing tests to run completely offline without environment dependencies.
- **[Risk] High frequency save state writes during intense gameplay**  
  → **Mitigation**: Save state mutations are throttled/debounced, with critical writes triggered on match end, level complete, and menu transitions.
