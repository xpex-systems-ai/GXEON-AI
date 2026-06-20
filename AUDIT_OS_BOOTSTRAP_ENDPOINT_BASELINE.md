# Audit OS Bootstrap Endpoint Baseline

- Existing Audit OS v1 routes live in `artifacts/api-server/src/routes/auditV1.ts` and are mounted under `/api` by the Express app, yielding `/api/v1/audit/*` runtime paths.
- Existing write guard logic lives in `artifacts/api-server/src/services/auditCaseService.ts` through `GXEON_AUDIT_WRITE_MODE`, `GXEON_AUDIT_ALLOW_DB_WRITES`, and `DATABASE_URL` checks.
- Existing first-case payload exists at `artifacts/audit-os-first-case-payload.json` and contains no client, revenue, payment, or secret data.
- Existing auth/token route pattern is simple header validation in route handlers; the new bootstrap route uses `Authorization: Bearer <GXEON_AUDIT_BOOTSTRAP_TOKEN>` and never logs or returns the token.
- Database schema source is `lib/db/src/schema/audit.ts`; this mission does not add migrations or run schema push commands.
