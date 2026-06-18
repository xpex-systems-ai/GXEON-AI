# Audit OS Schema Deployment Plan

Status: BLOCKED_PENDING_OPERATOR_STOP_GATE
Branch: feature/audit-os-schema-apply-first-case
Date: 2026-06-18

## Stop gates
1. Confirm `supabase/config.toml` project id equals `zphpeynirstwzrzgvbct`.
2. Confirm `DATABASE_URL` exists without printing it.
3. Confirm Audit OS migration SQL exists.
4. Apply schema only when `GXEON_ALLOW_SCHEMA_APPLY=true` is explicitly present.

## Approved migration artifact
- `lib/db/drizzle/0002_audit_os_schema.sql`

## Preferred apply workflow after stop gates pass
```bash
GXEON_ALLOW_SCHEMA_APPLY=true pnpm --filter @workspace/db run push
```

## Manual fallback
If direct database connection is unavailable, open the official Supabase SQL Editor for project `zphpeynirstwzrzgvbct`, review `lib/db/drizzle/0002_audit_os_schema.sql`, and apply only that Audit OS schema SQL.

## Post-apply validation
- Verify all expected Audit OS tables exist.
- Verify all expected Audit OS enums exist.
- Confirm `audit_revenue_events` has no fake revenue rows.
- Confirm payment/financial tables were not modified by this mission.
