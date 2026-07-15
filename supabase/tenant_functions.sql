-- Run this AFTER schema.sql, storage_and_functions.sql, and caretaker_functions.sql.

-- Replacing a tenant is two writes (deactivate the old one, insert the new
-- one) that must happen together — otherwise a flat could briefly have zero
-- or two active tenants. Doing it as one function also lets us enforce the
-- org-ownership check here rather than trusting the caller.
create or replace function replace_tenant(
  p_flat_id uuid,
  p_name text,
  p_phone text,
  p_move_in_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := auth_org_id();
  v_flat_org_id uuid;
  v_new_tenant_id uuid;
begin
  if auth_role() not in ('owner', 'platform_admin') then
    raise exception 'only an owner can add or replace a tenant';
  end if;

  select b.organization_id into v_flat_org_id
  from flats f
  join buildings b on b.id = f.building_id
  where f.id = p_flat_id;

  if v_flat_org_id is null then
    raise exception 'flat not found';
  end if;

  if auth_role() != 'platform_admin' and v_flat_org_id != v_org_id then
    raise exception 'flat does not belong to your organization';
  end if;

  update tenants
  set is_active = false
  where flat_id = p_flat_id and is_active;

  insert into tenants (flat_id, name, phone, move_in_date, is_active)
  values (p_flat_id, p_name, p_phone, p_move_in_date, true)
  returning id into v_new_tenant_id;

  return v_new_tenant_id;
end;
$$;

grant execute on function replace_tenant(uuid, text, text, date) to authenticated;
