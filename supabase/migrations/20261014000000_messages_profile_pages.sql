-- Profile pages: bio, banner, join date, and on-demand loader for any user.
-- Adds columns to public.profiles and two security-definer RPCs.

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists banner text not null default '';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Existing rows get their current timestamp as a best-effort join date.
update public.profiles set created_at = coalesce(created_at, now());

-- Full public profile page for any username (used by the Roblox-style profile view).
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
  return jsonb_build_object(
    'username', prof.username,
    'display_name', prof.display_name,
    'status', prof.status,
    'role', prof.role,
    'verified', prof.verified,
    'effects', prof.effects,
    'avatar_kind', prof.avatar_kind,
    'avatar_id', prof.avatar_id,
    'bio', prof.bio,
    'banner', prof.banner,
    'joined_at', prof.created_at,
    'contacts', v_contacts,
    'groups', v_groups
  );
end;
$$;

grant execute on function public.vertex_profile_page(text) to authenticated;

-- Save your own bio + banner (self only).
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
