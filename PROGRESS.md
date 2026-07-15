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
- [ ] Create actual Supabase project, apply schema.sql, get real env vars (still using
      placeholders — nothing has been tested against a live Supabase instance yet)
- [ ] Caretaker flow: flat list for the month, CER entry + photo upload
- [ ] Owner flow: view bills, mark paid + mode, verify readings
- [ ] Auto-generate next month's monthly_bills rows (LER = prior CER, Previous = prior Difference)
- [ ] WhatsApp Cloud API integration (blocked on Meta business verification — start that
      process in parallel, has real lead time)
- [ ] Deploy to Vercel
- [ ] Storage bucket + policy for meter photos (referenced in schema as meter_photo_url,
      bucket not created yet)

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
