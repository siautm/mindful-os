-- Knowledge entries module (types, field defs, presets, entries).
-- Safe to run multiple times.

create extension if not exists "pgcrypto";

create table if not exists public.entry_types (
  id text primary key,
  user_id text not null,
  type_key text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, type_key)
);

create index if not exists idx_entry_types_user on public.entry_types (user_id, sort_order);

create table if not exists public.entry_type_fields (
  id text primary key,
  user_id text not null,
  type_id text not null references public.entry_types (id) on delete cascade,
  field_key text not null,
  label text not null,
  value_kind text not null default 'text',
  allow_preset boolean not null default false,
  sort_order int not null default 0,
  unique (type_id, field_key)
);

create index if not exists idx_entry_type_fields_type on public.entry_type_fields (type_id, sort_order);

create table if not exists public.entry_type_presets (
  user_id text not null,
  type_id text not null references public.entry_types (id) on delete cascade,
  field_key text not null,
  preset_value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, type_id, field_key)
);

create table if not exists public.entries (
  id text primary key,
  user_id text not null,
  type_id text not null references public.entry_types (id),
  title text not null,
  note text not null default '',
  photo_url text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  entry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entries_user_updated on public.entries (user_id, updated_at desc);
create index if not exists idx_entries_user_type on public.entries (user_id, type_id);
create index if not exists idx_entries_user_pinned on public.entries (user_id, is_pinned desc, updated_at desc);
