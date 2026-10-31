-- Vertex-OS analytics: first-party, privacy-light page/app analytics.
-- Apply with `supabase db push` or paste into the Supabase SQL editor.

create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  kind         text not null,
  visitor_id   text,
  session_id   text,
  page         text,
  title        text,
  referrer     text,
  hostname     text,
  os           text,
  browser      text,
  device       text,
  language     text,
  screen       text,
  viewport     text,
  timezone     text,
  meta         jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_kind_idx    on public.analytics_events (kind);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;

-- Anyone (anon client) may record an event, but nobody may read the raw table.
drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert on public.analytics_events
  for insert to anon, authenticated with check (true);

-- Live presence: one row per visitor, refreshed by heartbeat.
create table if not exists public.vertex_presence (
  visitor_id text primary key,
  session_id text,
  page       text,
  updated_at timestamptz not null default now()
);

alter table public.vertex_presence enable row level security;

drop policy if exists vertex_presence_all on public.vertex_presence;
create policy vertex_presence_all on public.vertex_presence
  for all to anon, authenticated using (true) with check (true);

create or replace function public.analytics_ping(p_visitor text, p_session text, p_page text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vertex_presence (visitor_id, session_id, page, updated_at)
  values (p_visitor, p_session, p_page, now())
  on conflict (visitor_id) do update
    set session_id = excluded.session_id,
        page = excluded.page,
        updated_at = now();
end;
$$;

grant execute on function public.analytics_ping(text, text, text) to anon, authenticated;

-- Aggregated dashboard payload (single round-trip).
create or replace function public.vertex_analytics()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
with base as (
  select * from public.analytics_events
),
totals as (
  select
    count(*)::int as events,
    count(*) filter (where kind = 'pageview')::int as views,
    count(distinct visitor_id)::int as visitors,
    count(distinct session_id)::int as sessions
  from base
),
durations as (
  select coalesce(avg((meta->>'duration_ms')::numeric), 0)::bigint as avg_duration_ms
  from base
  where kind = 'session_end' and meta ? 'duration_ms'
),
recent as (
  select
    count(*) filter (where kind = 'pageview' and created_at > now() - interval '5 minutes')::int as last5m,
    count(distinct visitor_id) filter (where created_at > now() - interval '5 minutes')::int as unique5m,
    count(*) filter (where kind = 'pageview' and created_at > now() - interval '24 hours')::int as last24h,
    count(distinct visitor_id) filter (where created_at > now() - interval '24 hours')::int as unique24h
  from base
),
daily as (
  select
    to_char(gs::date, 'YYYY-MM-DD') as day,
    (select count(*) from base e where e.kind = 'pageview' and e.created_at::date = gs::date)::int as views,
    (select count(distinct e.visitor_id) from base e where e.created_at::date = gs::date)::int as visitors
  from generate_series((now()::date - interval '29 days'), now()::date, interval '1 day') gs
),
hourly as (
  select extract(hour from created_at)::int as hour, count(*)::int as views
  from base
  where kind = 'pageview' and created_at > now() - interval '24 hours'
  group by 1
),
pages as (
  select coalesce(page, '/') as label, count(*)::int as count
  from base where kind = 'pageview' group by 1 order by count desc limit 12
),
referrers as (
  select coalesce(referrer, 'direct') as label, count(*)::int as count
  from base where kind = 'pageview' group by 1 order by count desc limit 12
),
languages as (
  select coalesce(language, 'unknown') as label, count(*)::int as count
  from base group by 1 order by count desc limit 12
),
browsers as (
  select coalesce(browser, 'unknown') as label, count(*)::int as count
  from base group by 1 order by count desc limit 12
),
oses as (
  select coalesce(os, 'unknown') as label, count(*)::int as count
  from base group by 1 order by count desc limit 12
),
devices as (
  select coalesce(device, 'unknown') as label, count(*)::int as count
  from base group by 1 order by count desc limit 12
),
apps as (
  select coalesce(meta->>'app', meta->>'title', 'unknown') as label, count(*)::int as count
  from base where kind = 'app_open' group by 1 order by count desc limit 12
)
select jsonb_build_object(
  'totals',   (select to_jsonb(t) from totals t) || (select to_jsonb(d) from durations d),
  'recent',   (select to_jsonb(r) from recent r),
  'daily',    (select coalesce(jsonb_agg(to_jsonb(d) order by d.day), '[]'::jsonb) from daily d),
  'hourly',   (select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb) from hourly h),
  'pages',    (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from pages p),
  'referrers',(select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from referrers r),
  'languages',(select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from languages l),
  'browsers', (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from browsers b),
  'os',       (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) from oses o),
  'devices',  (select coalesce(jsonb_agg(to_jsonb(dv)), '[]'::jsonb) from devices dv),
  'apps',     (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) from apps a)
);
$$;

grant execute on function public.vertex_analytics() to anon, authenticated;
