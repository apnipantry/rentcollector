-- ============================================================
-- Closes the monthly_bills write-bypass gap.
--
-- Problem: monthly_bills_org_scoped (schema.sql) is a `for all` RLS
-- policy keyed only on organization_id, not on role or column. Any
-- authenticated org member (e.g. a caretaker) can call
-- supabase.from('monthly_bills').update(...) directly from the
-- browser, bypassing the app's server actions and the
-- security-definer RPCs entirely, and write paid/mode/verified/cer
-- regardless of role.
--
-- Fix: revoke direct insert/update/delete grants on monthly_bills for
-- the `authenticated` role. Reads (select) are unaffected. All writes
-- must now go through the security-definer RPCs below, which run as
-- the function owner and are therefore unaffected by this revoke:
--   ensure_monthly_bills()  -- creates rows only; no sensitive columns
--   submit_meter_reading()  -- caretaker/owner: cer + photo only
--   owner_update_bill()     -- owner: paid + mode + verified only
--
-- Verified before writing this: every raw `.from("monthly_bills")`
-- call in src/ is a .select() (caretaker/page.tsx, owner/bills/page.tsx,
-- owner/flats/[id]/page.tsx, owner/page.tsx, owner/tenants/page.tsx) —
-- the app itself never writes to this table directly, so this revoke
-- should not break any existing app code path.
-- ============================================================

revoke insert, update, delete on monthly_bills from authenticated;

-- Sanity check: confirm the RPCs still have execute grants after the
-- revoke (they should, from storage_and_functions.sql /
-- caretaker_functions.sql / allow_owner_meter_reading.sql /
-- owner_functions.sql, but worth confirming since some Postgres
-- versions re-derive privileges on a revoke).
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_name in ('ensure_monthly_bills', 'submit_meter_reading', 'owner_update_bill')
  and grantee = 'authenticated';

-- Manual test after running this in the SQL Editor (from the actual
-- deployed app, not just here):
--   1. Owner marks a bill paid via /owner/bills — should still work
--      (goes through owner_update_bill()).
--   2. Caretaker submits a reading via /caretaker — should still work
--      (goes through submit_meter_reading()).
--   3. From devtools, try a raw
--      supabase.from('monthly_bills').update({ paid: 1 }).eq('id', '<id>')
--      with a real session — should now fail with permission denied.
