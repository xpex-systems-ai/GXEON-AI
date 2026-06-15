# GXEON R$100 Database State Mirror P2

This module adds an optional database mirror/readiness layer for the R$100 operational state. It does **not** replace the current runtime source of truth (`SAFE_MEMORY_FALLBACK` or `SERVER_LOCAL_JSON`) and it does **not** automate payment, checkout, invoice, webhook, settlement, scraping, browser automation, or external contact.

## Environment variables

- `DATABASE_URL`: required only to connect to the database.
- `GXEON_R100_DB_MIRROR_ENABLED=true`: required before probe or snapshot writes are allowed.
- `GXEON_R100_DB_MIRROR_SNAPSHOT_LIMIT=20`: reserved optional read limit for later operator UI expansion.

The mirror is disabled by default. Missing `DATABASE_URL` must return a safe fallback status instead of crashing.

## Endpoints tested

- `GET /api/r100-db/status`
- `GET /api/r100-db/latest-snapshot`
- `POST /api/r100-db/probe` with `CREATE_SAFE_R100_DB_MIRROR_PROBE`
- `POST /api/r100-db/export-safe-snapshot` with `EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR`

## Rollback

1. Remove the R$100 DB mirror router registration from `artifacts/api-server/src/routes/index.ts`.
2. Remove the mirror service files under `artifacts/api-server/src/durableState/`.
3. Remove dashboard DB mirror cards/buttons.
4. Leave existing R$100 durable state P1 adapters untouched.
