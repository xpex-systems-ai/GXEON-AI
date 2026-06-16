# GXEON R$100 DB Mirror activation runbook P2

## Safety boundary

The R$100 DB Mirror is manual-first, preview-only persistence for safe operational snapshots. It is not payment settlement and does not call Mercado Pago, Stripe, PayPal, Pix providers, checkout, invoice, webhook, wallet, email, WhatsApp, Telegram or SMS APIs. `providerVerifiedRevenueBrl` must remain `0`, and `realRevenueClaimedAutomatically` must remain `false`.

Never expose `DATABASE_URL`, Pix keys, payment links, phone, email, WhatsApp, tokens, API keys, credentials, private notes or raw notes in frontend payloads or persisted mirror snapshots.

## Schema activation

The mirror requires these PostgreSQL tables in the backend database:

- `r100_state_snapshots`: stores `SAFE_REDACTED` snapshots with `snapshot_id`, `snapshot_mode`, `source`, `collection_counts`, `collections`, `metadata`, `safety`, and `created_at`.
- `r100_state_audit_events`: stores harmless probe/audit events with `event_id`, `event_type`, `source`, `payload`, `safety`, and `created_at`.

Preferred activation path:

```bash
pnpm --filter @workspace/db run push
```

Deterministic SQL fallback:

```bash
psql "$DATABASE_URL" -f lib/db/drizzle/0001_r100_state_mirror.sql
```

The readiness endpoint checks both tables and required columns without writing rows.

## Safe activation flow

1. Verify `DATABASE_URL` exists in the backend environment only.
2. Keep `GXEON_R100_DB_MIRROR_ENABLED` unset or `false` while schema readiness is not green.
3. Run the schema activation command above.
4. Call `GET /api/r100-db/readiness` and confirm `schemaReady=true`, `snapshotsTableReady=true`, and `auditEventsTableReady=true`.
5. Set `GXEON_R100_DB_MIRROR_ENABLED=true` in backend only.
6. Redeploy the API server.
7. Run the guarded probe with `CREATE_SAFE_R100_DB_MIRROR_PROBE`.
8. Export the guarded safe redacted snapshot with `EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR`.
9. Verify latest snapshot and snapshot count in `/ops/r100-db-mirror`.

## Manual smoke tests

```bash
curl -s http://localhost:3000/api/r100-db/readiness
curl -s http://localhost:3000/api/r100-db/activation-plan
curl -s -X POST http://localhost:3000/api/r100-db/probe -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/r100-db/export-safe-snapshot -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://localhost:3000/api/r100-db/probe -H 'Content-Type: application/json' -d '{"action":"CREATE_SAFE_R100_DB_MIRROR_PROBE"}'
curl -s -X POST http://localhost:3000/api/r100-db/export-safe-snapshot -H 'Content-Type: application/json' -d '{"action":"EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR"}'
curl -s http://localhost:3000/api/r100-db/latest-snapshot
```

Expected safe responses:

- Before schema exists, readiness returns `schemaReady=false` and does not write.
- Activation plan returns checklist, rollback and `nextManualAction` with manual-first safety.
- Probe without confirmation returns `CREATE_SAFE_R100_DB_MIRROR_PROBE_CONFIRMATION_REQUIRED`.
- Snapshot without confirmation returns `EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR_CONFIRMATION_REQUIRED`.
- Confirmed probe writes only when `databaseConfigured=true`, `schemaReady=true`, and `mirrorEnabled=true`.
- Confirmed snapshot export writes only when `safeToWrite=true` and stores `SAFE_REDACTED` collections.
- Latest snapshot returns an empty safe state when no snapshot exists or a redacted snapshot when rows exist.

## Rollback

1. Set `GXEON_R100_DB_MIRROR_ENABLED=false` or remove it from the backend environment.
2. Redeploy the API server.
3. Confirm `GET /api/r100-db/readiness` returns `safeToWrite=false`.
4. Do not delete tables unless a manual migration rollback is explicitly required.
5. Keep frontend safe fallback behavior intact.
