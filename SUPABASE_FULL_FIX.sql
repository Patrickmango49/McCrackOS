-- ============================================================
-- VERTEX OS MESSAGES — FULL FIX (paste the whole thing once)
-- Safe to run repeatedly: every statement is idempotent.
-- Covers: badges/roles, verified, name effects, profile pages
-- (bio/banner/join date), custom avatars (avatar_data fix),
-- followers/following, and making ITraps owner.
-- ============================================================

-- 0) Reload the schema cache so new columns (avatar_data etc.) appear.
notify pgrst, 'reload schema';

-- ============================================================
-- 1) ROLES / BADGES (Owner, Moderator)
-- ============================================================
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'owner'));
alter table public.profiles add column if not exists badge_title text;

-- Owner-only: promote/demote someone.
create or replace function public.vertex_set_role(p_username text, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_target public.profiles;
begin
  if p_role not in ('user', 'moderator', 'owner') then
    raise exception 'Invalid role: %', p_role;
  end if;
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'owner' then
    raise exception 'Only the owner can change roles.';
  end if;
  update public.profiles
     set role = p_role, updated_at = now()
   where username = lower(trim(p_username))
   returning * into v_target;
  if v_target.id is null then
    raise exception 'No profile named @%.', p_username;
  end if;
  return v_target;
end;
$$;
grant execute on function public.vertex_set_role(text, text) to authenticated;

-- Bootstrap: first caller becomes owner while no owner exists.
create or replace function public.vertex_claim_owner()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
  v_updated boolean;
begin
  select exists (select 1 from public.profiles where role = 'owner') into v_exists;
  if v_exists then
    return false;
  end if;
  update public.profiles set role = 'owner', updated_at = now() where id = auth.uid();
  v_updated := found;
  return v_updated;
end;
$$;
grant execute on function public.vertex_claim_owner() to authenticated;

-- ============================================================
-- 2) VERIFIED CHECKMARK + NAME EFFECTS
-- ============================================================
alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists effects text[] not null default '{}'::text[];
-- Badge set (owner/admin/dev/mod/experimental/lab/verified) — null = auto from role/verified.
alter table public.profiles add column if not exists badges text[];

-- Owner-only: toggle the verified checkmark.
create or replace function public.vertex_set_verified(p_username text, p_verified boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
    raise exception 'Only the Owner can verify accounts.';
  end if;
  update public.profiles
     set verified = coalesce(p_verified, false), updated_at = now()
   where username = lower(trim(p_username))
   returning * into result;
  if result.id is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  return result;
end;
$$;
grant execute on function public.vertex_set_verified(text, boolean) to authenticated;

-- Owner-only: grant exclusive name effects.
create or replace function public.vertex_set_effects(p_username text, p_effects text[])
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  allowed text[] := array['moving-name', 'glow'];
  clean text[];
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then
    raise exception 'Only the Owner can change exclusive effects.';
  end if;
  select coalesce(array_agg(distinct e), '{}'::text[]) into clean
    from unnest(coalesce(p_effects, '{}'::text[])) as t(e)
   where e = any (allowed);
  update public.profiles
     set effects = clean, updated_at = now()
   where username = lower(trim(p_username))
   returning * into result;
  if result.id is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  return result;
end;
$$;
grant execute on function public.vertex_set_effects(text, text[]) to authenticated;

-- The official Vertex-OS account is always Owner / verified / max effects.
create or replace function public.vertex_official_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.username) = 'vertex-os' then
    new.role := 'owner';
    new.verified := true;
    new.effects := array['moving-name', 'glow'];
  end if;
  return new;
end;
$$;
drop trigger if exists vertex_official_profile_trg on public.profiles;
create trigger vertex_official_profile_trg
  before insert or update on public.profiles
  for each row execute function public.vertex_official_profile();

-- ============================================================
-- 3) PROFILE PAGES (bio, banner, join date)
-- ============================================================
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists banner text not null default '';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
update public.profiles set created_at = coalesce(created_at, now());

-- Save your own bio + banner only.
create or replace function public.vertex_update_profile(p_bio text, p_banner text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  update public.profiles
     set bio = coalesce(p_bio, bio),
         banner = coalesce(p_banner, banner),
         updated_at = now()
   where id = uid;
  return (select to_jsonb(p) from public.profiles p where p.id = uid);
end;
$$;
grant execute on function public.vertex_update_profile(text, text) to authenticated;

-- ============================================================
-- 4) CUSTOM AVATARS + FOLLOWERS / FOLLOWING  (the one you missed)
-- ============================================================
alter table public.profiles add column if not exists avatar_data text not null default '';

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

-- Follow / unfollow / follower list RPCs.
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
  if uid is null then raise exception 'Not signed in'; end if;
  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then raise exception 'No account named @%.', lower(trim(p_username)); end if;
  if target = uid then raise exception 'You cannot follow yourself.'; end if;
  insert into public.follows (follower_id, following_id) values (uid, target)
  on conflict (follower_id, following_id) do nothing;
  return jsonb_build_object(
    'followers', (select count(*) from public.follows where following_id = target),
    'following', (select count(*) from public.follows where follower_id = target),
    'is_following', true
  );
end;
$$;
grant execute on function public.vertex_follow(text) to authenticated;

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
  if uid is null then raise exception 'Not signed in'; end if;
  select id into target from public.profiles where username = lower(trim(p_username));
  if target is null then raise exception 'No account named @%.', lower(trim(p_username)); end if;
  delete from public.follows where follower_id = uid and following_id = target;
  return jsonb_build_object(
    'followers', (select count(*) from public.follows where following_id = target),
    'following', (select count(*) from public.follows where follower_id = target),
    'is_following', false
  );
end;
$$;
grant execute on function public.vertex_unfollow(text) to authenticated;

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

-- Full public profile page (includes custom avatar + follow stats).
-- Defined AFTER the follows table so the counts work.
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
  if prof.id is null then return null; end if;
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
    'badges', prof.badges,
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

-- ============================================================
-- 5) MAKE ITRAPPED THE REAL OWNER + GRANT ITS BADGES/EFFECTS
--    (also keeps the official vertex-os account maxed out)
-- ============================================================
update public.profiles
   set role = 'owner', verified = true, effects = array['moving-name', 'glow']
 where username = 'vertex-os';

update public.profiles
   set role = 'owner', verified = true, effects = array['moving-name', 'glow']
 where lower(username) = 'itrapped';

-- Seeded badge sets (only when empty): every Lab badge on for the owners.
-- The Lab's toggles override these later; this does not fight your saved choices.
update public.profiles
   set badges = array['owner', 'admin', 'dev', 'mod', 'experimental', 'lab', 'verified']
 where username = 'vertex-os' and (badges is null or coalesce(array_length(badges, 1), 0) = 0);

update public.profiles
   set badges = array['owner', 'admin', 'dev', 'mod', 'experimental', 'lab', 'verified']
 where lower(username) = 'itrapped' and (badges is null or coalesce(array_length(badges, 1), 0) = 0);

-- If you ever need another account as Moderator, uncomment and edit:
-- update public.profiles set role = 'moderator' where lower(username) = 'some_user';

-- 6) Final schema cache reload so the new objects/columns are visible.
notify pgrst, 'reload schema';