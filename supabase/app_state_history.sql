-- Preserve app_state revisions before overwrite/delete.
-- Run this in Supabase SQL Editor after schema.sql.

create table if not exists public.app_state_history (
  id uuid primary key default gen_random_uuid(),
  app_state_id uuid,
  user_id text not null,
  state_key text not null,
  state_value jsonb,
  operation text not null check (operation in ('UPDATE', 'DELETE')),
  captured_at timestamptz not null default now()
);

create index if not exists idx_app_state_history_user_key_time
  on public.app_state_history (user_id, state_key, captured_at desc);

create or replace function public.capture_app_state_history()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.app_state_history (app_state_id, user_id, state_key, state_value, operation)
    values (old.id, old.user_id, old.state_key, old.state_value, 'UPDATE');
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.app_state_history (app_state_id, user_id, state_key, state_value, operation)
    values (old.id, old.user_id, old.state_key, old.state_value, 'DELETE');
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_capture_app_state_history on public.app_state;

create trigger trg_capture_app_state_history
before update or delete on public.app_state
for each row
execute function public.capture_app_state_history();
