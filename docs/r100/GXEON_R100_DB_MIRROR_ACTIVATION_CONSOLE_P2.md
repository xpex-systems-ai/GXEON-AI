# GXEON R$100 DB Mirror Activation Console P2

## Current state
- The R$100 DB mirror schema and backend routes exist.
- The production expectation is manual-first and preview-only.
- `DATABASE_URL` must exist only in the backend/server environment.
- `GXEON_R100_DB_MIRROR_ENABLED` remains disabled by default until the operator confirms schema readiness.
- `providerVerifiedRevenueBrl` remains `0` and `realRevenueClaimedAutomatically` remains `false`.

## Console
Route: `/ops/r100-db-mirror`.

The console shows database configured status, schema readiness, mirror enabled state, safe-to-write state, latest snapshot metadata and snapshot count. It never asks for or displays `DATABASE_URL`, payment links, Pix keys, phone, email, WhatsApp, tokens or secrets.

## API endpoints
- `GET /api/r100-db/readiness` checks whether `r100_state_snapshots` and `r100_state_audit_events` exist without writing rows.
- `GET /api/r100-db/activation-plan` returns the manual activation checklist and rollback steps.
- `POST /api/r100-db/probe` requires `CREATE_SAFE_R100_DB_MIRROR_PROBE`.
- `POST /api/r100-db/export-safe-snapshot` requires `EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR`.

## Safety boundary
This is not payment settlement. It does not integrate Mercado Pago, Stripe, Pix provider APIs, checkout, invoice or payment webhooks. It does not create real payment records or provider-verified revenue.
