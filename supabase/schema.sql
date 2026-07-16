-- ============================================================
-- RentCollector schema
-- Multi-tenant: Organization -> Building -> Flat -> Tenant -> MonthlyBill
-- ============================================================

-- ---------- Organizations (a building owner's account) ----------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_phone text,
  -- WhatsApp sending identity: null = use platform default/shared number.
  -- Filled in later once each org's WhatsApp Business setup is decided.
  whatsapp_config jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Users (extends Supabase auth.users) ----------
create type user_role as enum ('platform_admin', 'owner', 'caretaker');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references organizations (id) on delete cascade,
  role user_role not null,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
-- platform_admin rows have organization_id = null (not scoped to one org)

-- ---------- Buildings ----------
create table buildings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  electricity_rate numeric(10, 2) not null default 10.00, -- ₹ per unit
  garbage_fee numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Flats ----------
create table flats (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings (id) on delete cascade,
  room_no text not null,
  rent numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (building_id, room_no)
);

-- ---------- Tenants ----------
-- A flat can have a history of tenants over time; only one active at a time.
create table tenants (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references flats (id) on delete cascade,
  name text not null,
  phone text not null, -- normalized E.164, e.g. 91XXXXXXXXXX
  move_in_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Only one active tenant per flat at a time.
create unique index one_active_tenant_per_flat
  on tenants (flat_id)
  where is_active;

-- ---------- Monthly Bills ----------
create table monthly_bills (
  id uuid primary key default gen_random_uuid(),
  flat_id uuid not null references flats (id) on delete cascade,
  tenant_id uuid not null references tenants (id),
  billing_month date not null, -- store as first-of-month, e.g. 2026-07-01

  -- Meter readings
  ler numeric(10, 2), -- auto-filled from previous month's cer
  cer numeric(10, 2), -- entered by caretaker
  meter_photo_url text, -- evidence only, not OCR'd

  -- Charges (rent/garbage snapshotted at bill time so later rate changes
  -- don't rewrite historical bills)
  rent numeric(10, 2) not null default 0,
  garbage numeric(10, 2) not null default 0,
  electricity_rate numeric(10, 2) not null default 0,
  previous numeric(10, 2) not null default 0, -- carried from last month's difference

  -- Computed via generated columns: EC, total, difference
  ec numeric(10, 2) generated always as (
    case when cer is not null and ler is not null
      then (cer - ler) * electricity_rate
      else 0
    end
  ) stored,

  total numeric(10, 2) generated always as (
    coalesce(
      (case when cer is not null and ler is not null then (cer - ler) * electricity_rate else 0 end),
      0
    ) + rent + garbage + previous
  ) stored,

  paid numeric(10, 2) not null default 0,
  mode text, -- 'cash' | 'online'
  difference numeric(10, 2) generated always as (
    coalesce(
      (case when cer is not null and ler is not null then (cer - ler) * electricity_rate else 0 end),
      0
    ) + rent + garbage + previous - paid
  ) stored,

  reading_submitted_at timestamptz,
  paid_marked_at timestamptz,
  paid_marked_by uuid references profiles (id),
  verified boolean not null default false,
  whatsapp_sent_at timestamptz,

  created_at timestamptz not null default now(),
  unique (flat_id, billing_month)
);

create index idx_monthly_bills_flat_month on monthly_bills (flat_id, billing_month);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table buildings enable row level security;
alter table flats enable row level security;
alter table tenants enable row level security;
alter table monthly_bills enable row level security;

-- Helper: current user's organization_id and role
-- SECURITY DEFINER is required here: these functions query `profiles`, and
-- policies on `profiles` call these functions. Without security definer,
-- evaluating the policy re-triggers the policy via these functions ->
-- infinite recursion. Safe because both are hardcoded to auth.uid() (the
-- caller's own id), so a definer-privileged lookup can't leak other rows.
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

-- platform_admin sees/manages all organizations
create policy org_admin_all on organizations
  for all using (auth_role() = 'platform_admin');

create policy org_self_read on organizations
  for select using (id = auth_org_id());

create policy profiles_self_and_org on profiles
  for select using (
    id = auth.uid()
    or auth_role() = 'platform_admin'
    or organization_id = auth_org_id()
  );

create policy buildings_org_scoped on buildings
  for all using (
    auth_role() = 'platform_admin' or organization_id = auth_org_id()
  );

create policy flats_org_scoped on flats
  for all using (
    auth_role() = 'platform_admin'
    or building_id in (select id from buildings where organization_id = auth_org_id())
  );

create policy tenants_org_scoped on tenants
  for all using (
    auth_role() = 'platform_admin'
    or flat_id in (
      select f.id from flats f
      join buildings b on b.id = f.building_id
      where b.organization_id = auth_org_id()
    )
  );

create policy monthly_bills_org_scoped on monthly_bills
  for all using (
    auth_role() = 'platform_admin'
    or flat_id in (
      select f.id from flats f
      join buildings b on b.id = f.building_id
      where b.organization_id = auth_org_id()
    )
  );

-- Caretakers should only be able to write cer/meter_photo_url/reading_submitted_at,
-- not paid/mode/verified. Enforce via a restricted update policy + app-level checks
-- in the API route (Postgres column-level grants can supplement this later).
