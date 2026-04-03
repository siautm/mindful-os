create extension if not exists "pgcrypto";

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text not null default '',
  urgency int not null default 5,
  importance int not null default 5,
  priority numeric not null default 5,
  due_date text,
  completed boolean not null default false,
  estimated_minutes int not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_id text,
  task_title text,
  duration int not null,
  completed boolean not null default true,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date timestamptz not null default now(),
  mood text not null default 'neutral',
  energy int not null default 3,
  intention text not null default '',
  gratitude text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.app_state (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  state_key text not null,
  state_value jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, state_key)
);

create index if not exists idx_tasks_user_id_created_at on public.tasks (user_id, created_at desc);
create index if not exists idx_focus_sessions_user_id_date on public.focus_sessions (user_id, date desc);
create index if not exists idx_checkins_user_id_date on public.checkins (user_id, date desc);
create index if not exists idx_app_state_user_id on public.app_state (user_id);

