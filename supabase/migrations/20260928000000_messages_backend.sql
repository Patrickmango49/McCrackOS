create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (
    username = lower(username)
    and username ~ '^[a-z0-9_]{2,16}$'
  ),
  display_name text not null default '',
  status text not null default 'online' check (status in ('online', 'idle', 'offline')),
  avatar_kind text not null default 'preset' check (avatar_kind in ('preset', 'custom')),
  avatar_id integer not null default 0 check (avatar_id between 0 and 11),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "profiles are visible to signed-in users" on public.profiles;
create policy "profiles are visible to signed-in users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users create their own profile" on public.profiles;
create policy "users create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create table if not exists public.messages (
  id text primary key,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  media_path text,
  media_kind text check (media_kind is null or media_kind in ('image', 'video')),
  media_name text,
  created_at timestamptz not null default now(),
  constraint messages_no_self_message check (sender_id <> recipient_id),
  constraint messages_body_limit check (char_length(body) <= 4000),
  constraint messages_not_empty check (char_length(trim(body)) > 0 or media_path is not null),
  constraint messages_media_metadata check (
    (media_path is null and media_kind is null)
    or (media_path is not null and media_kind is not null)
  )
);

create index if not exists messages_sender_time_idx
  on public.messages (sender_id, created_at desc);
create index if not exists messages_recipient_time_idx
  on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;

drop policy if exists "message participants can read" on public.messages;
create policy "message participants can read"
  on public.messages for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists "users send messages as themselves" on public.messages;
create policy "users send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = recipient_id)
    and (
      media_path is null
      or (storage.foldername(media_path))[1] = (select auth.uid())::text
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  50000000,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/x-matroska']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload their own chat media" on storage.objects;
create policy "users upload their own chat media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "chat participants can read attached media" on storage.objects;
create policy "chat participants can read attached media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.messages m
      where m.media_path = storage.objects.name
        and m.sender_id::text = (storage.foldername(storage.objects.name))[1]
        and ((select auth.uid()) = m.sender_id or (select auth.uid()) = m.recipient_id)
    )
  );

drop policy if exists "users can clean up their own chat media" on storage.objects;
create policy "users can clean up their own chat media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "signed-in users can read Messages presence" on realtime.messages;
create policy "signed-in users can read Messages presence"
  on realtime.messages for select to authenticated
  using (
    extension = 'presence'
    and (select realtime.topic()) = 'vertex-presence'
  );

drop policy if exists "signed-in users can publish Messages presence" on realtime.messages;
create policy "signed-in users can publish Messages presence"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and (select realtime.topic()) = 'vertex-presence'
  );

drop policy if exists "users can join their own Messages changes channel" on realtime.messages;
create policy "users can join their own Messages changes channel"
  on realtime.messages for select to authenticated
  using ((select realtime.topic()) = 'vertex-messages-' || (select auth.uid())::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
