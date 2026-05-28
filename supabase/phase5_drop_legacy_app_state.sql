-- Optional final step after confirming /api/state reads/writes user_state.
-- Run only when you are ready to fully retire app_state.

drop trigger if exists trg_sync_phase1_tables_from_app_state on public.app_state;
drop trigger if exists trg_sync_phase3_tables_from_app_state on public.app_state;

drop function if exists public.sync_phase1_tables_from_app_state_row();
drop function if exists public.sync_phase1_tables_from_app_state_snapshot(text, text, jsonb);
drop function if exists public.sync_phase3_tables_from_app_state_row();
drop function if exists public.sync_phase3_tables_from_app_state_snapshot(text, text, jsonb);

drop table if exists public.app_state;
