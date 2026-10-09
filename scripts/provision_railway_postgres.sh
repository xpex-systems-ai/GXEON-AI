#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v railway >/dev/null 2>&1; then
  cat >&2 <<'ERR'
railway CLI is required for PostgreSQL provisioning.
Install/authenticate Railway, then rerun:
  railway login
  pnpm run db:provision:railway
ERR
  exit 127
fi

if [[ "${GXEON_SKIP_RAILWAY_ADD_POSTGRES:-false}" != "true" ]]; then
  echo "==> Inspecting Railway services before PostgreSQL provisioning"
  services_json="$(railway service list --json)"

  if printf '%s' "$services_json" | grep -Eqi '"(name|serviceName)"[[:space:]]*:[[:space:]]*"[^"]*postgres[^"]*"'; then
    echo "==> PostgreSQL-like service already exists; skipping duplicate creation"
  else
    echo "==> Provisioning Railway PostgreSQL service"
    railway add --database postgres --json
  fi
else
  echo "==> Skipping PostgreSQL creation because GXEON_SKIP_RAILWAY_ADD_POSTGRES=true"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  cat >&2 <<'ERR'
DATABASE_URL is not available in this shell yet.
Wire the API service to the Railway PostgreSQL service with a reference variable, for example:
  DATABASE_URL='${{Postgres.DATABASE_URL}}'
Then export/run the command in the linked Railway environment and rerun:
  pnpm run db:provision:railway
No schema writes were attempted.
ERR
  exit 1
fi

echo "==> Applying Drizzle schema"
pnpm --filter @workspace/db run push

echo "==> Validating financial tables, indexes, enums, and rollback-safe persistence"
pnpm run db:validate:financial -- --write-smoke

echo "==> Database provisioning complete"
