# RentCollector

Multi-tenant rent collection app: automates meter-reading capture, monthly
billing, payment tracking, and WhatsApp payment reminders for building
owners — replacing a manual Excel + click-to-chat WhatsApp workflow.

See **PROGRESS.md** for current build status and open decisions — read it
first in any new session.

## Stack
- Next.js (App Router, TypeScript, Tailwind)
- Supabase (Postgres, Auth, Storage)
- Vercel (hosting)
- WhatsApp Business Cloud API (reminders)

## Setup
```bash
npm install
cp .env.example .env.local   # fill in Supabase project values
npm run dev
```

Schema: `supabase/schema.sql` — apply via the Supabase SQL editor or CLI.
