# AUDIT_OS_FINAL_POST_BOOTSTRAP_SAFETY

## Current recommendation

Because bootstrap was not confirmed, keep write access closed until schema diagnostics passes and the first case is safely created or confirmed.

## After first case is confirmed

1. Set `GXEON_AUDIT_WRITE_MODE=preview_only`.
2. Set `GXEON_AUDIT_ALLOW_DB_WRITES=false`.
3. Rotate or remove `GXEON_AUDIT_BOOTSTRAP_TOKEN`.
4. Re-run read-only checks:
   - `GET /api/v1/audit/schema-diagnostics`
   - `GET /api/v1/audit/cases`
   - `GET /api/v1/audit/mission-control`

## Safety boundary

This execution did not change Railway variables automatically and did not print secret values.
