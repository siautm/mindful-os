-- Migrate app_state wellness keys to v2 phase-3 tables.
-- Safe to run multiple times.

-- checkins (existing table, but keep id stable from app_state)
insert into public.checkins (
  id, user_id, date, mood, energy, intention, gratitude, note, created_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text)::uuid,
  s.user_id,
  coalesce(nullif(item->>'date', '')::timestamptz, now()),
  coalesce(item->>'mood', 'neutral'),
  coalesce(nullif(item->>'energy', '')::int, 3),
  coalesce(item->>'intention', ''),
  coalesce(item->>'gratitude', ''),
  coalesce(item->>'note', ''),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_checkins'
on conflict (id) do update
set
  mood = excluded.mood,
  energy = excluded.energy,
  intention = excluded.intention,
  gratitude = excluded.gratitude,
  note = excluded.note,
  date = excluded.date;

-- sleep_entries
insert into public.sleep_entries (
  id, user_id, entry_date, bed_time, wake_time, duration, quality, notes, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text),
  s.user_id,
  coalesce(nullif(item->>'date', '')::timestamptz, now()),
  coalesce(item->>'bedTime', ''),
  nullif(item->>'wakeTime', ''),
  nullif(item->>'duration', '')::numeric,
  nullif(item->>'quality', '')::int,
  coalesce(item->>'notes', ''),
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_sleep'
on conflict (id) do update
set
  entry_date = excluded.entry_date,
  bed_time = excluded.bed_time,
  wake_time = excluded.wake_time,
  duration = excluded.duration,
  quality = excluded.quality,
  notes = excluded.notes,
  updated_at = now();

-- meditation_entries
insert into public.meditation_entries (
  id, user_id, entry_date, duration, type, notes, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text),
  s.user_id,
  coalesce(nullif(item->>'date', '')::timestamptz, now()),
  coalesce(nullif(item->>'duration', '')::numeric, 0),
  coalesce(item->>'type', 'mindfulness'),
  coalesce(item->>'notes', ''),
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_meditation'
on conflict (id) do update
set
  entry_date = excluded.entry_date,
  duration = excluded.duration,
  type = excluded.type,
  notes = excluded.notes,
  updated_at = now();

-- exercise_entries
insert into public.exercise_entries (
  id, user_id, entry_date, type, duration, times, calories, notes, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text),
  s.user_id,
  coalesce(nullif(item->>'date', '')::timestamptz, now()),
  coalesce(item->>'type', ''),
  nullif(item->>'duration', '')::numeric,
  greatest(1, coalesce(nullif(item->>'times', '')::int, 1)),
  nullif(item->>'calories', '')::numeric,
  coalesce(item->>'notes', ''),
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_exercise'
on conflict (id) do update
set
  entry_date = excluded.entry_date,
  type = excluded.type,
  duration = excluded.duration,
  times = excluded.times,
  calories = excluded.calories,
  notes = excluded.notes,
  updated_at = now();

-- weight_entries
insert into public.weight_entries (
  id, user_id, entry_date, weight, unit, body_fat, notes, created_at, updated_at
)
select
  coalesce(item->>'id', gen_random_uuid()::text),
  s.user_id,
  coalesce(nullif(item->>'date', '')::timestamptz, now()),
  coalesce(nullif(item->>'weight', '')::numeric, 0),
  coalesce(item->>'unit', 'kg'),
  nullif(item->>'bodyFat', '')::numeric,
  coalesce(item->>'notes', ''),
  now(),
  now()
from public.app_state s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.state_value) = 'array' then s.state_value else '[]'::jsonb end
) as item
where s.state_key = 'mindful_weight'
on conflict (id) do update
set
  entry_date = excluded.entry_date,
  weight = excluded.weight,
  unit = excluded.unit,
  body_fat = excluded.body_fat,
  notes = excluded.notes,
  updated_at = now();
