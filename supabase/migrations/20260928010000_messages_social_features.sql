-- Contacts, group chats, read receipts, editing, and unsending for Messages.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists friend_requests_recipient_status_idx on public.friend_requests(recipient_id, status);
create index if not exists friend_requests_sender_status_idx on public.friend_requests(sender_id, status);
create unique index if not exists friend_requests_sender_recipient_idx
  on public.friend_requests(sender_id, recipient_id);

-- Existing conversations become accepted contacts so the schema change does not lock anyone out.
insert into public.friend_requests(sender_id, recipient_id, status)
select least(sender_id::text, recipient_id::text)::uuid,
       greatest(sender_id::text, recipient_id::text)::uuid,
       'accepted'
from public.messages
where recipient_id is not null
group by least(sender_id::text, recipient_id::text), greatest(sender_id::text, recipient_id::text)
on conflict (sender_id, recipient_id) do update set status = 'accepted', updated_at = now();

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 64),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key(group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id, group_id);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create unique index if not exists group_invites_group_recipient_idx on public.group_invites(group_id, recipient_id);
create index if not exists group_invites_recipient_status_idx on public.group_invites(recipient_id, status);

create or replace function public.is_messages_group_member(_group_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.group_members gm where gm.group_id = _group_id and gm.user_id = _user_id)
$$;
revoke all on function public.is_messages_group_member(uuid, uuid) from public;
grant execute on function public.is_messages_group_member(uuid, uuid) to authenticated;

alter table public.messages add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages alter column recipient_id drop not null;
alter table public.messages drop constraint if exists messages_no_self_message;
alter table public.messages add constraint messages_no_self_message check (recipient_id is null or sender_id <> recipient_id);
alter table public.messages drop constraint if exists messages_not_empty;
alter table public.messages add constraint messages_not_empty check (
  char_length(trim(body)) > 0 or media_path is not null or deleted_at is not null
);
alter table public.messages drop constraint if exists messages_conversation_target_check;
alter table public.messages add constraint messages_conversation_target_check check (
  (group_id is null and recipient_id is not null) or (group_id is not null and recipient_id is null)
);
create index if not exists messages_group_time_idx on public.messages(group_id, created_at desc) where group_id is not null;

alter table public.friend_requests enable row level security;
grant select, insert, update on public.friend_requests to authenticated;
revoke update on public.friend_requests from authenticated;
grant update (status, updated_at) on public.friend_requests to authenticated;
drop policy if exists "users read their contact requests" on public.friend_requests;
create policy "users read their contact requests" on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists "users send contact requests as themselves" on public.friend_requests;
create policy "users send contact requests as themselves" on public.friend_requests for insert to authenticated
  with check (sender_id = (select auth.uid()) and sender_id <> recipient_id and status = 'pending');
drop policy if exists "recipients decide contact requests" on public.friend_requests;
create policy "recipients decide contact requests" on public.friend_requests for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (recipient_id = (select auth.uid()) and status in ('accepted', 'declined'));
drop policy if exists "senders can resend declined requests" on public.friend_requests;
create policy "senders can resend declined requests" on public.friend_requests for update to authenticated
  using (sender_id = (select auth.uid()) and status = 'declined')
  with check (sender_id = (select auth.uid()) and status = 'pending');

alter table public.groups enable row level security;
grant select, insert, update, delete on public.groups to authenticated;
drop policy if exists "group members can read groups" on public.groups;
create policy "group members can read groups" on public.groups for select to authenticated
  using (created_by = (select auth.uid()) or public.is_messages_group_member(id, (select auth.uid()))
    or exists (select 1 from public.group_invites gi where gi.group_id = id and gi.recipient_id = (select auth.uid()) and gi.status = 'pending'));
drop policy if exists "users create their own groups" on public.groups;
create policy "users create their own groups" on public.groups for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists "group owners update groups" on public.groups;
create policy "group owners update groups" on public.groups for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists "group owners delete groups" on public.groups;
create policy "group owners delete groups" on public.groups for delete to authenticated
  using (created_by = (select auth.uid()));

alter table public.group_members enable row level security;
grant select, insert, delete on public.group_members to authenticated;
drop policy if exists "members see their group roster" on public.group_members;
create policy "members see their group roster" on public.group_members for select to authenticated
  using (public.is_messages_group_member(group_id, (select auth.uid())));
drop policy if exists "group owners add members" on public.group_members;
create policy "group owners add members" on public.group_members for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and exists (select 1 from public.groups g where g.id = group_id and g.created_by = (select auth.uid())))
    or (user_id = (select auth.uid()) and exists (select 1 from public.group_invites gi where gi.group_id = group_id and gi.recipient_id = (select auth.uid()) and gi.status = 'accepted'))
  );
drop policy if exists "members leave or owners remove members" on public.group_members;
create policy "members leave or owners remove members" on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()) or exists (select 1 from public.groups g where g.id = group_id and g.created_by = (select auth.uid())));

alter table public.group_invites enable row level security;
grant select, insert, update on public.group_invites to authenticated;
revoke update on public.group_invites from authenticated;
grant update (status, updated_at) on public.group_invites to authenticated;
drop policy if exists "users read their group invites" on public.group_invites;
create policy "users read their group invites" on public.group_invites for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));
drop policy if exists "group owners invite their contacts" on public.group_invites;
create policy "group owners invite their contacts" on public.group_invites for insert to authenticated
  with check (sender_id = (select auth.uid()) and status = 'pending'
    and exists (select 1 from public.groups g where g.id = group_id and g.created_by = (select auth.uid()))
    and exists (select 1 from public.friend_requests r where r.status = 'accepted'
      and ((r.sender_id = sender_id and r.recipient_id = recipient_id)
        or (r.sender_id = recipient_id and r.recipient_id = sender_id))));
drop policy if exists "recipients decide group invites" on public.group_invites;
create policy "recipients decide group invites" on public.group_invites for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (recipient_id = (select auth.uid()) and status in ('accepted', 'declined'));

drop policy if exists "message participants can read" on public.messages;
create policy "message participants can read" on public.messages for select to authenticated
  using (
    sender_id = (select auth.uid())
    or (recipient_id = (select auth.uid()) and exists (
      select 1 from public.friend_requests r where r.status = 'accepted'
        and ((r.sender_id = sender_id and r.recipient_id = recipient_id)
          or (r.sender_id = recipient_id and r.recipient_id = sender_id))
    ))
    or (group_id is not null and public.is_messages_group_member(group_id, (select auth.uid())))
  );
drop policy if exists "users send messages as themselves" on public.messages;
create policy "users send messages as themselves" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (group_id is null and recipient_id <> (select auth.uid()) and exists (
        select 1 from public.friend_requests r where r.status = 'accepted'
          and ((r.sender_id = sender_id and r.recipient_id = recipient_id)
            or (r.sender_id = recipient_id and r.recipient_id = sender_id))
      ))
      or (group_id is not null and recipient_id is null and public.is_messages_group_member(group_id, (select auth.uid())))
    )
    and (media_path is null or (storage.foldername(media_path))[1] = (select auth.uid())::text)
  );
drop policy if exists "senders edit their messages" on public.messages;
create policy "senders edit their messages" on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) and deleted_at is null) with check (sender_id = (select auth.uid()));
grant update (body, edited_at, deleted_at) on public.messages to authenticated;
drop policy if exists "senders delete their messages" on public.messages;
create policy "senders delete their messages" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));
grant delete on public.messages to authenticated;

create table if not exists public.message_receipts (
  message_id text not null references public.messages(id) on delete cascade,
  reader_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(message_id, reader_id)
);
alter table public.message_receipts enable row level security;
grant select, insert, update on public.message_receipts to authenticated;
revoke update on public.message_receipts from authenticated;
grant update (read_at) on public.message_receipts to authenticated;
drop policy if exists "participants can read message receipts" on public.message_receipts;
create policy "participants can read message receipts" on public.message_receipts for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id and (
    m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid())
      or (m.group_id is not null and public.is_messages_group_member(m.group_id, (select auth.uid())))
  )));
drop policy if exists "recipients mark messages read" on public.message_receipts;
create policy "recipients mark messages read" on public.message_receipts for insert to authenticated
  with check (reader_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id and (
    m.recipient_id = (select auth.uid()) or (m.group_id is not null and m.sender_id <> (select auth.uid())
      and public.is_messages_group_member(m.group_id, (select auth.uid())))
  )));
drop policy if exists "users update their own read receipts" on public.message_receipts;
create policy "users update their own read receipts" on public.message_receipts for update to authenticated
  using (reader_id = (select auth.uid())) with check (reader_id = (select auth.uid()));

-- Private media remains readable only by the message participants, including group members.
drop policy if exists "chat participants can read attached media" on storage.objects;
create policy "chat participants can read attached media" on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.messages m
      where m.media_path = storage.objects.name
        and m.sender_id::text = (storage.foldername(storage.objects.name))[1]
        and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid())
          or (m.group_id is not null and public.is_messages_group_member(m.group_id, (select auth.uid()))))
    )
  );

do $$
declare t text;
begin
  foreach t in array array['friend_requests', 'groups', 'group_members', 'group_invites', 'message_receipts'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
