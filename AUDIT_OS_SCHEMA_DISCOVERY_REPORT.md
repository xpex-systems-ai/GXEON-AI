# Audit OS Schema Discovery Report

Status: SQL_GENERATED_MANUAL_REQUIRED
Branch: feature/audit-os-schema-apply-first-case
Date: 2026-06-18

## Files inspected
- `lib/db/src/schema/audit.ts` defines the Audit OS domain tables, enums, foreign keys, indexes, insert schemas, and select schemas.
- `lib/db/src/schema/index.ts` exports the financial, R100 state mirror, and Audit OS schemas.
- `lib/db/drizzle.config.ts` points Drizzle to `lib/db/src/schema/index.ts` and requires `DATABASE_URL`.
- `lib/db/package.json` exposes `push` and `push-force`; it does not expose a dedicated `generate` script.
- `lib/db/drizzle/` previously contained `0000_financial_foundation.sql` and `0001_r100_state_mirror.sql`.

## Expected Audit OS tables
- audit_clients
- audit_assets
- audit_cases
- audit_modules
- audit_checklists
- audit_findings
- audit_evidences
- audit_scores
- audit_reports
- audit_tasks
- audit_proposals
- audit_revenue_events
- audit_connector_runs
- audit_operator_notes

## Migration discovery result
No existing Audit OS-only migration was found. A reviewed Audit OS-only migration was generated at `lib/db/drizzle/0002_audit_os_schema.sql` without applying it to the database.

## Safety notes
The generated SQL excludes R100 mirror table creation and does not create clients, revenue events, payments, Mercado Pago calls, webhooks, scraping jobs, or connector writes.
