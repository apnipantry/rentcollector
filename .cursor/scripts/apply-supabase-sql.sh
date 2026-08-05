#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase_db_workspace}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "Supabase database container $DB_CONTAINER is not running" >&2
  exit 1
fi

if docker exec -i "$DB_CONTAINER" psql -U postgres -tAc \
  "select to_regclass('public.organizations') is not null;" \
  | grep -qx t; then
  exit 0
fi

apply() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 "$@"
}

for f in \
  schema.sql \
  fix_auth_helpers_recursion.sql \
  storage_and_functions.sql \
  caretaker_functions.sql \
  tenant_functions.sql \
  owner_functions.sql \
  allow_owner_meter_reading.sql \
  bulk_import_function.sql \
  owner_delete_functions.sql \
  bootstrap_admin.sql
do
  apply < "$ROOT/supabase/$f" >/dev/null
done
