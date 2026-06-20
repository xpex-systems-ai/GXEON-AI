# Audit OS Bootstrap Error Visibility Report

## Change

When Audit OS write readiness fails because schema validation fails, bootstrap now includes sanitized diagnostics in the blocked response.

## Public diagnostic codes

Possible codes are:

- `AUDIT_TABLES_MISSING`
- `DATABASE_CONNECTION_FAILED`
- `PUBLIC_SCHEMA_NOT_VISIBLE`
- `AUDIT_SCHEMA_NOT_READY`

## Safety

The bootstrap endpoint remains token-protected. The no-write behavior is preserved: schema readiness is checked before any insert, and failure returns `BLOCKED` without creating assets, cases, notes, fake clients, payment records, or connector writes.
