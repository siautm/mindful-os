-- Migrate app_state JSON keys into v2 row-based tables (phase 1).
-- Safe to run multiple times.
-- Prerequisite:
--   1) schema_v2_phase1.sql
--   2) rls_policies_v2_phase1.sql

-- =========================
-- Finance
-- state_key: mindful_finance
-- =========================
insert into public.finance_entries (
  id, user_id, type, amount, category, description, entry_date, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  case when coalesce(item->>'type', 'expense') = 'income' then 'income' else 'expense' end as type,
  coalesce(nullif(item->>'amount', '')::numeric, 0) as amount,
  coalesce(nullif(item->>'category', ''), 'Other') as category,
  coalesce(item->>'description', '') as description,
  coalesce(
    nullif(item->>'date', '')::date,
    now()::date
  ) as entry_date,
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_finance'
on conflict (id) do update
set
  type = excluded.type,
  amount = excluded.amount,
  category = excluded.category,
  description = excluded.description,
  entry_date = excluded.entry_date,
  updated_at = now();

-- =========================
-- Timetable
-- state_key: mindful_timetable
-- =========================
insert into public.timetable_entries (
  id, user_id, course_name, course_code, day, start_time, end_time, location, instructor, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  coalesce(item->>'courseName', 'Untitled Course') as course_name,
  coalesce(item->>'courseCode', '') as course_code,
  coalesce(item->>'day', 'Monday') as day,
  coalesce(item->>'startTime', '09:00') as start_time,
  coalesce(item->>'endTime', '10:00') as end_time,
  coalesce(item->>'location', '') as location,
  coalesce(item->>'instructor', '') as instructor,
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_timetable'
on conflict (id) do update
set
  course_name = excluded.course_name,
  course_code = excluded.course_code,
  day = excluded.day,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  location = excluded.location,
  instructor = excluded.instructor,
  updated_at = now();

-- =========================
-- Study plans + parts
-- state_key: mindful_study_plans
-- =========================
insert into public.study_plans (
  id, user_id, name, description, duration_hours, created_at, updated_at
)
select
  coalesce(plan->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  coalesce(plan->>'name', 'Untitled Plan') as name,
  coalesce(plan->>'description', '') as description,
  coalesce(nullif(plan->>'durationHours', '')::numeric, 1) as duration_hours,
  coalesce(nullif(plan->>'createdAt', '')::timestamptz, now()) as created_at,
  now() as updated_at
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as plan
where s.state_key = 'mindful_study_plans'
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  duration_hours = excluded.duration_hours,
  updated_at = now();

insert into public.study_plan_parts (
  id, user_id, plan_id, title, detail, part_order, completed, created_at, updated_at
)
select
  coalesce(part->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  coalesce(plan->>'id', '') as plan_id,
  coalesce(part->>'title', 'Part') as title,
  coalesce(part->>'detail', '') as detail,
  coalesce(nullif(part->>'order', '')::int, 0) as part_order,
  coalesce(nullif(part->>'completed', '')::boolean, false) as completed,
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as plan
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(plan->'parts') = 'array' then plan->'parts' else '[]'::jsonb end
) as part
where s.state_key = 'mindful_study_plans'
  and coalesce(plan->>'id', '') <> ''
on conflict (id) do update
set
  title = excluded.title,
  detail = excluded.detail,
  part_order = excluded.part_order,
  completed = excluded.completed,
  updated_at = now();

-- =========================
-- Habits
-- state_key: mindful_habits
-- =========================
insert into public.habits (
  id, user_id, name, description, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  coalesce(item->>'name', 'Habit') as name,
  coalesce(item->>'description', '') as description,
  coalesce(nullif(item->>'createdAt', '')::timestamptz, now()) as created_at,
  now() as updated_at
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_habits'
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- =========================
-- Habit completions
-- state_key: mindful_habit_days
-- =========================
insert into public.habit_completions (user_id, habit_id, ymd, created_at)
select
  s.user_id,
  coalesce(item->>'habitId', '') as habit_id,
  (item->>'date')::date as ymd,
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_habit_days'
  and coalesce(item->>'habitId', '') <> ''
  and coalesce(item->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (user_id, habit_id, ymd) do nothing;

-- =========================
-- Focus presets
-- state_key: mindful_focus_presets
-- =========================
insert into public.focus_presets (
  id, user_id, name, duration, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text) as id,
  s.user_id,
  coalesce(item->>'name', 'Preset') as name,
  greatest(1, coalesce(nullif(item->>'duration', '')::int, 25)) as duration,
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_focus_presets'
on conflict (id) do update
set
  name = excluded.name,
  duration = excluded.duration,
  updated_at = now();

-- =========================
-- User settings
-- =========================
insert into public.user_settings (user_id, setting_key, setting_value, updated_at)
select user_id, state_key, state_value, now()
from public.app_state
where state_key in (
  'mindful_theme',
  'mindful_focus_wallpaper',
  'mindful_focus_noise_type',
  'mindful_quote_locale',
  'mindful_quote_tags',
  'minigame-highscore',
  'mindful_loading_shown',
  'mindful_checkin_tracking_start'
)
on conflict (user_id, setting_key) do update
set setting_value = excluded.setting_value, updated_at = now();

-- =========================
-- Verification helper views
-- =========================
-- Old app_state counts vs new rows (quick smoke-check)
-- Run manually after migration:
--
-- select
--   (select coalesce(jsonb_array_length(state_value), 0) from app_state where user_id = 'YOUR_USER_ID' and state_key = 'mindful_finance') as old_finance,
--   (select count(*) from finance_entries where user_id = 'YOUR_USER_ID') as new_finance,
--   (select coalesce(jsonb_array_length(state_value), 0) from app_state where user_id = 'YOUR_USER_ID' and state_key = 'mindful_timetable') as old_timetable,
--   (select count(*) from timetable_entries where user_id = 'YOUR_USER_ID') as new_timetable;
