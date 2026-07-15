-- ============================================================
-- Run this AFTER schema.sql has been applied.
-- ============================================================

-- ---------- Storage bucket for meter photos ----------
insert into storage.buckets (id, name, public)
values ('meter-photos', 'meter-photos', false)
on conflict (id) do nothing;

-- Path convention: meter-photos/{organization_id}/{flat_id}/{billing_month}.jpg
-- so RLS can scope access by the first path segment.

create policy "org members can upload meter photos"
  on storage.objects for insert
  with check (
    bucket_id = 'meter-photos'
    and (
      auth_role() = 'platform_admin'
      or (storage.foldername(name))[1] = auth_org_id()::text
    )
  );

create policy "org members can view their meter photos"
  on storage.objects for select
  using (
    bucket_id = 'meter-photos'
    and (
      auth_role() = 'platform_admin'
      or (storage.foldername(name))[1] = auth_org_id()::text
    )
  );

-- ============================================================
-- Monthly bill auto-generation
-- Creates this month's monthly_bills row for every flat with an active
-- tenant in the caller's organization, if one doesn't already exist.
-- LER = last month's CER (or null if no history). Previous = last month's
-- Difference (or 0 if no history). Rent/garbage/rate are snapshotted from
-- the building/flat at generation time.
-- ============================================================
create or replace function ensure_monthly_bills(p_billing_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := auth_org_id();
  v_prev_month date := (p_billing_month - interval '1 month')::date;
begin
  if v_org_id is null and auth_role() != 'platform_admin' then
    raise exception 'no organization context for current user';
  end if;

  insert into monthly_bills (
    flat_id, tenant_id, billing_month,
    ler, previous, rent, garbage, electricity_rate
  )
  select
    f.id,
    t.id,
    p_billing_month,
    prev.cer,
    coalesce(prev.difference, 0),
    f.rent,
    b.garbage_fee,
    b.electricity_rate
  from flats f
  join buildings b on b.id = f.building_id
  join tenants t on t.flat_id = f.id and t.is_active
  left join monthly_bills prev
    on prev.flat_id = f.id and prev.billing_month = v_prev_month
  where b.organization_id = v_org_id
    and not exists (
      select 1 from monthly_bills mb
      where mb.flat_id = f.id and mb.billing_month = p_billing_month
    );
end;
$$;

grant execute on function ensure_monthly_bills(date) to authenticated;
