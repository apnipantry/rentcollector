<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- **Stack:** Next.js 16 (`npm run dev` on port 3000) plus **local Supabase** via Docker (`npx supabase@2.20.12 start`). The configured `start` script runs `.cursor/scripts/start-dev.sh`, which starts Docker if needed, boots Supabase, applies `supabase/*.sql`, writes `.env.local`, and ensures a demo platform admin exists.
- **Lint / typecheck / build:** `npm run lint`, `npx tsc --noEmit`, `npm run build` (see `package.json` and `PROGRESS.md`). There is no automated test suite in this repo yet.
- **Local demo login** (after start finishes): `admin@rentcollector.local` / `RentCollectorDev1!` → `/admin/organizations`. Override with `RENTCOLLECTOR_DEV_ADMIN_EMAIL` and `RENTCOLLECTOR_DEV_ADMIN_PASSWORD` if needed.
- **Hosted Supabase instead:** set environment secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, write `.env.local`, and run `npm run dev` only (skip the Supabase scripts). Schema still comes from `supabase/*.sql` in the Supabase SQL editor or CLI.
- **Next.js 16 routing:** route protection lives in `src/proxy.ts` (not `middleware.ts`).
