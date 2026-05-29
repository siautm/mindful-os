-- RLS for entries module. Run after schema_entries.sql

alter table public.entry_types enable row level security;
drop policy if exists "entry_types_select_own" on public.entry_types;
drop policy if exists "entry_types_insert_own" on public.entry_types;
drop policy if exists "entry_types_update_own" on public.entry_types;
drop policy if exists "entry_types_delete_own" on public.entry_types;
create policy "entry_types_select_own" on public.entry_types for select to authenticated using (user_id = (auth.uid())::text);
create policy "entry_types_insert_own" on public.entry_types for insert to authenticated with check (user_id = (auth.uid())::text);
create policy "entry_types_update_own" on public.entry_types for update to authenticated using (user_id = (auth.uid())::text) with check (user_id = (auth.uid())::text);
create policy "entry_types_delete_own" on public.entry_types for delete to authenticated using (user_id = (auth.uid())::text);

alter table public.entry_type_fields enable row level security;
drop policy if exists "entry_type_fields_select_own" on public.entry_type_fields;
drop policy if exists "entry_type_fields_insert_own" on public.entry_type_fields;
drop policy if exists "entry_type_fields_update_own" on public.entry_type_fields;
drop policy if exists "entry_type_fields_delete_own" on public.entry_type_fields;
create policy "entry_type_fields_select_own" on public.entry_type_fields for select to authenticated using (user_id = (auth.uid())::text);
create policy "entry_type_fields_insert_own" on public.entry_type_fields for insert to authenticated with check (user_id = (auth.uid())::text);
create policy "entry_type_fields_update_own" on public.entry_type_fields for update to authenticated using (user_id = (auth.uid())::text) with check (user_id = (auth.uid())::text);
create policy "entry_type_fields_delete_own" on public.entry_type_fields for delete to authenticated using (user_id = (auth.uid())::text);

alter table public.entry_type_presets enable row level security;
drop policy if exists "entry_type_presets_select_own" on public.entry_type_presets;
drop policy if exists "entry_type_presets_insert_own" on public.entry_type_presets;
drop policy if exists "entry_type_presets_update_own" on public.entry_type_presets;
drop policy if exists "entry_type_presets_delete_own" on public.entry_type_presets;
create policy "entry_type_presets_select_own" on public.entry_type_presets for select to authenticated using (user_id = (auth.uid())::text);
create policy "entry_type_presets_insert_own" on public.entry_type_presets for insert to authenticated with check (user_id = (auth.uid())::text);
create policy "entry_type_presets_update_own" on public.entry_type_presets for update to authenticated using (user_id = (auth.uid())::text) with check (user_id = (auth.uid())::text);
create policy "entry_type_presets_delete_own" on public.entry_type_presets for delete to authenticated using (user_id = (auth.uid())::text);

alter table public.entries enable row level security;
drop policy if exists "entries_select_own" on public.entries;
drop policy if exists "entries_insert_own" on public.entries;
drop policy if exists "entries_update_own" on public.entries;
drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_select_own" on public.entries for select to authenticated using (user_id = (auth.uid())::text);
create policy "entries_insert_own" on public.entries for insert to authenticated with check (user_id = (auth.uid())::text);
create policy "entries_update_own" on public.entries for update to authenticated using (user_id = (auth.uid())::text) with check (user_id = (auth.uid())::text);
create policy "entries_delete_own" on public.entries for delete to authenticated using (user_id = (auth.uid())::text);
