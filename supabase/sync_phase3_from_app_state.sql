-- Temporary bridge: keep phase-3 wellness tables synced from app_state snapshots.

create or replace function public.sync_phase3_tables_from_app_state_snapshot(
  p_user_id text,
  p_state_key text,
  p_state_value jsonb
)
returns void
language plpgsql
as $$
begin
  if p_state_key = 'mindful_checkins' then
    delete from public.checkins where user_id = p_user_id;
    insert into public.checkins (id, user_id, date, mood, energy, intention, gratitude, note, created_at)
    select
      coalesce(item->>'id', gen_random_uuid()::text)::uuid,
      p_user_id,
      coalesce(nullif(item->>'date', '')::timestamptz, now()),
      coalesce(item->>'mood', 'neutral'),
      coalesce(nullif(item->>'energy', '')::int, 3),
      coalesce(item->>'intention', ''),
      coalesce(item->>'gratitude', ''),
      coalesce(item->>'note', ''),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      date = excluded.date,
      mood = excluded.mood,
      energy = excluded.energy,
      intention = excluded.intention,
      gratitude = excluded.gratitude,
      note = excluded.note;
    return;
  end if;

  if p_state_key = 'mindful_sleep' then
    delete from public.sleep_entries where user_id = p_user_id;
    insert into public.sleep_entries (
      id, user_id, entry_date, bed_time, wake_time, duration, quality, notes, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(nullif(item->>'date', '')::timestamptz, now()),
      coalesce(item->>'bedTime', ''),
      nullif(item->>'wakeTime', ''),
      nullif(item->>'duration', '')::numeric,
      nullif(item->>'quality', '')::int,
      coalesce(item->>'notes', ''),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      entry_date = excluded.entry_date,
      bed_time = excluded.bed_time,
      wake_time = excluded.wake_time,
      duration = excluded.duration,
      quality = excluded.quality,
      notes = excluded.notes,
      updated_at = now();
    return;
  end if;

  if p_state_key = 'mindful_meditation' then
    delete from public.meditation_entries where user_id = p_user_id;
    insert into public.meditation_entries (
      id, user_id, entry_date, duration, type, notes, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(nullif(item->>'date', '')::timestamptz, now()),
      coalesce(nullif(item->>'duration', '')::numeric, 0),
      coalesce(item->>'type', 'mindfulness'),
      coalesce(item->>'notes', ''),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      entry_date = excluded.entry_date,
      duration = excluded.duration,
      type = excluded.type,
      notes = excluded.notes,
      updated_at = now();
    return;
  end if;

  if p_state_key = 'mindful_exercise' then
    delete from public.exercise_entries where user_id = p_user_id;
    insert into public.exercise_entries (
      id, user_id, entry_date, type, duration, times, calories, notes, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(nullif(item->>'date', '')::timestamptz, now()),
      coalesce(item->>'type', ''),
      nullif(item->>'duration', '')::numeric,
      greatest(1, coalesce(nullif(item->>'times', '')::int, 1)),
      nullif(item->>'calories', '')::numeric,
      coalesce(item->>'notes', ''),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      entry_date = excluded.entry_date,
      type = excluded.type,
      duration = excluded.duration,
      times = excluded.times,
      calories = excluded.calories,
      notes = excluded.notes,
      updated_at = now();
    return;
  end if;

  if p_state_key = 'mindful_weight' then
    delete from public.weight_entries where user_id = p_user_id;
    insert into public.weight_entries (
      id, user_id, entry_date, weight, unit, body_fat, notes, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      p_user_id,
      coalesce(nullif(item->>'date', '')::timestamptz, now()),
      coalesce(nullif(item->>'weight', '')::numeric, 0),
      coalesce(item->>'unit', 'kg'),
      nullif(item->>'bodyFat', '')::numeric,
      coalesce(item->>'notes', ''),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(p_state_value) = 'array' then p_state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      entry_date = excluded.entry_date,
      weight = excluded.weight,
      unit = excluded.unit,
      body_fat = excluded.body_fat,
      notes = excluded.notes,
      updated_at = now();
    return;
  end if;
end;
$$;

create or replace function public.sync_phase3_tables_from_app_state_row()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_phase3_tables_from_app_state_snapshot(new.user_id, new.state_key, new.state_value);
  return new;
end;
$$;

drop trigger if exists trg_sync_phase3_tables_from_app_state on public.app_state;

create trigger trg_sync_phase3_tables_from_app_state
after insert or update of state_value on public.app_state
for each row
when (
  new.state_key in (
    'mindful_checkins',
    'mindful_sleep',
    'mindful_meditation',
    'mindful_exercise',
    'mindful_weight'
  )
)
execute function public.sync_phase3_tables_from_app_state_row();

-- One-time backfill from current app_state rows
do $$
declare
  r record;
begin
  for r in
    select user_id, state_key, state_value
    from public.app_state
    where state_key in (
      'mindful_checkins',
      'mindful_sleep',
      'mindful_meditation',
      'mindful_exercise',
      'mindful_weight'
    )
  loop
    perform public.sync_phase3_tables_from_app_state_snapshot(r.user_id, r.state_key, r.state_value);
  end loop;
end $$;
