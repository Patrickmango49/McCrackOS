-- ============================================================
-- V-MARKET shared catalogue
-- ------------------------------------------------------------
-- Without this, apps published in V-STUDIOS only exist in the
-- publisher's browser. Run this once and every published app
-- shows up for everyone visiting the site.
--
-- How: Supabase dashboard -> SQL Editor -> New query -> paste
-- this whole file -> Run. It is safe to run more than once.
-- ============================================================

create table if not exists public.v_market_apps (
  id          text primary key,
  owner_key   text not null default '',
  publisher   text not null default '',
  name        text not null default '',
  kind        text not null default 'app',
  category    text not null default 'Tools',
  downloads   integer not null default 0,
  rating      numeric(3,1) not null default 5,
  entry       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists v_market_apps_created_idx on public.v_market_apps (created_at desc);

alter table public.v_market_apps enable row level security;

grant select, insert, update, delete on public.v_market_apps to anon, authenticated;

-- Everyone can browse the store.
drop policy if exists v_market_read on public.v_market_apps;
create policy v_market_read on public.v_market_apps
  for select to anon, authenticated using (true);

-- Anyone can publish, but the row must be sane.
drop policy if exists v_market_insert on public.v_market_apps;
create policy v_market_insert on public.v_market_apps
  for insert to anon, authenticated
  with check (
    length(btrim(name)) between 1 and 80
    and length(owner_key) >= 8
    and length(kind) <= 16
    and length(category) <= 40
    and pg_column_size(entry) < 1600000
  );

-- Only the browser that published a listing may edit it. The owner token
-- travels in the x-vmarket-owner request header.
drop policy if exists v_market_update on public.v_market_apps;
create policy v_market_update on public.v_market_apps
  for update to anon, authenticated
  using (owner_key = coalesce(current_setting('request.headers', true)::jsonb ->> 'x-vmarket-owner', ''))
  with check (owner_key = coalesce(current_setting('request.headers', true)::jsonb ->> 'x-vmarket-owner', '') and pg_column_size(entry) < 1600000);

-- ...and only that browser can unpublish (delete) it.
drop policy if exists v_market_delete on public.v_market_apps;
create policy v_market_delete on public.v_market_apps
  for delete to anon, authenticated
  using (owner_key = coalesce(current_setting('request.headers', true)::jsonb ->> 'x-vmarket-owner', ''));

-- Install counter. Runs as the table owner so visitors never need update rights.
create or replace function public.v_market_install(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.v_market_apps
     set downloads = downloads + 1,
         entry = jsonb_set(entry, '{downloads}', to_jsonb(downloads + 1)),
         updated_at = now()
   where id = p_id;
$$;

grant execute on function public.v_market_install(text) to anon, authenticated;

-- Live updates (new listings appear without a refresh).
do $$
begin
  alter publication supabase_realtime add table public.v_market_apps;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
