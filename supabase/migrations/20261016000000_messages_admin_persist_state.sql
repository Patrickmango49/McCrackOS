-- Messages: make your admin account the real Owner so role badges, the verified
-- checkmark and the moving-name/glow effects actually persist to the database
-- and become visible to every other account.
-- Apply AFTER 20261015000000_messages_profile_follows.sql

-- 1) The official Vertex-OS account is always the Owner / verified / max effects.
--    (The vertex_official_profile_trg trigger does this too; backfilling here in
--    case the row existed before the trigger was added.)
update public.profiles
   set role = 'owner',
       verified = true,
       effects = array['moving-name', 'glow']
 where username = 'vertex-os';

-- 2) Promote the account you actually sign into Messages with to Owner.
--    That is the account that can verify people and grant name effects for real.
--    If you never want auto-promotion, delete the do $$ block and instead run:
--      update public.profiles set role = 'owner' where username = 'YOUR_USERNAME_HERE';
do $$
begin
  if exists (select 1 from public.profiles where role = 'owner') then
    raise notice 'An Owner already exists; skipping auto-promotion.';
  else
    update public.profiles
       set role = 'owner'
     where id = (
       select id
         from public.profiles
        where username <> 'vertex-os'
        order by created_at asc nulls last, id asc
        limit 1
     );
    raise notice 'Auto-promoted the earliest account to Owner.';
  end if;
end;
$$;

-- 3) OPTIONAL backfills for accounts that already had the toggles flipped locally.
--    Uncomment, list your usernames (no @), and run:
-- update public.profiles set verified = true where username in ('your_username');
-- update public.profiles set effects = array['moving-name','glow'] where username in ('your_username');

-- 4) IMPORTANT one-time sync for the OTHER account that views your profile:
--    the viewer only ever sees database values. After step 2, sign back into the
--    admin account and flip each toggle once (Verified, then Glow / moving name)
--    so they write to the database. If the toasts say "Effects updated." the
--    owner RPCs are working.