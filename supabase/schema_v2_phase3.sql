-- Mindful OS v2 (phase 3): wellness row-based tables.
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.sleep_entries (
  id text primary key,
  user_id text not null,
  entry_date timestamptz not null default now(),
  bed_time text not null,
  wake_time text,
  duration numeric,
  quality int,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sleep_entries_user_date
  on public.sleep_entries (user_id, entry_date desc);

create table if not exists public.meditation_entries (
  id text primary key,
  user_id text not null,
  entry_date timestamptz not null default now(),
  duration numeric not null default 0,
  type text not null default 'mindfulness',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meditation_entries_user_date
  on public.meditation_entries (user_id, entry_date desc);

create table if not exists public.exercise_entries (
  id text primary key,
  user_id text not null,
  entry_date timestamptz not null default now(),
  type text not null default '',
  duration numeric,
  times int not null default 1,
  calories numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exercise_entries_user_date
  on public.exercise_entries (user_id, entry_date desc);

create table if not exists public.weight_entries (
  id text primary key,
  user_id text not null,
  entry_date timestamptz not null default now(),
  weight numeric not null,
  unit text not null default 'kg',
  body_fat numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weight_entries_user_date
  on public.weight_entries (user_id, entry_date desc);
