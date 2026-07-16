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
      `.update()`. **Not yet run in the SQL Editor** — schema.sql and
      storage_and_functions.sql are applied, this one is not.
- [x] Verified: `npm run build` passes clean against real Supabase env vars (still can't
      runtime-test from this sandbox — supabase.co isn't on the sandbox's network
      allow-list — needs testing on Vercel or a local machine with real network access)
- [x] Caretaker invite flow: `/owner/caretakers` (list) + `/owner/caretakers/new` (form) —
      owner invites a caretaker by email (same invite-link pattern as admin→owner),
      profile created with role=caretaker scoped to the owner's own organization_id
      (`src/app/owner/caretakers/`)
- [x] `supabase/tenant_functions.sql`: `replace_tenant()` — atomically deactivates the
      current tenant and inserts the new one, enforcing org ownership and role
      server-side (avoids the "flat briefly has 0 or 2 active tenants" race).
      **Not yet run in the SQL Editor.**
- [x] Building/flat/tenant management UI (owner-side):
      `/owner/buildings` (list + create), `/owner/buildings/[id]` (detail + flats list +
      add flat), `/owner/buildings/[id]/flats/new`, `/owner/flats/[id]` (detail, current +
      past tenants), `/owner/flats/[id]/tenants/new` (add/replace tenant, warns that
      adding a new tenant retires the old one). Phone numbers normalized to
      91XXXXXXXXXX in `replaceTenant()` server action before hitting the RPC.
- [x] Owner bills flow (`/owner/bills`): month view (± navigation via `?month=`),
      auto-runs `ensure_monthly_bills()` only when viewing the actual current month,
      shows LER/CER/EC/rent/garbage/previous/total/difference per flat, signed URL
      link to the meter photo (10 min expiry), inline form to set paid amount + mode
      + verified checkbox, split into unresolved/settled sections
      (`src/app/owner/bills/page.tsx`, `BillRow.tsx`, `actions.ts`, `utils.ts`)
- [x] `supabase/owner_functions.sql`: `owner_update_bill()` — column-scopes owner
      writes to paid/mode/verified only, same pattern as `submit_meter_reading()`.
      See the security note inside that file: this does NOT by itself close the
      write-bypass gap described below, since `monthly_bills_org_scoped` in
      schema.sql permits raw table writes to any column for any org member
      regardless of role.

- [x] `supabase/caretaker_functions.sql`, `supabase/tenant_functions.sql`, and
      `supabase/owner_functions.sql` all run in the SQL Editor (per user
      confirmation — not independently verified from this sandbox, no network
      path to supabase.co here). Caretaker invite → caretaker flow →
      owner mark-paid/verify should now be usable end to end on a real deployment.

- [x] CRM-style redesign of owner/admin desk screens (explicitly scoped to
      exclude the caretaker mobile flow, per decision): design tokens
      (paper/ink/surface/line/accent/amber/red), persistent sidebar nav
      (`src/components/Sidebar.tsx`, `owner/layout.tsx`, `admin/layout.tsx`),
      reusable sortable/filterable `DataTable` component with a colored
      left-border row-status treatment, `StatCard` + a real owner dashboard
      (buildings/flats/unpaid/unverified/collected-this-month counts).
      Confirmed working live on `/admin/organizations` after fixing a real bug
      (see below) — not just build-checked anymore.
- [x] Fixed a server error on `/admin/organizations`, `/owner/buildings`,
      `/owner/caretakers` introduced by the redesign above: column definitions
      (accessor/sortValue functions) were defined in server-component pages and
      passed as props into the client-component `DataTable` — functions can't
      cross the server→client boundary as plain props (only `"use server"`
      actions can). `npm run build` didn't catch it since these are dynamic
      routes not rendered at build time; only surfaced on a real request.
      Fixed by moving each page's columns into a small client wrapper
      (`OrganizationsTable`, `BuildingsTable`, `CaretakersTable`, `FlatsTable`)
      that takes only plain row data from its server-component parent.

### Not started yet
- [ ] **CRITICAL, confirmed live during first login attempt:** `auth_org_id()` and
      `auth_role()` in schema.sql were not `security definer`. Since policies on
      `profiles` call these functions, and these functions query `profiles`,
      evaluating the policy re-triggers itself — infinite recursion — on every
      direct `.from(table).select()` through the browser-session client on ANY
      RLS-protected table, not just `profiles`. This is why login failed with
      `no-profile`: the `profiles` select errored, the error was silently
      swallowed, and it fell through to the no-profile branch. It also means
      `/owner/buildings`, `/owner/bills`, `/owner/flats/[id]`, and the caretaker
      bill listing were all silently broken too — none of them go through the
      security-definer RPCs, which is the only reason the RPCs themselves
      (`submit_meter_reading`, `owner_update_bill`, `replace_tenant`,
      `ensure_monthly_bills`) never hit this. **Fix written:**
      `supabase/fix_auth_helpers_recursion.sql` marks both functions security
      definer with a fixed search_path (also fixed in schema.sql for anyone
      reading it fresh). **Not yet run in the SQL Editor — do this first,
      before anything else, then retry login.**
- [ ] **Security gap found while building the owner bills flow, not yet fixed:**
      `monthly_bills_org_scoped` (schema.sql) is a table-wide `for all` RLS policy
      keyed only on `organization_id`, not on role. A caretaker (or owner) calling
      `supabase.from('monthly_bills').update(...)` directly from the browser —
      bypassing the app's server actions and the security-definer RPCs entirely —
      can currently write `paid`/`mode`/`verified` (or `cer`) regardless of role.
      The RPCs (`submit_meter_reading`, `owner_update_bill`) only produce correct
      behavior when called through this app's own code; they don't prevent a
      client from going around them. Real fix: revoke direct UPDATE/INSERT grants
      on `monthly_bills` for the `authenticated` role and force all writes through
      the security-definer functions. Not done here — didn't want to change RLS
      blind with no way to runtime-test it from this sandbox.
- [ ] **No bootstrap path for the first platform_admin.** Every role after it is
      created via an invite chain (admin invites owner, owner invites caretaker),
      but nothing creates the first admin — confirmed live: signing in with a
      manually-created Supabase Auth user hit `no-profile` / "No role assigned to
      this account yet" because `login/actions.ts` looks up a `profiles` row that
      doesn't exist until one is inserted by hand. Current workaround: create the
      auth user in the Supabase dashboard, then manually
      `insert into profiles (id, role, full_name) values ('<uid>', 'platform_admin', '...')`
      in the SQL Editor. Worth a proper fix later — e.g. a one-time seed script or
      a documented manual step in a SETUP.md — so this isn't rediscovered per
      deployment.
- [ ] **Supabase's default email provider hit its rate limit during testing**
      (a handful of emails/hour, not meant for production). Every invite flow
      (`inviteUserByEmail` for owners and caretakers) depends on it. Before
      inviting real owners/caretakers, wire up a real SMTP provider (Resend,
      Postmark, SendGrid, etc.) under Supabase → Authentication → SMTP Settings
      — otherwise this will block onboarding again, not just testing.
- [ ] WhatsApp Cloud API integration (blocked on Meta business verification — start that
      process in parallel, has real lead time)
- [x] Deploy to Vercel — done
- [ ] Runtime testing end-to-end (in progress — hit the platform_admin bootstrap gap
      above on first login attempt; not yet completed)

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
