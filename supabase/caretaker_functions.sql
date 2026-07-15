-- Run this AFTER schema.sql and storage_and_functions.sql.

-- Restricts writes to exactly the fields a caretaker should be able to touch:
-- cer, meter_photo_url, reading_submitted_at. Nothing about payment or
-- verification can be changed through this path, regardless of what the
-- calling UI sends — this is enforced here, not just in the frontend.
create or replace function submit_meter_reading(
  p_flat_id uuid,
  p_billing_month date,
  p_cer numeric,
  p_photo_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := auth_org_id();
  v_flat_org_id uuid;
begin
  if auth_role() not in ('caretaker', 'platform_admin') then
    raise exception 'only caretakers can submit meter readings';
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

  update monthly_bills
  set cer = p_cer,
      meter_photo_url = coalesce(p_photo_path, meter_photo_url),
      reading_submitted_at = now()
  where flat_id = p_flat_id
    and billing_month = p_billing_month;

  if not found then
    raise exception 'no bill row found for that flat/month — has ensure_monthly_bills() been run?';
  end if;
end;
$$;

grant execute on function submit_meter_reading(uuid, date, numeric, text) to authenticated;
