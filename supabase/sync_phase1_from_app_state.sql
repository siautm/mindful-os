-- Temporary bridge: keep phase-1 v2 tables synced from app_state snapshots.
-- Use this until all frontend pages are fully switched to new APIs/tables.
--
-- Covered keys:
-- - mindful_finance        -> finance_entries
-- - mindful_timetable      -> timetable_entries
-- - mindful_study_plans    -> study_plans + study_plan_parts
-- - mindful_habits         -> habits
-- - mindful_habit_days     -> habit_completions
-- - mindful_focus_presets  -> focus_presets

-- Remove older finance-only bridge trigger if it exists
drop trigger if exists trg_sync_finance_entries_from_app_state on public.app_state;

create or replace function public.sync_phase1_tables_from_app_state_snapshot(
  p_user_id text,
  p_state_key text,
  p_state_value jsonb
)
returns void
language plpgsql
as $$
begin
  -- Finance
  if p_state_key = 'mindful_finance' then
    delete from public.finance_entries where user_id = p_user_id;

    insert into public.finance_entries (
      id, user_id, type, amount, category, description, entry_date, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text) as id,
      p_user_id,
      case when coalesce(item->>'type', 'expense') = 'income' then 'income' else 'expense' end as type,
      coalesce(nullif(item->>'amount', '')::numeric, 0) as amount,
      coalesce(nullif(item->>'category', ''), 'Other') as category,
      coalesce(item->>'description', '') as description,
      coalesce(nullif(item->>'date', '')::date, now()::date) as entry_date,
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      type = excluded.type,
      amount = excluded.amount,
      category = excluded.category,
      description = excluded.description,
      entry_date = excluded.entry_date,
      updated_at = now();

    return;
  end if;

  -- Timetable
  if p_state_key = 'mindful_timetable' then
    delete from public.timetable_entries where user_id = p_user_id;

    insert into public.timetable_entries (
      id, user_id, course_name, course_code, day, start_time, end_time, location, instructor, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(item->>'courseName', 'Untitled Course'),
      coalesce(item->>'courseCode', ''),
      coalesce(item->>'day', 'Monday'),
      coalesce(item->>'startTime', '09:00'),
      coalesce(item->>'endTime', '10:00'),
      coalesce(item->>'location', ''),
      coalesce(item->>'instructor', ''),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
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

    return;
  end if;

  -- Study plans + parts
  if p_state_key = 'mindful_study_plans' then
    delete from public.study_plans where user_id = p_user_id; -- cascade deletes parts

    insert into public.study_plans (
      id, user_id, name, description, duration_hours, created_at, updated_at
    )
    select
      coalesce(plan->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(plan->>'name', 'Untitled Plan'),
      coalesce(plan->>'description', ''),
      coalesce(nullif(plan->>'durationHours', '')::numeric, 1),
      coalesce(nullif(plan->>'createdAt', '')::timestamptz, now()),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as plan
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
      coalesce(part->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(plan->>'id', ''),
      coalesce(part->>'title', 'Part'),
      coalesce(part->>'detail', ''),
      coalesce(nullif(part->>'order', '')::int, 0),
      coalesce(nullif(part->>'completed', '')::boolean, false),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as plan
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(plan->'parts') = 'array' then plan->'parts' else '[]'::jsonb end
    ) as part
    where coalesce(plan->>'id', '') <> ''
    on conflict (id) do update
    set
      title = excluded.title,
      detail = excluded.detail,
      part_order = excluded.part_order,
      completed = excluded.completed,
      updated_at = now();

    return;
  end if;

  -- Habits
  if p_state_key = 'mindful_habits' then
    delete from public.habits where user_id = p_user_id; -- cascade deletes habit_completions

    insert into public.habits (
      id, user_id, name, description, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(item->>'name', 'Habit'),
      coalesce(item->>'description', ''),
      coalesce(nullif(item->>'createdAt', '')::timestamptz, now()),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      name = excluded.name,
      description = excluded.description,
      updated_at = now();

    return;
  end if;

  -- Habit completions
  if p_state_key = 'mindful_habit_days' then
    delete from public.habit_completions where user_id = p_user_id;

    insert into public.habit_completions (user_id, habit_id, ymd, created_at)
    select
      p_user_id,
      coalesce(item->>'habitId', '') as habit_id,
      (item->>'date')::date as ymd,
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    where coalesce(item->>'habitId', '') <> ''
      and coalesce(item->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
    on conflict (user_id, habit_id, ymd) do nothing;

    return;
  end if;

  -- Focus presets
  if p_state_key = 'mindful_focus_presets' then
    delete from public.focus_presets where user_id = p_user_id;

    insert into public.focus_presets (
      id, user_id, name, duration, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(item->>'name', 'Preset'),
      greatest(1, coalesce(nullif(item->>'duration', '')::int, 25)),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      name = excluded.name,
      duration = excluded.duration,
      updated_at = now();

    return;
  end if;
end;
$$;

create or replace function public.sync_phase1_tables_from_app_state_row()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_phase1_tables_from_app_state_snapshot(new.user_id, new.state_key, new.state_value);
  return new;
end;
$$;

drop trigger if exists trg_sync_phase1_tables_from_app_state on public.app_state;

create trigger trg_sync_phase1_tables_from_app_state
after insert or update of state_value on public.app_state
for each row
when (
  new.state_key in (
    'mindful_finance',
    'mindful_timetable',
    'mindful_study_plans',
    'mindful_habits',
    'mindful_habit_days',
    'mindful_focus_presets'
  )
)
execute function public.sync_phase1_tables_from_app_state_row();

-- One-time backfill from current app_state rows
do $$
declare
  r record;
begin
  for r in
    select user_id, state_key, state_value
    from public.app_state
    where state_key in (
      'mindful_finance',
      'mindful_timetable',
      'mindful_study_plans',
      'mindful_habits',
      'mindful_habit_days',
      'mindful_focus_presets'
    )
  loop
    perform public.sync_phase1_tables_from_app_state_snapshot(r.user_id, r.state_key, r.state_value);
  end loop;
end $$;
