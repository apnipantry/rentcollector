-- Run this AFTER schema.sql, storage_and_functions.sql, and caretaker_functions.sql.

-- Restricts owner writes on a bill to exactly paid/mode/verified, mirroring the
-- column-scoping submit_meter_reading() already does for caretakers. Note this
-- does NOT close the gap it looks like it closes: monthly_bills_org_scoped (in
-- schema.sql) is a table-wide "for all" policy keyed only on organization_id,
-- not on role. Any org member — owner OR caretaker — can currently call
-- supabase.from('monthly_bills').update(...) directly from the browser and
-- write paid/mode/verified themselves, bypassing this RPC entirely, the same
-- way a caretaker could already bypass submit_meter_reading()'s restriction.
-- These RPCs give the app's own server actions correct behavior, but a real
-- fix requires revoking direct table UPDATE/INSERT grants on monthly_bills
-- for the authenticated role and routing ALL writes through security-definer
-- functions. Flagging this rather than silently shipping around it — worth
-- doing as its own pass rather than folding into this feature.
create or replace function owner_update_bill(
  p_bill_id uuid,
  p_paid numeric,
  p_mode text,
  p_verified boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := auth_org_id();
  v_bill_org_id uuid;
begin
  if auth_role() not in ('owner', 'platform_admin') then
    raise exception 'only owners can update bill payment/verification';
  end if;

  select b.organization_id into v_bill_org_id
  from monthly_bills mb
  join flats f on f.id = mb.flat_id
  join buildings b on b.id = f.building_id
  where mb.id = p_bill_id;

  if v_bill_org_id is null then
    raise exception 'bill not found';
  end if;

  if auth_role() != 'platform_admin' and v_bill_org_id != v_org_id then
    raise exception 'bill does not belong to your organization';
  end if;

  if p_mode is not null and p_mode not in ('cash', 'online') then
    raise exception 'mode must be cash or online';
  end if;

  update monthly_bills
  set paid = p_paid,
      mode = p_mode,
      verified = p_verified,
      paid_marked_at = case when p_paid > 0 then now() else paid_marked_at end,
      paid_marked_by = case when p_paid > 0 then auth.uid() else paid_marked_by end
  where id = p_bill_id;
end;
$$;

grant execute on function owner_update_bill(uuid, numeric, text, boolean) to authenticated;
