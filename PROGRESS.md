# RentCollector — Progress

Read this file first in any new session before writing code.

## What this is
Multi-tenant rent collection app replacing a manual Excel workflow for a
100-flat building owner (with the intent to onboard other building owners
later). Full requirements/decisions log lives in project memory
(`/areas/rent-collection-app.md`) — read that too if available.

## Stack
Next.js (TS, App Router, Tailwind) + Supabase (Postgres/Auth/Storage) + Vercel.

## Status: deployed, core owner/admin flows verified live; caretaker-side runtime testing still pending

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
      `.update()`.
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

- [x] Owner can now enter a meter reading directly (not just view/mark-paid on
      what a caretaker submitted) — `/owner/bills` shows a "Save reading" form
      (CER + optional photo) on any bill with no submitted reading yet.
      `submit_meter_reading()` was caretaker/platform_admin only; extended the
      role check to include `owner` (`supabase/allow_owner_meter_reading.sql`,
      also kept `caretaker_functions.sql` in sync as source of truth). Confirmed
      run in the SQL Editor.

- [x] Mobile-responsive pass on owner/admin screens: sidebar is now a slide-out
      drawer under the `sm` breakpoint (top bar + hamburger, backdrop-to-close,
      closes on link tap) via new `AppShell.tsx`, persistent sidebar unchanged
      on larger screens; `DataTable` scrolls horizontally instead of squeezing
      columns; page padding scales down (`p-4` mobile → `p-8` desktop). Only
      build/lint-checked, not visually verified on an actual phone.

- [x] Show current-month bill status on `/owner/tenants` + inline mark-paid: a
      "This month's payment" column shows total/paid/mode/verified as the same
      editable inline form as `/owner/bills` `BillRow` (paid input, mode select,
      verified checkbox, Save), joined per tenant by `flat_id`. Clicking the
      form stops event propagation so it doesn't trigger the row's
      navigate-to-flat click. `/owner/bills` also got a "Mark fully paid"
      quick button next to the manual paid-amount field.
- [x] Flat detail page (`/owner/flats/[id]`) now shows full bill history across
      current + past tenants (`monthly_bills.tenant_id` already records which
      tenant each bill belonged to, no date-range guessing needed), a
      "Pending (all time)" stat summing unpaid difference across every bill for
      the flat, and a "Due next month (fixed)" stat — rent + garbage fee only,
      since electricity depends on a reading that hasn't happened yet and
      isn't projected/faked.
- [x] **RESOLVED — was listed here as a critical live bug:** `auth_org_id()` /
      `auth_role()` needed `security definer` to avoid infinite recursion when
      `profiles`' own RLS policy called them (see `supabase/fix_auth_helpers_recursion.sql`).
      Fix was run in the SQL Editor and confirmed live — login and every
      RLS-protected page (`/owner/buildings`, `/owner/bills`, etc.) work.
- [x] Deploy to Vercel — done
- [x] Runtime testing, core owner/admin flows — confirmed live: login (after the
      RLS recursion fix), `/admin/organizations` (create org + owner), owner
      building/flat/tenant CRUD, `/owner/bills` (mark paid, verify, owner-entered
      readings), `/owner/tenants` bill editing, flat detail bill history.

### Done (cont.)
- [x] **Security gap fix written — `supabase/revoke_direct_writes.sql`, NOT yet
      run in the SQL Editor.** `monthly_bills_org_scoped` (schema.sql) is a
      table-wide `for all` RLS policy keyed only on `organization_id`, not role,
      so a caretaker (or owner) calling `supabase.from('monthly_bills').update(...)`
      directly from the browser could bypass the app's server actions and the
      security-definer RPCs entirely and write `paid`/`mode`/`verified`/`cer`
      regardless of role. Fix: `revoke insert, update, delete on monthly_bills
      from authenticated` — the RPCs (`ensure_monthly_bills`, `submit_meter_reading`,
      `owner_update_bill`) are all `security definer` so they're unaffected and
      become the only write path. Confirmed before writing this that every raw
      `.from("monthly_bills")` call in `src/` (caretaker/page.tsx,
      owner/bills/page.tsx, owner/flats/[id]/page.tsx, owner/page.tsx,
      owner/tenants/page.tsx) is a `.select()`, not a write, so the app itself
      shouldn't break. **Still needs**: running the SQL in the SQL Editor, then
      the three-step manual test in the file's comments (owner mark-paid,
      caretaker submit, raw-update-should-now-fail)  .

- [x] Bulk import (`/owner/import`): owner downloads an `.xlsx` template
      (3 tabs — Buildings, Flats & Tenants, Bills History — generated by
      `src/app/owner/import/template/route.ts`), fills it in, re-uploads;
      client-side parse + validation (`src/app/owner/import/utils.ts`, using
      SheetJS) shows a preview with row-level errors before anything is
      saved; on confirm, `submitBulkImport()` (`actions.ts`) calls the new
      `bulk_import_org_data()` RPC (`supabase/bulk_import_function.sql`).
      Design, deliberately: buildings/flats are upserted (safe to re-run to
      fix a typo), tenants are insert-only-if-flat-has-none-yet, historical
      bills are insert-only and reject any `(flat, billing_month)` that
      already exists — so a resubmitted import can never overwrite paid/
      verified history. Whole RPC call is one transaction: any validation
      failure rolls back everything, including buildings/flats/tenants
      already upserted earlier in the same call. **Known limitation**:
      bills are attributed to whichever tenant currently occupies the flat
      — no support for attributing historical bills to a *previous* tenant
      if the flat changed hands mid-history. `npm run build` + `tsc --noEmit`
      + `eslint` all pass; **not yet runtime-tested against Supabase**
      (needs the RPC actually run in the SQL Editor first, same as the
      other `supabase/*.sql` files) and **not yet tested against a real
      owner's Excel sheet** — see below.

- [x] `supabase/bootstrap_admin.sql`: one-time `bootstrap_platform_admin(uuid, text)`
      function closing the "no bootstrap path for the first platform_admin" gap
      (every other role is created via an invite chain that requires an existing
      admin, so nothing could create the first one). Self-locking — only runs
      while zero `platform_admin` profiles exist, so it can't be replayed to mint
      extra admins later, and it's deliberately not granted to `authenticated`
      (SQL Editor / service-role only, never callable from the app). Usage:
      create the auth user by hand in the Supabase dashboard, then run
      `select bootstrap_platform_admin('<uuid>', 'Name')` in the SQL Editor.
      **Written but not yet run against the live project** — needs the same
      SQL-Editor step as the other `supabase/*.sql` files, then a login test.

### Not started yet
- [ ] **Sanity-check the bulk import template's column layout against the
      actual Excel sheet the friend/owner has been using.** The template
      (Buildings / Flats & Tenants / Bills History, with `building_key`/
      `flat_key` linking columns) was designed from the app's own schema,
      not from looking at the real manual spreadsheet — column names,
      units, date formats, or the mental model of "one row per flat" might
      not match how the owner's actual sheet is laid out. Worth walking
      through their real file before assuming the template is usable as-is.
- [ ] **Supabase's default email provider hit its rate limit during testing**
      (a handful of emails/hour, not meant for production). Every invite flow
      (`inviteUserByEmail` for owners and caretakers) depends on it. Before
      inviting real owners/caretakers, wire up a real SMTP provider (Resend,
      Postmark, SendGrid, etc.) under Supabase → Authentication → SMTP Settings
      — otherwise this will block onboarding again, not just testing.
- [ ] **Caretaker login method — deliberately deferred, needs real owner input.**
      Current invite flow (`/owner/caretakers/new`) requires an email, but many
      caretakers won't have one — phone needs to be the primary login. Two
      options with different cost, not decided yet:
      1. Quick workaround, no new dependency: owner manually creates the
         caretaker's Supabase Auth user with a synthetic email
         (e.g. `9876543210@caretaker.local`) + a password set directly, tells
         them the password out of band. Works today, but it's the owner
         distributing passwords, not real phone login.
      2. Proper phone/SMS OTP login: needs a real SMS provider (Twilio, MSG91,
         etc.) wired into Supabase Auth — external account, likely a cost,
         more setup, but the actual "log in with your phone number" experience.
      Holding off until it's clear how actual owners want this to work, rather
      than picking one blind. Don't build either without checking back first.
- [ ] **WhatsApp caretaker bot — design decided, not yet built, blocked on Meta.**
      Explored and decided (not just the generic integration item below):
      - Scope: WhatsApp is the caretaker's *primary* channel, web login (`/caretaker`)
        stays as fallback — not a replacement. This effectively also answers the
        deferred "caretaker login method" item below: on WhatsApp, the caretaker's
        phone number *is* their identity, no password/OTP needed for that channel.
      - Flow: monthly cron sends a template-message reminder to the caretaker
        responsible for a flat → caretaker replies → bot sends an interactive list
        of their pending flats → caretaker picks one → bot asks for CER → asks for
        a photo → bot downloads the photo from Meta's Graph API and re-uploads it
        to the existing org-scoped storage bucket → saves the reading → sends a
        template message to the **owner** with the reading + photo → owner replies
        to confirm payment (mark paid), same fields as `/owner/bills`.
      - Reusable as-is: storage bucket/path convention, `/owner/bills` review screen.
      - New work required: webhook endpoint (signature verification, message
        routing), a conversation-state table (WhatsApp is stateless message-by-
        message — need to track which flat/step a phone number is mid-flow on),
        interactive list/menu message formatting, media download-then-reupload.
      - **Two gaps this surfaced, both need resolving before/while building:**
        1. No caretaker↔building assignment exists in the schema. The web app lets
           any caretaker in an org act on any flat in that org, which is fine for a
           manual list, but a monthly reminder needs to know exactly which
           caretaker to message for exactly which flat. Needs something like
           `buildings.caretaker_id` (or a join table if a building can have more
           than one caretaker) — not designed yet.
        2. Auth mechanics: `submit_meter_reading()` / `owner_update_bill()` check
           `auth.uid()`, which doesn't exist for a webhook with no Supabase
           session. Plan is phone-number-keyed variants of these RPCs (look the
           caller up by phone instead of auth.uid(), same column/role
           restrictions) rather than a loose RLS-bypass in app code.
      - **Meta approval requirements, now larger than previously scoped:** business
        verification (already blocking, in progress) PLUS two separate approved
        message templates (caretaker reminder, owner confirmation) — template
        review has its own lead time and can bounce on first submission, worth
        submitting in parallel with business verification rather than after.
      - Not started: could scaffold the schema change, conversation-state table,
        and webhook skeleton (signature verification, routing) now since none of
        that depends on Meta approval — holding until told to proceed.
- [ ] Runtime testing, caretaker side — NOT yet confirmed end-to-end. Caretaker
      invite → caretaker login → submit reading → shows up correctly on
      owner's `/owner/bills` has not been walked through live, partly because
      the caretaker login method itself is still an open question (see above).

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
