-- ============================================================
-- Owner-scoped delete RPCs for buildings, flats, tenants, bills.
--
-- Same bypass class as revoke_direct_writes.sql, but wider: buildings/
-- flats/tenants policies are `for all` keyed only on organization_id,
-- with no role check, so ANY authenticated org member (including a
-- caretaker) can currently call .delete() on them directly from the
-- browser. This revokes delete specifically and adds owner-only,
-- security-definer RPCs to replace it.
--
-- NOTE: insert/update on buildings/flats are NOT revoked here —
-- createBuilding/createFlat in buildings/actions.ts still write via
-- raw .insert(), and locking that down too is a separate, larger
-- change (touches existing create flows). This file only closes the
-- delete gap. The insert/update gap for buildings/flats/tenants is a
-- known follow-up, not fixed by this file.
--
-- Deletion policy (deliberately conservative — this is financial data):
--   - building/flat: blocked if ANY monthly_bills row exists under it,
--     at all (paid or not). A building/flat with billing history isn't
--     a "wrong entry", it's real data; use it going forward as-is.
--   - tenant: blocked if that specific tenant has any monthly_bills
--     row. A flat can have old tenants with history and a new tenant
--     with none — only the clean one is deletable.
--   - bill: blocked unless paid = 0 and verified = false, i.e. nothing
--     has been recorded as received or checked yet. Once money or
--     verification touches a bill, it must be corrected via
--     owner_update_bill(), not deleted.
-- ============================================================

revoke delete on buildings from authenticated;
revoke delete on flats from authenticated;
revoke delete on tenants from authenticated;

create or replace function owner_delete_building(p_building_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'owner' then
    raise exception 'only an owner can delete a building';
  end if;

  if not exists (
    select 1 from buildings
    where id = p_building_id and organization_id = auth_org_id()
  ) then
    raise exception 'building not found in your organization';
  end if;

  if exists (
    select 1 from monthly_bills mb
    join flats f on f.id = mb.flat_id
    where f.building_id = p_building_id
  ) then
    raise exception 'this building has billing history and cannot be deleted';
  end if;

  delete from buildings where id = p_building_id;
end;
$$;

create or replace function owner_delete_flat(p_flat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'owner' then
    raise exception 'only an owner can delete a flat';
  end if;

  if not exists (
    select 1 from flats f
    join buildings b on b.id = f.building_id
    where f.id = p_flat_id and b.organization_id = auth_org_id()
  ) then
    raise exception 'flat not found in your organization';
  end if;

  if exists (select 1 from monthly_bills where flat_id = p_flat_id) then
    raise exception 'this flat has billing history and cannot be deleted';
  end if;

  delete from flats where id = p_flat_id;
end;
$$;

create or replace function owner_delete_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'owner' then
    raise exception 'only an owner can delete a tenant';
  end if;

  if not exists (
    select 1 from tenants t
    join flats f on f.id = t.flat_id
    join buildings b on b.id = f.building_id
    where t.id = p_tenant_id and b.organization_id = auth_org_id()
  ) then
    raise exception 'tenant not found in your organization';
  end if;

  if exists (select 1 from monthly_bills where tenant_id = p_tenant_id) then
    raise exception 'this tenant has billing history and cannot be deleted';
  end if;

  delete from tenants where id = p_tenant_id;
end;
$$;

create or replace function owner_delete_bill(p_bill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric;
  v_verified boolean;
begin
  if auth_role() <> 'owner' then
    raise exception 'only an owner can delete a bill';
  end if;

  select mb.paid, mb.verified into v_paid, v_verified
  from monthly_bills mb
  join flats f on f.id = mb.flat_id
  join buildings b on b.id = f.building_id
  where mb.id = p_bill_id and b.organization_id = auth_org_id();

  if not found then
    raise exception 'bill not found in your organization';
  end if;

  if v_paid <> 0 or v_verified then
    raise exception 'this bill has a payment or verification recorded and cannot be deleted — correct it instead';
  end if;

  delete from monthly_bills where id = p_bill_id;
end;
$$;

grant execute on function owner_delete_building(uuid) to authenticated;
grant execute on function owner_delete_flat(uuid) to authenticated;
grant execute on function owner_delete_tenant(uuid) to authenticated;
grant execute on function owner_delete_bill(uuid) to authenticated;
