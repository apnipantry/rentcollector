-- Run this AFTER schema.sql, storage_and_functions.sql, caretaker_functions.sql,
-- allow_owner_meter_reading.sql, tenant_functions.sql, owner_functions.sql, and
-- revoke_direct_writes.sql.
--
-- Powers the owner-facing bulk import feature (/owner/import): onboarding an
-- existing building's buildings/flats/tenants plus historical monthly bills
-- from an Excel template, in one shot.
--
-- Design, spelled out because several of these are deliberate v1 simplifications,
-- not oversights:
--
-- 1. Buildings/flats are UPSERTED (matched by name / building+room_no), so
--    re-running an import to fix a typo in rent or electricity_rate is safe
--    and won't create duplicates.
-- 2. Tenants are insert-if-the-flat-has-no-active-tenant-yet. If a flat
--    already has an active tenant (e.g. a previous import, or the owner
--    already added them by hand), the sheet's tenant row is silently
--    ignored for that flat — it does NOT attempt to replace the tenant.
--    (Replacing an existing tenant is what replace_tenant() /
--    /owner/flats/[id]/tenants/new is for.)
-- 3. Historical bills are INSERT-ONLY and reject, per row, any
--    (flat, billing_month) that already has a bill row — this is the
--    financial-integrity boundary: a bulk import can backfill history that
--    doesn't exist yet, but can never overwrite an existing bill (paid,
--    verified, etc.), regardless of when or how many times it's re-run.
-- 4. KNOWN LIMITATION: bills are attributed to whichever tenant currently
--    occupies the flat (or the tenant just created by this same import) —
--    there is no way, in this v1, to attribute historical bills to a
--    *previous* tenant if the flat has changed hands. Fine for the common
--    case (one long-running tenant, backfilling their history); wrong if
--    a flat had multiple tenants across the imported date range. Flagging
--    this rather than silently getting it wrong — worth revisiting if it
--    turns out to matter in practice.
-- 5. All-or-nothing: every row across all four sheets is validated BEFORE
--    any insert happens for bills; if anything fails validation, the whole
--    call raises and the entire transaction (including any building/flat/
--    tenant upserts already performed earlier in the same call) rolls
--    back. No partial imports.
--
-- p_payload shape (see src/app/owner/import/utils.ts for the TS mirror):
-- {
--   "buildings": [{ "key": "b1", "name": "...", "electricity_rate": 10, "garbage_fee": 50 }],
--   "flats":     [{ "key": "f1", "building_key": "b1", "room_no": "101", "rent": 8000 }],
--   "tenants":   [{ "flat_key": "f1", "name": "...", "phone": "919876543210", "move_in_date": "2024-01-01" }],
--   "bills":     [{ "flat_key": "f1", "billing_month": "2026-01-01", "ler": 120, "cer": 150,
--                    "rent": 8000, "garbage": 50, "electricity_rate": 10, "previous": 0,
--                    "paid": 8500, "mode": "cash", "verified": true }]
-- }
-- "key" values are caller-chosen temporary IDs used only to link rows within
-- one payload (real buildings/flats don't have IDs yet before insert).

create or replace function bulk_import_org_data(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid := auth_org_id();
  v_building jsonb;
  v_flat jsonb;
  v_tenant jsonb;
  v_bill jsonb;
  v_building_ids jsonb := '{}'::jsonb; -- building_key -> building id (text)
  v_flat_ids jsonb := '{}'::jsonb;     -- flat_key -> flat id (text)
  v_flat_tenant_ids jsonb := '{}'::jsonb; -- flat_key -> tenant id to attribute bills to (text)
  v_errors jsonb := '[]'::jsonb;
  v_building_id uuid;
  v_flat_id uuid;
  v_tenant_id uuid;
  v_existing_active_tenant uuid;
  v_dup_count int;
  v_buildings_created int := 0;
  v_flats_created int := 0;
  v_tenants_created int := 0;
  v_bills_created int := 0;
begin
  if auth_role() not in ('owner', 'platform_admin') then
    raise exception 'only an owner can bulk import data';
  end if;

  if v_org_id is null and auth_role() != 'platform_admin' then
    raise exception 'no organization context for current user';
  end if;

  -- ---------- Pass 1: buildings (upsert by name) ----------
  for v_building in select * from jsonb_array_elements(coalesce(p_payload->'buildings', '[]'::jsonb))
  loop
    if (v_building->>'key') is null or coalesce(trim(v_building->>'name'), '') = '' then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Buildings', 'key', v_building->>'key', 'error', 'missing key or name'
      );
      continue;
    end if;

    select id into v_building_id
    from buildings
    where organization_id = v_org_id and lower(name) = lower(v_building->>'name');

    if v_building_id is null then
      insert into buildings (organization_id, name, electricity_rate, garbage_fee)
      values (
        v_org_id,
        v_building->>'name',
        coalesce((v_building->>'electricity_rate')::numeric, 10),
        coalesce((v_building->>'garbage_fee')::numeric, 0)
      )
      returning id into v_building_id;
      v_buildings_created := v_buildings_created + 1;
    else
      update buildings
      set electricity_rate = coalesce((v_building->>'electricity_rate')::numeric, electricity_rate),
          garbage_fee = coalesce((v_building->>'garbage_fee')::numeric, garbage_fee)
      where id = v_building_id;
    end if;

    v_building_ids := jsonb_set(v_building_ids, array[v_building->>'key'], to_jsonb(v_building_id::text));
  end loop;

  -- ---------- Pass 2: flats (upsert by building_id + room_no) ----------
  for v_flat in select * from jsonb_array_elements(coalesce(p_payload->'flats', '[]'::jsonb))
  loop
    if (v_flat->>'key') is null or (v_flat->>'building_key') is null
       or coalesce(trim(v_flat->>'room_no'), '') = '' then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Flats & Tenants', 'key', v_flat->>'key', 'error', 'missing key, building_key, or room_no'
      );
      continue;
    end if;

    v_building_id := nullif(v_building_ids->>(v_flat->>'building_key'), '')::uuid;
    if v_building_id is null then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Flats & Tenants', 'key', v_flat->>'key',
        'error', format('unknown building_key %s', v_flat->>'building_key')
      );
      continue;
    end if;

    select id into v_flat_id
    from flats
    where building_id = v_building_id and room_no = v_flat->>'room_no';

    if v_flat_id is null then
      insert into flats (building_id, room_no, rent)
      values (v_building_id, v_flat->>'room_no', coalesce((v_flat->>'rent')::numeric, 0))
      returning id into v_flat_id;
      v_flats_created := v_flats_created + 1;
    else
      update flats set rent = coalesce((v_flat->>'rent')::numeric, rent) where id = v_flat_id;
    end if;

    v_flat_ids := jsonb_set(v_flat_ids, array[v_flat->>'key'], to_jsonb(v_flat_id::text));
  end loop;

  -- ---------- Pass 3: tenants (insert only if flat has no active tenant yet) ----------
  for v_tenant in select * from jsonb_array_elements(coalesce(p_payload->'tenants', '[]'::jsonb))
  loop
    if (v_tenant->>'flat_key') is null or coalesce(trim(v_tenant->>'name'), '') = ''
       or coalesce(trim(v_tenant->>'phone'), '') = '' then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Flats & Tenants', 'flat_key', v_tenant->>'flat_key',
        'error', 'missing flat_key, tenant name, or tenant phone'
      );
      continue;
    end if;

    v_flat_id := nullif(v_flat_ids->>(v_tenant->>'flat_key'), '')::uuid;
    if v_flat_id is null then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Flats & Tenants', 'flat_key', v_tenant->>'flat_key',
        'error', format('unknown flat_key %s', v_tenant->>'flat_key')
      );
      continue;
    end if;

    select id into v_existing_active_tenant from tenants where flat_id = v_flat_id and is_active;

    if v_existing_active_tenant is not null then
      -- Flat already has a tenant — don't touch it, just remember who to
      -- attribute this flat's imported bills to.
      v_flat_tenant_ids := jsonb_set(
        v_flat_tenant_ids, array[v_tenant->>'flat_key'], to_jsonb(v_existing_active_tenant::text)
      );
      continue;
    end if;

    insert into tenants (flat_id, name, phone, move_in_date, is_active)
    values (
      v_flat_id, v_tenant->>'name', v_tenant->>'phone',
      nullif(v_tenant->>'move_in_date', '')::date, true
    )
    returning id into v_tenant_id;
    v_tenants_created := v_tenants_created + 1;

    v_flat_tenant_ids := jsonb_set(v_flat_tenant_ids, array[v_tenant->>'flat_key'], to_jsonb(v_tenant_id::text));
  end loop;

  -- ---------- Pass 4: validate bills (insert-only; reject existing flat+month) ----------
  for v_bill in select * from jsonb_array_elements(coalesce(p_payload->'bills', '[]'::jsonb))
  loop
    if (v_bill->>'flat_key') is null or (v_bill->>'billing_month') is null then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Bills History', 'flat_key', v_bill->>'flat_key', 'error', 'missing flat_key or billing_month'
      );
      continue;
    end if;

    v_flat_id := nullif(v_flat_ids->>(v_bill->>'flat_key'), '')::uuid;
    if v_flat_id is null then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Bills History', 'flat_key', v_bill->>'flat_key',
        'error', format('unknown flat_key %s', v_bill->>'flat_key')
      );
      continue;
    end if;

    v_tenant_id := nullif(v_flat_tenant_ids->>(v_bill->>'flat_key'), '')::uuid;
    if v_tenant_id is null then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Bills History', 'flat_key', v_bill->>'flat_key',
        'error', 'flat has no tenant (in this import or already on file) to attribute this bill to'
      );
      continue;
    end if;

    select count(*) into v_dup_count
    from monthly_bills
    where flat_id = v_flat_id and billing_month = (v_bill->>'billing_month')::date;

    if v_dup_count > 0 then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Bills History', 'flat_key', v_bill->>'flat_key', 'billing_month', v_bill->>'billing_month',
        'error', 'a bill already exists for this flat and month — import will not overwrite it'
      );
      continue;
    end if;

    if (v_bill->>'mode') is not null and (v_bill->>'mode') not in ('cash', 'online') then
      v_errors := v_errors || jsonb_build_object(
        'sheet', 'Bills History', 'flat_key', v_bill->>'flat_key', 'billing_month', v_bill->>'billing_month',
        'error', 'mode must be cash or online (or left blank)'
      );
    end if;
  end loop;

  -- Abort entirely (rolling back passes 1–3 too) if anything failed validation.
  if jsonb_array_length(v_errors) > 0 then
    raise exception '%', v_errors::text;
  end if;

  -- ---------- Pass 5: insert bills (validation above already ruled out conflicts) ----------
  for v_bill in select * from jsonb_array_elements(coalesce(p_payload->'bills', '[]'::jsonb))
  loop
    v_flat_id := (v_flat_ids->>(v_bill->>'flat_key'))::uuid;
    v_tenant_id := (v_flat_tenant_ids->>(v_bill->>'flat_key'))::uuid;

    insert into monthly_bills (
      flat_id, tenant_id, billing_month, ler, cer, rent, garbage, electricity_rate,
      previous, paid, mode, verified
    ) values (
      v_flat_id, v_tenant_id, (v_bill->>'billing_month')::date,
      nullif(v_bill->>'ler', '')::numeric, nullif(v_bill->>'cer', '')::numeric,
      coalesce((v_bill->>'rent')::numeric, 0), coalesce((v_bill->>'garbage')::numeric, 0),
      coalesce((v_bill->>'electricity_rate')::numeric, 0), coalesce((v_bill->>'previous')::numeric, 0),
      coalesce((v_bill->>'paid')::numeric, 0), nullif(v_bill->>'mode', ''),
      coalesce((v_bill->>'verified')::boolean, false)
    );
    v_bills_created := v_bills_created + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'buildings_created', v_buildings_created,
    'flats_created', v_flats_created,
    'tenants_created', v_tenants_created,
    'bills_created', v_bills_created
  );
end;
$$;

grant execute on function bulk_import_org_data(jsonb) to authenticated;
