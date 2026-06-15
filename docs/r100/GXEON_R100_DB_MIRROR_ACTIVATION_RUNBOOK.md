# R$100 DB Mirror Activation Runbook

1. Verify `DATABASE_URL` exists in the backend environment only.
2. Run DB migration/push if `GET /api/r100-db/readiness` reports `schemaReady=false`.
3. Confirm `r100_state_snapshots` and `r100_state_audit_events` are ready.
4. Set `GXEON_R100_DB_MIRROR_ENABLED=true` only after readiness passes.
5. Redeploy the API server.
6. Run the safe probe with `CREATE_SAFE_R100_DB_MIRROR_PROBE`.
7. Export the safe redacted snapshot with `EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR`.
8. Verify latest snapshot and snapshot count in `/ops/r100-db-mirror`.

## Rollback
Set `GXEON_R100_DB_MIRROR_ENABLED=false` or remove the flag, redeploy the API server, and confirm `safeToWrite=false`.

## Non-payment guarantee
The mirror is for safe persistence verification only. It is not a fiscal receipt, checkout, invoice, payment capture, provider settlement or revenue claim. `providerVerifiedRevenueBrl` remains `0`.
