# Audit OS Schema Diagnostics Endpoint Report

## Endpoint

Added `GET /api/v1/audit/schema-diagnostics` via the existing v1 audit router.

## Behavior

- Calls `getAuditSchemaDiagnostics()`.
- Performs no writes.
- Requires no token because the payload is deliberately sanitized.
- Returns HTTP 200 when `DATABASE_URL` is configured and HTTP 503 when it is not configured.
- Does not call external services.

## Operator use

The operator should verify `foundTables` includes `audit_assets`, `audit_cases`, and `audit_operator_notes` before retrying protected bootstrap.
