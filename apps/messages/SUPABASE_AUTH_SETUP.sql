-- McCrack Chat: Supabase Auth + cloud profiles setup
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New query.
-- This does NOT change or delete existing rooms, messages, or chat-images data.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default 'User',
  status text not null default 'Available to chat',
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  contacts jsonb not null default '{}'::jsonb,
  recent_rooms jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_preferences to authenticated;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their own preferences" on public.user_preferences;
create policy "Users can read their own preferences"
  on public.user_preferences for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can create their own preferences" on public.user_preferences;
create policy "Users can create their own preferences"
  on public.user_preferences for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- One public bucket for profile photos and wallpaper images.
-- Objects can be read by chat users, but only the owning signed-in user can upload/edit/delete files in their folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mcchat-user-media',
  'mcchat-user-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

drop policy if exists "McCrack profile media is publicly readable" on storage.objects;
create policy "McCrack profile media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'mcchat-user-media');

drop policy if exists "Users upload their own McCrack media" on storage.objects;
create policy "Users upload their own McCrack media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mcchat-user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own McCrack media" on storage.objects;
create policy "Users update their own McCrack media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'mcchat-user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'mcchat-user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own McCrack media" on storage.objects;
create policy "Users delete their own McCrack media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'mcchat-user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- Friend requests: a user can send requests and only the sender/recipient can read them.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (sender_id <> recipient_id),
  constraint friend_requests_unique_pair unique (sender_id, recipient_id)
);
alter table public.friend_requests enable row level security;
grant select, insert, update, delete on public.friend_requests to authenticated;
drop policy if exists "Users can see their own friend requests" on public.friend_requests;
create policy "Users can see their own friend requests" on public.friend_requests
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send friend requests as themselves" on public.friend_requests;
create policy "Users can send friend requests as themselves" on public.friend_requests
  for insert to authenticated with check (auth.uid() = sender_id and status = 'pending');
drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests" on public.friend_requests
  for update to authenticated using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id and status in ('accepted','declined'));
drop policy if exists "Senders can cancel pending friend requests" on public.friend_requests;
create policy "Senders can cancel pending friend requests" on public.friend_requests
  for delete to authenticated using (auth.uid() = sender_id and status = 'pending');

drop policy if exists "Users can remove accepted friendships" on public.friend_requests;
create policy "Users can remove accepted friendships" on public.friend_requests
  for delete to authenticated using (
    status = 'accepted' and (auth.uid() = sender_id or auth.uid() = recipient_id)
  );


-- Extended profiles, private DMs, presence, notifications, and private attachments.
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists is_online boolean not null default false;
grant update (bio, banner_url, last_seen_at, is_online) on public.profiles to authenticated;

create table if not exists public.private_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint private_conversations_distinct_users check (user_a <> user_b),
  constraint private_conversations_sorted_pair check (user_a < user_b),
  constraint private_conversations_unique_pair unique (user_a, user_b)
);
alter table public.private_conversations enable row level security;
grant select, insert on public.private_conversations to authenticated;
grant update (last_message_at) on public.private_conversations to authenticated;
drop policy if exists "Participants can view private conversations" on public.private_conversations;
create policy "Participants can view private conversations" on public.private_conversations
 for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists "Friends can create private conversations" on public.private_conversations;
create policy "Friends can create private conversations" on public.private_conversations
 for insert to authenticated with check (
   (auth.uid() = user_a or auth.uid() = user_b) and exists (
     select 1 from public.friend_requests f
     where f.status = 'accepted'
       and ((f.sender_id = user_a and f.recipient_id = user_b)
         or (f.sender_id = user_b and f.recipient_id = user_a))
   )
 );
drop policy if exists "Participants can update private conversations" on public.private_conversations;
create policy "Participants can update private conversations" on public.private_conversations
 for update to authenticated using (auth.uid() = user_a or auth.uid() = user_b)
 with check (auth.uid() = user_a or auth.uid() = user_b);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  attachment_path text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint dm_message_has_content check (length(content) <= 4000)
);
create index if not exists dm_messages_conversation_created_idx
 on public.dm_messages(conversation_id, created_at);
alter table public.dm_messages enable row level security;
grant select, insert on public.dm_messages to authenticated;
grant update (read_at) on public.dm_messages to authenticated;
drop policy if exists "Conversation participants can read DMs" on public.dm_messages;
create policy "Conversation participants can read DMs" on public.dm_messages
 for select to authenticated using (exists (
   select 1 from public.private_conversations c
   where c.id = conversation_id and auth.uid() in (c.user_a,c.user_b)
 ));
drop policy if exists "Participants can send their own DMs" on public.dm_messages;
create policy "Participants can send their own DMs" on public.dm_messages
 for insert to authenticated with check (
   sender_id = auth.uid() and exists (
     select 1 from public.private_conversations c
     where c.id = conversation_id and auth.uid() in (c.user_a,c.user_b)
   )
 );
drop policy if exists "Recipients can mark DMs read" on public.dm_messages;
create policy "Recipients can mark DMs read" on public.dm_messages
 for update to authenticated using (
   auth.uid() <> sender_id and exists (
     select 1 from public.private_conversations c
     where c.id = conversation_id and auth.uid() in (c.user_a,c.user_b)
   )
 ) with check (
   auth.uid() <> sender_id and exists (
     select 1 from public.private_conversations c
     where c.id = conversation_id and auth.uid() in (c.user_a,c.user_b)
   )
 );

-- Keep file uploads private: object names begin with the conversation UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('mcchat-private-files','mcchat-private-files',false,15728640,
 array['image/jpeg','image/png','image/webp','image/gif','image/avif','application/pdf','text/plain','application/zip'])
on conflict (id) do update set public=false,file_size_limit=15728640,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','image/avif','application/pdf','text/plain','application/zip'];
drop policy if exists "DM participants can read attachments" on storage.objects;
create policy "DM participants can read attachments" on storage.objects for select to authenticated
 using (bucket_id='mcchat-private-files' and exists (
   select 1 from public.private_conversations c
   where c.id::text = (storage.foldername(name))[1] and auth.uid() in (c.user_a,c.user_b)
 ));
drop policy if exists "DM participants can upload attachments" on storage.objects;
create policy "DM participants can upload attachments" on storage.objects for insert to authenticated
 with check (bucket_id='mcchat-private-files' and exists (
   select 1 from public.private_conversations c
   where c.id::text = (storage.foldername(name))[1] and auth.uid() in (c.user_a,c.user_b)
 ));

-- Realtime setup is intentionally not done with DO blocks here.
-- In Supabase Dashboard, open Database -> Publications -> supabase_realtime
-- and enable these tables: public.dm_messages, public.friend_requests, public.profiles.
-- This avoids SQL editor delimiter/parser issues and is safe to repeat.
