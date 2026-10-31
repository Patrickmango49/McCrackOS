-- Messages: verified checkmark, exclusive name effects, and the official Owner account.
-- Apply AFTER 20261012000000_messages_auth_badges.sql

alter table public.profiles add column if not exists verified boolean not null default false;
alter table public.profiles add column if not exists effects text[] not null default '{}'::text[];

-- Owner-only: toggle the verified checkmark on an account.
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
     set verified = coalesce(p_verified, false),
         updated_at = now()
   where username = lower(trim(p_username))
  returning * into result;
  if result.id is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  return result;
end;
$$;
grant execute on function public.vertex_set_verified(text, boolean) to authenticated;

-- Owner-only: grant a user the exclusive, unreleased name effects.
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
     set effects = clean,
         updated_at = now()
   where username = lower(trim(p_username))
  returning * into result;
  if result.id is null then
    raise exception 'No account named @%.', lower(trim(p_username));
  end if;
  return result;
end;
$$;
grant execute on function public.vertex_set_effects(text, text[]) to authenticated;

-- The official Vertex-OS admin account is always the Owner, verified, with every effect.
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
