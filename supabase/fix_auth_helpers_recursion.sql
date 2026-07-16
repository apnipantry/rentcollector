-- Run this in the SQL Editor now. Fixes a live bug: auth_org_id() and
-- auth_role() (schema.sql) query `profiles` without security definer, so
-- when a policy on `profiles` calls them, they trigger `profiles`' own RLS
-- policy again, which calls them again -> infinite recursion -> Postgres
-- errors out. This breaks every direct `.from(table).select()` call made
-- through the browser-session client on ANY RLS-protected table (not just
-- profiles), since all of them route through these two functions. It didn't
-- show up earlier because the security-definer RPCs (submit_meter_reading,
-- owner_update_bill, replace_tenant, ensure_monthly_bills) already run as
-- table owner and bypass RLS entirely, so they never hit this path.
--
-- Fix: mark both functions security definer with a fixed search_path, so
-- their internal `profiles` lookup bypasses RLS instead of re-entering it.
-- Still safe: both are hardcoded to resolve only the calling user's own
-- auth.uid(), so a definer-privileged lookup can't be used to read anyone
-- else's row.
create or replace function auth_org_id() returns uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

create or replace function auth_role() returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;
