# Proposal

## Why

Phase 3 established the software contracts for Supabase authentication, the Master Grid Protocol monotonic sync engine, and multi-tab synchronization. However, the client is currently operating in an offline simulated fallback state because no live Supabase cloud project has been provisioned, no `.env` or client runtime credentials are configured, and no PostgreSQL storage schema with Row Level Security (RLS) exists to persist player profiles and save states.

This change provisions a live Supabase project for **Tron Disc Arena**, retrieves the live API URL and Anon Key, injects them into the client runtime via `.env` / runtime config, and deploys the PostgreSQL `save_states` table with strict Row Level Security (RLS) so that `CloudSyncResolver` and `AuthManager` persist and restore player progress to and from the live cloud.

## What Changes

- **Live Supabase Project Provisioning**:
  - Provision a dedicated Supabase project (`tron-disc-arena`) in region `us-east-1` within organization `iovcniluhunnzkacimaw`.
  - Retrieve the live project API URL and public Anon Key.
- **Client Configuration & Credential Injection**:
  - Configure `.env` and `tron/.env` containing `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
  - Provide a browser runtime config bridge (`tron/src/core/env.js` / `window.__ENV__`) to ensure vanilla client modules seamlessly read live cloud credentials.
- **Postgres Database Schema & RLS Policies**:
  - Deploy the `save_states` table migration in Postgres with columns matching `TronSaveState` (`user_id`, `handle`, `bits`, `level`, `star_mastery`, `inventory`, `achievements`, `stats`, `settings`, `last_active_at`, `created_at`, `version`).
  - Configure Row Level Security (RLS) policies:
    - `SELECT`: Users can read their own save state (`auth.uid() = user_id`).
    - `INSERT` / `UPDATE` / `UPSERT`: Users can insert or update only their own save state (`auth.uid() = user_id`).
- **CloudSyncResolver Remote PostgREST Persistence**:
  - Connect `CloudSyncResolver` / `saveState.js` to execute real remote upserts and fetches against the Supabase `save_states` table when online.

## Capabilities

### New Capabilities
*(None - extends existing identity and save state capabilities)*

### Modified Capabilities
- `user-identity`: Adds requirements for live Cloud Database Persistence with Row-Level Security (RLS) and Runtime Cloud Configuration Provisioning.

## Impact

- **Infrastructure**: Creates a live Supabase project on the cloud with PostgreSQL database and GoTrue auth service.
- **Database Schema**: Adds `save_states` table with primary key `user_id` and RLS security policies in Supabase.
- **Client Configuration**: Creates `.env` and client loader `tron/src/core/env.js` (bridged into `tron/index.html` and `main.js`).
- **Storage Subsystem**: Extends `CloudSyncResolver.js` and `saveState.js` with remote Postgres fetch and upsert capabilities.
