-- ============================================================
-- Bootstrap the first platform_admin.
--
-- Problem (PROGRESS.md "Not started yet"): every role after the first
-- platform_admin is created via an invite chain (admin invites owner,
-- owner invites caretaker), but nothing creates the first admin. Signing
-- in with a manually-created Supabase Auth user hits `no-profile`
-- (login/actions.ts) because no `profiles` row exists yet.
--
-- Usage (run once, in the SQL Editor):
--   1. Create the auth user by hand: Supabase Dashboard -> Authentication
--      -> Users -> Add user (set an email + password, or send an invite).
--      Copy their UUID.
--   2. Run:
--        select bootstrap_platform_admin('<uuid-from-step-1>', 'Your Name');
--   3. Log in at /login with that account -> lands on /admin/organizations.
--
-- Safety: only works while zero platform_admin profiles exist, so it
-- can't be replayed to mint additional admins later. Once the first admin
-- exists, use their /admin/organizations flow, or a manual `insert into
-- profiles` by someone who already has SQL Editor access, for any more.
-- Deliberately not granted to `authenticated` — only callable from the
-- SQL Editor / service role, never from the app.
-- ============================================================

create or replace function bootstrap_platform_admin(
  p_user_id uuid,
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_admin_count int;
begin
  select count(*) into v_existing_admin_count
  from profiles
  where role = 'platform_admin';

  if v_existing_admin_count > 0 then
    raise exception 'a platform_admin already exists — this function is bootstrap-only. Ask an existing admin to invite you, or insert manually if you have SQL Editor access.';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'no auth.users row for id % — create the auth user first (Dashboard -> Authentication -> Users)', p_user_id;
  end if;

  insert into profiles (id, organization_id, role, full_name)
  values (p_user_id, null, 'platform_admin', p_full_name)
  on conflict (id) do update
    set role = 'platform_admin',
        full_name = coalesce(excluded.full_name, profiles.full_name);
end;
$$;
