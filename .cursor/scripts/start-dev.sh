#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SUPABASE_VERSION="${SUPABASE_CLI_VERSION:-2.20.12}"

bash "$ROOT/.cursor/scripts/ensure-docker.sh"
npx --yes "supabase@${SUPABASE_VERSION}" start
bash "$ROOT/.cursor/scripts/apply-supabase-sql.sh"
bash "$ROOT/.cursor/scripts/write-env-local.sh"
bash "$ROOT/.cursor/scripts/ensure-dev-admin.sh"

exec npm run dev
