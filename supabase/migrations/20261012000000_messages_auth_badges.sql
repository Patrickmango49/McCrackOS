-- Messages: profile roles / badges (Owner, Moderator) — like Roblox ranks.
--
-- Real email+password accounts already map to Supabase Auth (auth.users); the
-- Messages app now uses supabase.auth.signUp / signInWithPassword instead of
-- anonymous sign-ins. This migration only adds the role/badge layer.

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'moderator', 'owner'));

alter table public.profiles
  add column if not exists badge_title text;

-- Only an existing owner can promote/demote someone.
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

-- Bootstrap: the very first caller becomes the owner, but only while no owner
-- exists yet. After that this does nothing.
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

  update public.profiles
     set role = 'owner', updated_at = now()
   where id = auth.uid();

  v_updated := found;
  return v_updated;
end;
$$;

grant execute on function public.vertex_claim_owner() to authenticated;
