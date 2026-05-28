-- RLS for v2 phase 3 wellness tables.
-- Run after schema_v2_phase3.sql

-- sleep_entries
alter table public.sleep_entries enable row level security;
drop policy if exists "sleep_entries_select_own" on public.sleep_entries;
drop policy if exists "sleep_entries_insert_own" on public.sleep_entries;
drop policy if exists "sleep_entries_update_own" on public.sleep_entries;
drop policy if exists "sleep_entries_delete_own" on public.sleep_entries;
create policy "sleep_entries_select_own"
  on public.sleep_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "sleep_entries_insert_own"
  on public.sleep_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "sleep_entries_update_own"
  on public.sleep_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "sleep_entries_delete_own"
  on public.sleep_entries for delete to authenticated
  using (user_id = (auth.uid())::text);

-- meditation_entries
alter table public.meditation_entries enable row level security;
drop policy if exists "meditation_entries_select_own" on public.meditation_entries;
drop policy if exists "meditation_entries_insert_own" on public.meditation_entries;
drop policy if exists "meditation_entries_update_own" on public.meditation_entries;
drop policy if exists "meditation_entries_delete_own" on public.meditation_entries;
create policy "meditation_entries_select_own"
  on public.meditation_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "meditation_entries_insert_own"
  on public.meditation_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "meditation_entries_update_own"
  on public.meditation_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "meditation_entries_delete_own"
  on public.meditation_entries for delete to authenticated
  using (user_id = (auth.uid())::text);

-- exercise_entries
alter table public.exercise_entries enable row level security;
drop policy if exists "exercise_entries_select_own" on public.exercise_entries;
drop policy if exists "exercise_entries_insert_own" on public.exercise_entries;
drop policy if exists "exercise_entries_update_own" on public.exercise_entries;
drop policy if exists "exercise_entries_delete_own" on public.exercise_entries;
create policy "exercise_entries_select_own"
  on public.exercise_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "exercise_entries_insert_own"
  on public.exercise_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "exercise_entries_update_own"
  on public.exercise_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "exercise_entries_delete_own"
  on public.exercise_entries for delete to authenticated
  using (user_id = (auth.uid())::text);

-- weight_entries
alter table public.weight_entries enable row level security;
drop policy if exists "weight_entries_select_own" on public.weight_entries;
drop policy if exists "weight_entries_insert_own" on public.weight_entries;
drop policy if exists "weight_entries_update_own" on public.weight_entries;
drop policy if exists "weight_entries_delete_own" on public.weight_entries;
create policy "weight_entries_select_own"
  on public.weight_entries for select to authenticated
  using (user_id = (auth.uid())::text);
create policy "weight_entries_insert_own"
  on public.weight_entries for insert to authenticated
  with check (user_id = (auth.uid())::text);
create policy "weight_entries_update_own"
  on public.weight_entries for update to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
create policy "weight_entries_delete_own"
  on public.weight_entries for delete to authenticated
  using (user_id = (auth.uid())::text);
