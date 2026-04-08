-- Row Level Security for Mindful OS tables.
-- Run this in Supabase SQL Editor AFTER schema.sql is applied.
--
-- Your Vercel API uses the service_role key: it bypasses RLS and keeps working.
-- The anon (publishable) key can no longer read/write these tables without a valid
-- user JWT; policies below allow authenticated users to touch only their own rows
-- (user_id must equal auth.uid() as text).

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own"
  on public.tasks for select
  to authenticated
  using (user_id = (auth.uid())::text);

create policy "tasks_insert_own"
  on public.tasks for insert
  to authenticated
  with check (user_id = (auth.uid())::text);

create policy "tasks_update_own"
  on public.tasks for update
  to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "tasks_delete_own"
  on public.tasks for delete
  to authenticated
  using (user_id = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- focus_sessions
-- ---------------------------------------------------------------------------
alter table public.focus_sessions enable row level security;

drop policy if exists "focus_sessions_select_own" on public.focus_sessions;
drop policy if exists "focus_sessions_insert_own" on public.focus_sessions;
drop policy if exists "focus_sessions_update_own" on public.focus_sessions;
drop policy if exists "focus_sessions_delete_own" on public.focus_sessions;

create policy "focus_sessions_select_own"
  on public.focus_sessions for select
  to authenticated
  using (user_id = (auth.uid())::text);

create policy "focus_sessions_insert_own"
  on public.focus_sessions for insert
  to authenticated
  with check (user_id = (auth.uid())::text);

create policy "focus_sessions_update_own"
  on public.focus_sessions for update
  to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "focus_sessions_delete_own"
  on public.focus_sessions for delete
  to authenticated
  using (user_id = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- checkins
-- ---------------------------------------------------------------------------
alter table public.checkins enable row level security;

drop policy if exists "checkins_select_own" on public.checkins;
drop policy if exists "checkins_insert_own" on public.checkins;
drop policy if exists "checkins_update_own" on public.checkins;
drop policy if exists "checkins_delete_own" on public.checkins;

create policy "checkins_select_own"
  on public.checkins for select
  to authenticated
  using (user_id = (auth.uid())::text);

create policy "checkins_insert_own"
  on public.checkins for insert
  to authenticated
  with check (user_id = (auth.uid())::text);

create policy "checkins_update_own"
  on public.checkins for update
  to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "checkins_delete_own"
  on public.checkins for delete
  to authenticated
  using (user_id = (auth.uid())::text);

-- ---------------------------------------------------------------------------
-- app_state (key/value rows per user)
-- ---------------------------------------------------------------------------
alter table public.app_state enable row level security;

drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;
drop policy if exists "app_state_delete_own" on public.app_state;

create policy "app_state_select_own"
  on public.app_state for select
  to authenticated
  using (user_id = (auth.uid())::text);

create policy "app_state_insert_own"
  on public.app_state for insert
  to authenticated
  with check (user_id = (auth.uid())::text);

create policy "app_state_update_own"
  on public.app_state for update
  to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

create policy "app_state_delete_own"
  on public.app_state for delete
  to authenticated
  using (user_id = (auth.uid())::text);
