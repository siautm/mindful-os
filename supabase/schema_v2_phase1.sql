-- Mindful OS v2 (phase 1): row-based tables for key modules.
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

-- Finance: one row per entry
create table if not exists public.finance_entries (
  id text primary key,
  user_id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  category text not null default 'Other',
  description text not null default '',
  entry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_entries_user_date
  on public.finance_entries (user_id, entry_date desc, created_at desc);

-- Timetable: one row per class slot
create table if not exists public.timetable_entries (
  id text primary key,
  user_id text not null,
  course_name text not null,
  course_code text not null default '',
  day text not null,
  start_time text not null,
  end_time text not null,
  location text not null default '',
  instructor text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_timetable_entries_user_day_time
  on public.timetable_entries (user_id, day, start_time, end_time);

-- Study plans (header)
create table if not exists public.study_plans (
  id text primary key,
  user_id text not null,
  name text not null,
  description text not null default '',
  duration_hours numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_plans_user_created
  on public.study_plans (user_id, created_at desc);

-- Study plan parts (detail rows)
create table if not exists public.study_plan_parts (
  id text primary key,
  user_id text not null,
  plan_id text not null references public.study_plans(id) on delete cascade,
  title text not null,
  detail text not null default '',
  part_order int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_study_plan_parts_user_plan_order
  on public.study_plan_parts (user_id, plan_id, part_order);

-- Habits
create table if not exists public.habits (
  id text primary key,
  user_id text not null,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_habits_user_created
  on public.habits (user_id, created_at desc);

-- Habit completions (one row per habit/day)
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  habit_id text not null references public.habits(id) on delete cascade,
  ymd date not null,
  created_at timestamptz not null default now(),
  unique (user_id, habit_id, ymd)
);

create index if not exists idx_habit_completions_user_day
  on public.habit_completions (user_id, ymd desc);

-- Focus presets
create table if not exists public.focus_presets (
  id text primary key,
  user_id text not null,
  name text not null,
  duration int not null check (duration > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_focus_presets_user_created
  on public.focus_presets (user_id, created_at desc);

-- User settings for small scalar/blob settings
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  setting_key text not null,
  setting_value jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, setting_key)
);

create index if not exists idx_user_settings_user_key
  on public.user_settings (user_id, setting_key);
