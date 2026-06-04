# SUPABASE REAL ACTIVATION REPORT — SUPABASE_REAL_ACTIVATION

- **Generated at:** 2026-06-04T12:21:40.532Z
- **Mission:** `SUPABASE_REAL_ACTIVATION`
- **Final status:** FAILED
- **Health status:** OFFLINE / DEGRADED
- **Supabase project ref:** zphpeynirstwzrzgvbct
- **Operational score:** 0

## Credential and environment validation

- DATABASE_URL configured: true
- DATABASE_URL masked: postgresql://***:***@db.zphpeynirstwzrzgvbct.supabase.co:5432/postgres
- DIRECT_URL configured: true
- DIRECT_URL masked: postgresql://***:***@db.zphpeynirstwzrzgvbct.supabase.co:5432/postgres
- SUPABASE_URL configured: true
- SUPABASE_ANON_KEY configured: true
- SUPABASE_SERVICE_ROLE_KEY configured: true
- SUPABASE_SERVICE_ROLE_KEY role decoded from JWT payload: `service_role`.
- DATABASE_URL was normalized to a PostgreSQL connection string before validation because the user supplied value included an extra `postgresql:` prefix.
- DIRECT_URL was normalized to the same PostgreSQL connection string with the supplied password value and no placeholder marker in the persisted report.

## Activation execution results

- Database connection: FAIL
- Direct database connection: FAIL
- Supabase project detection: PASS
- Drizzle push: FAILED (exit code 1)
- Pending migrations: BLOCKED because the database connection failed before schema synchronization could complete.
- Schema validation: FAIL
- CRUD validation: FAIL
- Rollback validation: FAIL
- Latency benchmark: n/a ms
- Failure reason: getaddrinfo EAI_AGAIN db.zphpeynirstwzrzgvbct.supabase.co

## Financial table validation

- `actor_wallets`: not validated; database connection failed before schema introspection.
- `global_transactions`: not validated; database connection failed before schema introspection.
- `payment_attempts`: not validated; database connection failed before schema introspection.
- `financial_ledger`: not validated; database connection failed before schema introspection.
- `payment_webhook_events`: not validated; database connection failed before schema introspection.

## API endpoint validation

- Base URL: http://127.0.0.1:3010/api
- Endpoint status: FAILED
- /v1/runtime/database: HTTP 503; healthy=false; databaseReachable=false; latencyMs=5152.76
- /v1/financial/health: HTTP 503; healthy=false; databaseReachable=false; latencyMs=5261.58
- /v1/financial/wallets: HTTP 503; healthy=false; databaseReachable=false; latencyMs=5005.46
- /v1/financial/transactions: HTTP 503; healthy=false; databaseReachable=false; latencyMs=5010.63

## Deliverables produced

- `SUPABASE_REAL_ACTIVATION_REPORT.md`
- `DATABASE_HEALTH_REPORT.json`
- `DATABASE_SMOKE_RESULT.json`
- `FINANCIAL_RUNTIME_REPORT.json`
- Existing artifact copies were also updated under `artifacts/` by the repository activation scripts.

## Success criteria

- database_connection: FAIL
- schema_validation: FAIL
- crud_validation: FAIL
- rollback_validation: FAIL
- api_validation: FAIL
- health_status: DEGRADED

## Conclusion

Activation was re-run with the corrected service-role JWT and normalized PostgreSQL connection strings using only existing infrastructure. The activation still did not pass in this execution environment because DNS resolution for `db.zphpeynirstwzrzgvbct.supabase.co` failed (`getaddrinfo EAI_AGAIN`), so Drizzle push, schema validation, CRUD persistence, rollback validation, and the database-backed API checks could not complete. No mock data, fake success, simulated database, new services, or new endpoints were created.
