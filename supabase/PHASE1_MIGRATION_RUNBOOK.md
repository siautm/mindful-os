# Phase 1 Migration Runbook (Scheme B)

This project now includes phase-1 SQL files:

- `schema_v2_phase1.sql`
- `rls_policies_v2_phase1.sql`
- `migrate_app_state_to_v2_phase1.sql`

## What you need to do

1. Open Supabase SQL Editor (production project).
2. Run files in this order:
   1) `schema_v2_phase1.sql`  
   2) `rls_policies_v2_phase1.sql`  
   3) `migrate_app_state_to_v2_phase1.sql`
3. Verify one user with the checks at the bottom of `migrate_app_state_to_v2_phase1.sql`.

## Safety notes

- Migration is **idempotent** (can run multiple times).
- Old data in `app_state` is **not deleted**.
- If counts mismatch, stop and fix before switching app reads/writes.

## Not included yet

- Frontend/API switch to new v2 tables (next step).
- PDF Storage migration (intentionally excluded).
