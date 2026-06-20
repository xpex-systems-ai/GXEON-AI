# Audit OS Schema Visibility Baseline

Mission: `MISSION_004_10_AUDIT_OS_SCHEMA_VISIBILITY_FIX`

## Findings

- `artifacts/api-server/src/services/auditCaseService.ts` contained `validateAuditSchemaReadiness()` as a read-only readiness gate before Audit OS writes.
- Baseline readiness queries used unqualified table names:
  - `select 1 from audit_assets limit 1`
  - `select 1 from audit_cases limit 1`
  - `select 1 from audit_operator_notes limit 1`
- The bootstrap endpoint `POST /api/v1/audit/bootstrap/first-case` remained protected by `GXEON_AUDIT_BOOTSTRAP_TOKEN` before calling `bootstrapFirstInternalAuditCase()`.
- DB helpers are exported from `lib/db/src/index.ts`; `isDatabaseConfigured()` only checks that `DATABASE_URL` exists, while `getDb()`/`getPool()` initialize the Postgres connection lazily.

## Root-cause hypothesis

Railway had `DATABASE_URL` and write flags configured, but the runtime connection could not resolve Audit OS tables through the current search path. Explicit `public.audit_*` qualification is safer because the operator confirmed the tables exist in Supabase under the public schema.

## Safety

No migration, schema push, DDL, production bootstrap call, payment call, webhook, or external write was executed by Codex.
