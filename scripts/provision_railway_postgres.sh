#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v railway >/dev/null 2>&1; then
  cat >&2 <<'ERR'
railway CLI is required for automatic PostgreSQL provisioning.
Install and authenticate Railway, then rerun:
  railway login
  pnpm run db:provision:railway
ERR
  exit 127
fi

if [[ "${GXEON_SKIP_RAILWAY_ADD_POSTGRES:-false}" != "true" ]]; then
  echo "==> Provisioning Railway PostgreSQL service"
  railway add postgres
else
  echo "==> Skipping 'railway add postgres' because GXEON_SKIP_RAILWAY_ADD_POSTGRES=true"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  cat >&2 <<'ERR'
DATABASE_URL is still not exported in this shell.
Copy the PostgreSQL connection string from Railway variables, then run:
  export DATABASE_URL='postgresql://user:password@host:5432/gxeon'
  pnpm run db:provision:railway
ERR
  exit 1
fi

echo "==> Applying Drizzle migrations"
pnpm --filter @workspace/db run push

echo "==> Validating financial tables, ENUMs, and rolled-back write persistence"
pnpm run db:validate:financial -- --write-smoke

echo "==> Database provisioning complete"
