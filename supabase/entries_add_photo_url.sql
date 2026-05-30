-- Optional cover image URL (https or data URL). Run once in Supabase SQL Editor.
alter table public.entries add column if not exists photo_url text;
