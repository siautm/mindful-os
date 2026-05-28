-- Phase 4 cutover:
-- 1) stop app_state -> v2 bridge triggers/functions
-- 2) remove migrated app_state keys
-- 3) keep app_state table for still-active keys only
--
-- Safe to run multiple times.

-- Phase 1 bridge
drop trigger if exists trg_sync_phase1_tables_from_app_state on public.app_state;
drop function if exists public.sync_phase1_tables_from_app_state_row();
drop function if exists public.sync_phase1_tables_from_app_state_snapshot(text, text, jsonb);

-- Phase 3 bridge
drop trigger if exists trg_sync_phase3_tables_from_app_state on public.app_state;
drop function if exists public.sync_phase3_tables_from_app_state_row();
drop function if exists public.sync_phase3_tables_from_app_state_snapshot(text, text, jsonb);

-- Older single-module bridge (if leftover)
drop trigger if exists trg_sync_finance_entries_from_app_state on public.app_state;
drop function if exists public.sync_finance_entries_from_app_state_row();
drop function if exists public.sync_finance_entries_from_app_state_snapshot(text, jsonb);

-- Remove migrated keys from app_state so they cannot drift.
delete from public.app_state
where state_key in (
  'mindful_finance',
  'mindful_timetable',
  'mindful_study_plans',
  'mindful_habits',
  'mindful_habit_days',
  'mindful_focus_presets',
  'mindful_checkins',
  'mindful_sleep',
  'mindful_meditation',
  'mindful_exercise',
  'mindful_weight'
);

-- Optional verification
select state_key, count(*) as rows_left
from public.app_state
where state_key in (
  'mindful_finance',
  'mindful_timetable',
  'mindful_study_plans',
  'mindful_habits',
  'mindful_habit_days',
  'mindful_focus_presets',
  'mindful_checkins',
  'mindful_sleep',
  'mindful_meditation',
  'mindful_exercise',
  'mindful_weight'
)
group by state_key
order by state_key;
