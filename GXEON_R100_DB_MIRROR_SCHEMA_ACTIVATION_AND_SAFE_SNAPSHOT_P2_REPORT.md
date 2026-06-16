# GXEON R$100 DB Mirror schema activation and safe snapshot P2 report

## Implementation summary

- Added deterministic DB mirror migration SQL for `r100_state_snapshots` and `r100_state_audit_events`.
- Hardened readiness to validate required table columns before `schemaReady=true`.
- Kept writes guarded by explicit confirmation and by `databaseConfigured && schemaReady && mirrorEnabled`.
- Preserved recursive redaction for manual payment link, Pix key label, email, phone, WhatsApp, private notes, notes, token, API key, secret, credential, database URL fields and `DATABASE_URL`.
- Improved the operator console with an explicit missing-step message and disabled write buttons until `safeToWrite=true`.
- Updated the runbook with activation, smoke tests and rollback.

## Schema/migration explanation

Use the existing Drizzle/PostgreSQL package. The schema definitions already exist in `lib/db/src/schema/r100OperationalState.ts`; the activation gap was the deterministic migration artifact. Apply it with either `pnpm --filter @workspace/db run push` or `psql "$DATABASE_URL" -f lib/db/drizzle/0001_r100_state_mirror.sql`.

## Safety confirmation

This mission did not add payment provider calls, checkout, invoices, webhook capture, autonomous jobs, scraping, external contact, frontend secrets or payment links. The DB mirror remains manual-first, preview-only and not payment settlement. `providerVerifiedRevenueBrl` remains `0`, and `realRevenueClaimedAutomatically` remains `false`.

## Manual smoke tests to run after deploy

```bash
curl -s http://localhost:3000/api/r100-db/readiness
curl -s http://localhost:3000/api/r100-db/activation-plan
curl -s -X POST http://localhost:3000/api/r100-db/probe -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/r100-db/export-safe-snapshot -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/r100-db/probe -H 'Content-Type: application/json' -d '{"action":"CREATE_SAFE_R100_DB_MIRROR_PROBE"}'
curl -s -X POST http://localhost:3000/api/r100-db/export-safe-snapshot -H 'Content-Type: application/json' -d '{"action":"EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR"}'
curl -s http://localhost:3000/api/r100-db/latest-snapshot
```

## Known limitations

Runtime smoke tests require a deployed/local API server and a configured backend database. The automated test script is unavailable unless the workspace adds an `@workspace/api-server` `test` script.

## Next recommended step

After DB Mirror is green, run the guarded probe, export one safe redacted snapshot, verify `snapshotCount >= 1`, then consider read-only operational reporting from the mirror without making it a payment-settlement source.
