# RentCollector — Progress

Read this file first in any new session before writing code.

## What this is
Multi-tenant rent collection app replacing a manual Excel workflow for a
100-flat building owner (with the intent to onboard other building owners
later). Full requirements/decisions log lives in project memory
(`/areas/rent-collection-app.md`) — read that too if available.

## Stack
Next.js (TS, App Router, Tailwind) + Supabase (Postgres/Auth/Storage) + Vercel.

## Status: scaffolding stage

### Done
- [x] Next.js app scaffolded (`create-next-app`, TypeScript, Tailwind, App Router, `src/` dir)
- [x] `@supabase/supabase-js` + `@supabase/ssr` installed
- [x] `supabase/schema.sql` written: full schema + RLS policies
      - Tables: organizations, profiles, buildings, flats, tenants, monthly_bills
      - Computed columns (generated always as): ec, total, difference
      - RLS scoped by organization_id via `auth_org_id()` / `auth_role()` helper functions
      - NOT yet applied to an actual Supabase project (no project created yet)

- [x] `src/lib/supabase/` client, server, admin (service-role) helpers
- [x] Auth: login page (`/login`) + server actions (`login`, `logout`)
- [x] Route protection via `src/proxy.ts` (Next 16 renamed middleware.ts to proxy.ts) —
      role-gates `/admin`, `/owner`, `/caretaker` by reading `profiles.role`, redirects
      unauthenticated/wrong-role users to `/login`
- [x] Platform admin flow: `/admin/organizations` (list) + `/admin/organizations/new`
      (form) — creates org row, invites owner via `auth.admin.inviteUserByEmail`,
      creates their `profiles` row with role=owner. Rolls back the org if the invite fails.
- [x] Placeholder `/owner` and `/caretaker` dashboards (just enough to prove routing +
      role gating works end to end) — no real bill data wired up yet
- [x] Verified: `npm run build` passes clean (had to swap next/font Google Fonts for
      system fonts — this sandbox's network doesn't reach fonts.googleapis.com; not
      expected to be an issue on Vercel, but removed the dependency anyway)

### Not started yet
- [x] Create actual Supabase project, apply schema.sql, get real env vars — DONE,
      schema.sql and storage_and_functions.sql both applied to the live project
- [x] `supabase/storage_and_functions.sql`: meter-photos storage bucket (private) +
      RLS policies scoped by organization_id folder prefix, plus `ensure_monthly_bills()`
      Postgres function (idempotent — safe to call every page load) that auto-creates
      this month's bill rows per active-tenant flat, pulling LER/Previous from last month
- [x] Caretaker flow (`/caretaker`): calls `ensure_monthly_bills()` on load, lists this
      month's flats split into pending/submitted, per-flat form (CER + optional photo,
      camera capture on mobile) posts via server action which uploads the photo to
      the org-scoped storage path and updates the monthly_bills row
      (`src/app/caretaker/actions.ts`, `page.tsx`, `ReadingForm.tsx`, `utils.ts`)
- [x] `supabase/caretaker_functions.sql`: `submit_meter_reading()` — a security-definer
      function that restricts a caretaker's write to exactly cer/photo/timestamp,
      regardless of what the frontend sends (closes a gap where the raw table RLS
      policy would otherwise have allowed writing paid/mode/verified too since it's
      table-wide, not column-scoped). `actions.ts` now calls this RPC instead of a raw
      `.update()`. **This file still needs to be run in the SQL Editor** — schema.sql
      and storage_and_functions.sql are applied, this one is not yet.

- [x] Verified: `npm run build` passes clean against real Supabase env vars (still can't
      runtime-test from this sandbox — supabase.co isn't on the sandbox's network
      allow-list — needs testing on Vercel or a local machine with real network access)

### Not started yet
- [ ] Run `supabase/caretaker_functions.sql` in the SQL Editor (see above — not applied yet)
- [ ] Caretaker account creation — currently ONLY the owner-invite flow exists
      (`/admin/organizations/new`). No way yet to invite a caretaker and link them to an
      organization/buildings. Needed before the caretaker flow above can actually be used.
- [ ] Owner flow: view bills, mark paid + mode, verify readings (photo review)
- [ ] WhatsApp Cloud API integration (blocked on Meta business verification — start that
      process in parallel, has real lead time)
- [ ] Deploy to Vercel
- [ ] Runtime testing end-to-end (blocked on the above two + real network access)

## Open decisions still pending (not blockers, but unresolved)
- WhatsApp sending identity: per-org Meta account vs one shared branded number — schema
  supports either via `organizations.whatsapp_config` (nullable, falls back to platform default)
- Whether friend already has cloud hosting elsewhere (asked, answer was "not sure yet")

## Key business rules (do not change without asking)
- LER auto = previous month's CER. Previous auto = previous month's Difference.
- EC = (CER − LER) × electricity_rate (rate is per-building, not global)
- Total = EC + Rent + Garbage + Previous
- Difference = Total − Paid
- Garbage fee applies to ALL buildings (one legacy sheet was missing it by mistake — fixed)
- Meter photo is evidence only — no OCR, caretaker types CER manually
- Caretaker enters CER + photo only. Owner marks Paid + Mode (caretaker tells owner verbally
  after collecting — owner does the marking, not the caretaker)
- Tenant phone numbers normalized to E.164 (91XXXXXXXXXX) on entry

## How to push changes
Requires a GitHub fine-grained PAT (repo: apnipantry/rentcollector, Contents: read/write)
pasted into chat when ready to push — not stored anywhere persistent, user provides fresh
each session.
