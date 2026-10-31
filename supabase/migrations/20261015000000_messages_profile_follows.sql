-- Profile avatars (uploaded images) + followers / following.
-- Apply AFTER 20261014000000_messages_profile_pages.sql

-- Custom avatar images are stored as data URLs (the same approach used for banners).
alter table public.profiles add column if not exists avatar_data text not null default '';

-- Public profile page: now also returns the custom avatar image and follow stats.
create or replace function public.vertex_profile_page(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  v_contacts integer;
  v_groups integer;
  v_followers integer;
  v_following integer;
  v_is_following boolean;
  uid uuid := auth.uid();
begin
  select * into prof from public.profiles where username = lower(trim(p_username));
  if prof.id is null then
    return null;
  end if;
  select count(*) into v_contacts
    from public.friend_requests
   where status = 'accepted' and (sender_id = prof.id or recipient_id = prof.id);
  select count(*) into v_groups
    from public.group_members
   where user_id = prof.id;
  select count(*) into v_followers from public.follows where following_id = prof.id;
  select count(*) into v_following from public.follows where follower_id = prof.id;
  v_is_following := uid is not null and exists (
    select 1 from public.follows where follower_id = uid and following_id = prof.id
  );
  return jsonb_build_object(
    'username', prof.username,
    'display_name', prof.display_name,
    'status', prof.status,
    'role', prof.role,
    'verified', prof.verified,
    'effects', prof.effects,
    'avatar_kind', prof.avatar_kind,
    'avatar_id', prof.avatar_id,
    'avatar_data', prof.avatar_data,
    'bio', prof.bio,
    'banner', prof.banner,
    'joined_at', prof.created_at,
    'contacts', v_contacts,
    'groups', v_groups,
    'followers', v_followers,
    'following', v_following,
    'is_following', v_is_following
  );
end;
$$;

grant execute on function public.vertex_profile_page(text) to authenticated;

-- Followers / following (no self-follow, one row per directed pair).
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);

alter table public.follows enable row level security;
grant select, insert, delete on public.follows to authenticated;

drop policy if exists "follows are visible to signed-in users" on public.follows;
create policy "follows are visible to signed-in users"
  on public.follows for select to authenticated using (true);

drop policy if exists "users follow as themselves" on public.follows;
create policy "users follow as themselves"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and follower_id <> following_id);

drop policy if exists "users remove their own follows" on public.follows;
create policy "users remove their own follows"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- Follow someone (idempotent) and return the resulting counts.
create or replace function public.vertex_follow(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  if target = uid then
    raise exception 'You cannot follow yourself.';
  end if;
  insert into public.follows (follower_id, following_id)
  values (uid, target)
  on conflict (follower_id, following_id) do nothing;
  return jsonb_build_object(
    'followers', (select count(*) from public.follows where following_id = target),
    'following', (select count(*) from public.follows where follower_id = target),
    'is_following', true
  );
end;
$$;
grant execute on function public.vertex_follow(text) to authenticated;

-- Unfollow someone (idempotent) and return the resulting counts.
create or replace function public.vertex_unfollow(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  delete from public.follows where follower_id = uid and following_id = target;
  return jsonb_build_object(
    'followers', (select count(*) from public.follows where following_id = target),
    'following', (select count(*) from public.follows where follower_id = target),
    'is_following', false
  );
end;
$$;
grant execute on function public.vertex_unfollow(text) to authenticated;

-- A follower/following list (p_kind is 'followers' or 'following').
create or replace function public.vertex_follow_list(p_username text, p_kind text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'username', p.username,
    'display_name', p.display_name,
    'avatar_kind', p.avatar_kind,
    'avatar_id', p.avatar_id,
    'avatar_data', p.avatar_data
  ) order by p.username), '[]'::jsonb)
  from public.follows f
  join public.profiles p
    on p.id = (case when lower(trim(p_kind)) = 'following' then f.following_id else f.follower_id end)
  where (case when lower(trim(p_kind)) = 'following' then f.follower_id else f.following_id end)
        = (select id from public.profiles where username = lower(trim(p_username)));
$$;
grant execute on function public.vertex_follow_list(text, text) to authenticated;
