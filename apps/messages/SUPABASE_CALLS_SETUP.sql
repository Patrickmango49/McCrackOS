-- McCrack Chat: voice + video call setup
-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- This adds call session/signalling tables. It does not modify existing messages or profiles.

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'video' check (mode in ('voice','video')),
  status text not null default 'ringing'
    check (status in ('ringing','accepted','declined','missed','ended','cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  constraint call_sessions_distinct_users check (caller_id <> callee_id)
);

create index if not exists call_sessions_callee_status_created_idx
  on public.call_sessions(callee_id,status,created_at desc);
create index if not exists call_sessions_caller_created_idx
  on public.call_sessions(caller_id,created_at desc);

alter table public.call_sessions enable row level security;
grant select, insert, update on public.call_sessions to authenticated;

drop policy if exists "Call participants can view their sessions" on public.call_sessions;
create policy "Call participants can view their sessions"
  on public.call_sessions for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "Conversation members can start calls" on public.call_sessions;
create policy "Conversation members can start calls"
  on public.call_sessions for insert to authenticated
  with check (
    caller_id = auth.uid()
    and exists (
      select 1 from public.private_conversations c
      where c.id = conversation_id
        and (
          (c.user_a = auth.uid() and c.user_b = callee_id)
          or (c.user_b = auth.uid() and c.user_a = callee_id)
        )
    )
  );

drop policy if exists "Call participants can update their sessions" on public.call_sessions;
create policy "Call participants can update their sessions"
  on public.call_sessions for update to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- SDP offers/answers and ICE candidates are short-lived signalling data.
-- The actual audio/video never passes through this table or Supabase.
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('offer','answer','ice','hangup','reject')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint call_signals_distinct_users check (sender_id <> recipient_id),
  constraint call_signals_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists call_signals_call_created_idx
  on public.call_signals(call_id,created_at);

alter table public.call_signals enable row level security;
grant select, insert on public.call_signals to authenticated;

drop policy if exists "Call participants can read signalling" on public.call_signals;
create policy "Call participants can read signalling"
  on public.call_signals for select to authenticated
  using (
    auth.uid() = sender_id or auth.uid() = recipient_id
  );

drop policy if exists "Call participants can send signalling" on public.call_signals;
create policy "Call participants can send signalling"
  on public.call_signals for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.call_sessions s
      where s.id = call_id
        and (
          (s.caller_id = auth.uid() and s.callee_id = recipient_id)
          or (s.callee_id = auth.uid() and s.caller_id = recipient_id)
        )
    )
  );

-- Enable Realtime database-change events for both tables:
-- Supabase Dashboard -> Database -> Publications -> supabase_realtime
-- Turn on public.call_sessions and public.call_signals.
-- Do not make either table publicly readable; the RLS policies above are required.

-- Optional cleanup for old signalling rows (safe to run manually):
-- delete from public.call_signals where created_at < now() - interval '7 days';
-- Keep call_sessions if you want call history later.
