# GXEON R$100 DB Mirror schema activation and safe snapshot P2

## Purpose
Activate a backend-only PostgreSQL DB Mirror for the manual-first R$100 operational state. The mirror stores only SAFE_REDACTED operational metadata, counts, statuses, timestamps, hashes/IDs and safety flags.

## Safety boundaries
- No secret exposure in frontend, API responses, logs, snapshots or docs.
- No payment provider action, checkout, invoice, webhook capture, settlement, scraping, GitHub runtime write or external contact.
- Provider verified revenue remains `0`.
- Operator-confirmed revenue remains manual metadata only.

## Environment flags
- `DATABASE_URL`: backend-only database connection. Never print or paste into the dashboard.
- `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true`: temporary schema-apply guard.
- `GXEON_R100_DB_MIRROR_ENABLED=true`: enables DB mirror probe/snapshot path after schema is ready.
- `GXEON_R100_DB_SAFE_WRITE_ENABLED=true`: global DB mirror write guard.

## Activation sequence
1. `GET /api/r100-db/readiness`.
2. `GET /api/r100-db/schema-diagnostics`.
3. `POST /api/r100-db/schema-dry-run` with `{}`.
4. Temporarily set `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true` in the backend.
5. `POST /api/r100-db/apply-schema` with `{ "action": "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED" }`.
6. Set `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=false` after schema apply.
7. Set `GXEON_R100_DB_MIRROR_ENABLED=true` and `GXEON_R100_DB_SAFE_WRITE_ENABLED=true` only after `schemaReady=true`.
8. Run smoke test, safe probe and SAFE_REDACTED snapshot export.
9. Confirm `snapshotCount > 0` and latest snapshot status in the dashboard.

## Manual validation commands
```bash
curl -sS "$API_BASE/api/r100-db/readiness"
curl -sS "$API_BASE/api/r100-db/schema-diagnostics"
curl -sS -X POST "$API_BASE/api/r100-db/schema-dry-run" -H 'Content-Type: application/json' -d '{}'
curl -sS -X POST "$API_BASE/api/r100-db/apply-schema" -H 'Content-Type: application/json' -d '{"action":"APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED"}'
curl -sS -X POST "$API_BASE/api/r100-db/activation-smoke-test" -H 'Content-Type: application/json' -d '{"action":"RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST"}'
curl -sS -X POST "$API_BASE/api/r100-db/probe" -H 'Content-Type: application/json' -d '{"action":"CREATE_SAFE_R100_DB_MIRROR_PROBE"}'
curl -sS -X POST "$API_BASE/api/r100-db/export-safe-snapshot" -H 'Content-Type: application/json' -d '{"action":"EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR"}'
curl -sS "$API_BASE/api/r100-db/latest-snapshot"
```

## Rollback plan
Set the three GXEON R$100 DB flags to `false`, redeploy the API server and confirm the dashboard returns to safe fallback. Do not drop tables or delete snapshots without a separate approved retention mission.

## What this does not do
It does not create payments, invoices, checkout sessions, payment links, provider settlements, webhook captures, external messages, scraping jobs or provider-verified revenue.
