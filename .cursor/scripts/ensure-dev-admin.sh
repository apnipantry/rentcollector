#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Local-only bootstrap credentials for Cloud Agent demos.
DEV_EMAIL="${RENTCOLLECTOR_DEV_ADMIN_EMAIL:-admin@rentcollector.local}"
DEV_PASSWORD="${RENTCOLLECTOR_DEV_ADMIN_PASSWORD:-RentCollectorDev1!}"
DEV_NAME="${RENTCOLLECTOR_DEV_ADMIN_NAME:-Dev Admin}"

set -a
# shellcheck disable=SC1091
source .env.local
set +a

ADMIN_COUNT=$(docker exec -i supabase_db_workspace psql -U postgres -tAc \
  "select count(*) from profiles where role = 'platform_admin';")

if [[ "${ADMIN_COUNT// /}" != "0" ]]; then
  exit 0
fi

RESP=$(curl -s -X POST "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${DEV_EMAIL}\",\"password\":\"${DEV_PASSWORD}\",\"email_confirm\":true}")

USER_ID=$(python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" <<<"$RESP")

docker exec -i supabase_db_workspace psql -U postgres -v ON_ERROR_STOP=1 \
  -c "select bootstrap_platform_admin('${USER_ID}', '${DEV_NAME}');" >/dev/null
