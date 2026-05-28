-- Temporary bridge: keep finance_entries synced from app_state.mindful_finance
-- Use this until frontend/API is fully switched to v2 tables.

create or replace function public.sync_finance_entries_from_app_state_row()
returns trigger
language plpgsql
as $$
begin
  -- Only handle finance key
  if new.state_key <> 'mindful_finance' then
    return new;
  end if;

  -- Snapshot behavior: app_state row is source of truth for now
  delete from public.finance_entries
  where user_id = new.user_id;

  insert into public.finance_entries (
    id, user_id, type, amount, category, description, entry_date, created_at, updated_at
  )
  select
    coalesce(item->>'id', gen_random_uuid()::text) as id,
    new.user_id,
    case when coalesce(item->>'type', 'expense') = 'income' then 'income' else 'expense' end as type,
    coalesce(nullif(item->>'amount', '')::numeric, 0) as amount,
    coalesce(nullif(item->>'category', ''), 'Other') as category,
    coalesce(item->>'description', '') as description,
    coalesce(nullif(item->>'date', '')::date, now()::date) as entry_date,
    now(),
    now()
  from jsonb_array_elements(
    case when jsonb_typeof(new.state_value) = 'array' then new.state_value else '[]'::jsonb end
  ) as item
  on conflict (id) do update
  set
    type = excluded.type,
    amount = excluded.amount,
    category = excluded.category,
    description = excluded.description,
    entry_date = excluded.entry_date,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_finance_entries_from_app_state on public.app_state;

create trigger trg_sync_finance_entries_from_app_state
after insert or update of state_value on public.app_state
for each row
when (new.state_key = 'mindful_finance')
execute function public.sync_finance_entries_from_app_state_row();

-- One-time backfill from current app_state values
do $$
declare
  r record;
begin
  for r in
    select user_id, state_value
    from public.app_state
    where state_key = 'mindful_finance'
  loop
    delete from public.finance_entries where user_id = r.user_id;

    insert into public.finance_entries (
      id, user_id, type, amount, category, description, entry_date, created_at, updated_at
    )
    select
      coalesce(item->>'id', gen_random_uuid()::text),
      r.user_id,
      case when coalesce(item->>'type', 'expense') = 'income' then 'income' else 'expense' end,
      coalesce(nullif(item->>'amount', '')::numeric, 0),
      coalesce(nullif(item->>'category', ''), 'Other'),
      coalesce(item->>'description', ''),
      coalesce(nullif(item->>'date', '')::date, now()::date),
      now(),
      now()
    from jsonb_array_elements(
      case when jsonb_typeof(r.state_value) = 'array' then r.state_value else '[]'::jsonb end
    ) as item
    on conflict (id) do update
    set
      type = excluded.type,
      amount = excluded.amount,
      category = excluded.category,
      description = excluded.description,
      entry_date = excluded.entry_date,
      updated_at = now();
  end loop;
end $$;
