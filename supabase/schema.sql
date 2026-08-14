-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- One row per user holding the whole app state as JSON. The app already treated
-- its state as a single blob in localStorage, so there is nothing to gain from
-- splitting it into relational tables here.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- THIS is what makes "everyone only sees their own data" true. Without it every
-- authenticated user could read every row. Do not skip it.
alter table public.user_data enable row level security;

drop policy if exists "users read and write only their own row" on public.user_data;

create policy "users read and write only their own row"
  on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch_updated_at on public.user_data;

create trigger user_data_touch_updated_at
  before update on public.user_data
  for each row execute function public.touch_updated_at();
