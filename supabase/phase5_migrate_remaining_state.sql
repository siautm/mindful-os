-- Phase 5: migrate remaining generic state off app_state.
-- This creates a replacement table used by /api/state, copies existing data,
-- and configures RLS so app_state can be retired safely afterwards.
--
-- Safe to run multiple times.

create table if not exists public.user_state (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  state_key text not null,
  state_value jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, state_key)
);

create index if not exists idx_user_state_user_id on public.user_state (user_id);

alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
drop policy if exists "user_state_insert_own" on public.user_state;
drop policy if exists "user_state_update_own" on public.user_state;
drop policy if exists "user_state_delete_own" on public.user_state;

create policy "user_state_select_own"
  on public.user_state for select to authenticated
  using (user_id = (auth.uid())::text);

create policy "user_state_insert_own"
  on public.user_state for insert to authenticated
  with check (user_id = (auth.uid())::text);

create policy "user_state_update_own"
  on public.user_state for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "user_state_delete_own"
  on public.user_state for delete to authenticated
  using (user_id = (auth.uid())::text);

-- one-time copy from legacy app_state (if table exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'app_state'
  ) then
    insert into public.user_state (user_id, state_key, state_value, updated_at)
    select user_id, state_key, state_value, updated_at
    from public.app_state
    on conflict (user_id, state_key) do update
    set
      state_value = excluded.state_value,
      updated_at = excluded.updated_at;
  end if;
end $$;
