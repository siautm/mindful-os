-- RLS for v2 phase 1 tables.
-- Run after schema_v2_phase1.sql

-- finance_entries
alter table public.finance_entries enable row level security;
drop policy if exists "finance_entries_select_own" on public.finance_entries;
drop policy if exists "finance_entries_insert_own" on public.finance_entries;
drop policy if exists "finance_entries_update_own" on public.finance_entries;
drop policy if exists "finance_entries_delete_own" on public.finance_entries;
create policy "finance_entries_select_own"
  on public.finance_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "finance_entries_insert_own"
  on public.finance_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "finance_entries_update_own"
  on public.finance_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "finance_entries_delete_own"
  on public.finance_entries for delete to authenticated
  using (user_id = (auth.uid())::text);

-- timetable_entries
alter table public.timetable_entries enable row level security;
drop policy if exists "timetable_entries_select_own" on public.timetable_entries;
drop policy if exists "timetable_entries_insert_own" on public.timetable_entries;
drop policy if exists "timetable_entries_update_own" on public.timetable_entries;
drop policy if exists "timetable_entries_delete_own" on public.timetable_entries;
create policy "timetable_entries_select_own"
  on public.timetable_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "timetable_entries_insert_own"
  on public.timetable_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "timetable_entries_update_own"
  on public.timetable_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "timetable_entries_delete_own"
  on public.timetable_entries for delete to authenticated
  using (user_id = (auth.uid())::text);

-- study_plans
alter table public.study_plans enable row level security;
drop policy if exists "study_plans_select_own" on public.study_plans;
drop policy if exists "study_plans_insert_own" on public.study_plans;
drop policy if exists "study_plans_update_own" on public.study_plans;
drop policy if exists "study_plans_delete_own" on public.study_plans;
create policy "study_plans_select_own"
  on public.study_plans for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "study_plans_insert_own"
  on public.study_plans for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "study_plans_update_own"
  on public.study_plans for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "study_plans_delete_own"
  on public.study_plans for delete to authenticated
  using (user_id = (auth.uid())::text);

-- study_plan_parts
alter table public.study_plan_parts enable row level security;
drop policy if exists "study_plan_parts_select_own" on public.study_plan_parts;
drop policy if exists "study_plan_parts_insert_own" on public.study_plan_parts;
drop policy if exists "study_plan_parts_update_own" on public.study_plan_parts;
drop policy if exists "study_plan_parts_delete_own" on public.study_plan_parts;
create policy "study_plan_parts_select_own"
  on public.study_plan_parts for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "study_plan_parts_insert_own"
  on public.study_plan_parts for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "study_plan_parts_update_own"
  on public.study_plan_parts for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "study_plan_parts_delete_own"
  on public.study_plan_parts for delete to authenticated
  using (user_id = (auth.uid())::text);

-- habits
alter table public.habits enable row level security;
drop policy if exists "habits_select_own" on public.habits;
drop policy if exists "habits_insert_own" on public.habits;
drop policy if exists "habits_update_own" on public.habits;
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_select_own"
  on public.habits for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "habits_insert_own"
  on public.habits for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "habits_update_own"
  on public.habits for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "habits_delete_own"
  on public.habits for delete to authenticated
  using (user_id = (auth.uid())::text);

-- habit_completions
alter table public.habit_completions enable row level security;
drop policy if exists "habit_completions_select_own" on public.habit_completions;
drop policy if exists "habit_completions_insert_own" on public.habit_completions;
drop policy if exists "habit_completions_update_own" on public.habit_completions;
drop policy if exists "habit_completions_delete_own" on public.habit_completions;
create policy "habit_completions_select_own"
  on public.habit_completions for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "habit_completions_insert_own"
  on public.habit_completions for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "habit_completions_update_own"
  on public.habit_completions for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "habit_completions_delete_own"
  on public.habit_completions for delete to authenticated
  using (user_id = (auth.uid())::text);

-- focus_presets
alter table public.focus_presets enable row level security;
drop policy if exists "focus_presets_select_own" on public.focus_presets;
drop policy if exists "focus_presets_insert_own" on public.focus_presets;
drop policy if exists "focus_presets_update_own" on public.focus_presets;
drop policy if exists "focus_presets_delete_own" on public.focus_presets;
create policy "focus_presets_select_own"
  on public.focus_presets for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "focus_presets_insert_own"
  on public.focus_presets for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "focus_presets_update_own"
  on public.focus_presets for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "focus_presets_delete_own"
  on public.focus_presets for delete to authenticated
  using (user_id = (auth.uid())::text);

-- user_settings
alter table public.user_settings enable row level security;
drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;
drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "user_settings_insert_own"
  on public.user_settings for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "user_settings_update_own"
  on public.user_settings for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "user_settings_delete_own"
  on public.user_settings for delete to authenticated
  using (user_id = (auth.uid())::text);
