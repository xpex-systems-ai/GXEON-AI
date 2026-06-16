# GXEON R$100 DB Mirror Guided Activation P2.1

Manual-first, preview-only activation guide for the R$100 DB Mirror. This is operational memory only: not payment settlement, not invoice issuance, not checkout, and not provider-verified revenue.

## Activation sequence

1. Confirm `DATABASE_URL` exists only in the backend Railway/API environment. Never paste or display its value in the dashboard.
2. Run readiness: `GET /api/r100-db/readiness`.
3. Run schema diagnostics: `GET /api/r100-db/schema-diagnostics`.
4. Run dry-run: `POST /api/r100-db/schema-dry-run` with `{}`.
5. Temporarily set `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true` only if schema is missing and the operator approves the dry-run.
6. Apply schema with `POST /api/r100-db/apply-schema` and body `{ "action": "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED" }`.
7. Turn `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=false` again.
8. Set `GXEON_R100_DB_MIRROR_ENABLED=true`.
9. Redeploy the API server.
10. Run smoke test with `{ "action": "RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST" }`.
11. Run probe with `{ "action": "CREATE_SAFE_R100_DB_MIRROR_PROBE" }`.
12. Export SAFE_REDACTED snapshot with `{ "action": "EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR" }`.
13. Verify `snapshotCount >= 1` through `GET /api/r100-db/operator-summary` or status/readiness views.
14. Keep `providerVerifiedRevenueBrl=0` unless a future verified provider integration exists.

## Rollback

Disable `GXEON_R100_DB_MIRROR_ENABLED`, disable `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED`, redeploy the API server, and keep tables in place while stopping mirror writes. Do not delete operational tables as part of routine rollback unless a separate database maintenance plan is approved.

## What this is not

This is not payment settlement, not invoice generation, not provider verified revenue, not checkout, not webhook capture, not auto-send, not scraping, and not external contact automation.
