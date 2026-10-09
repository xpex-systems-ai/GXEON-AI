# RUNTIME ESCAPE REPORT — RUNTIME_ESCAPE_VALIDATION

- **Generated at:** 2026-06-04T12:59:24.593Z
- **Priority:** CRITICAL
- **Mode:** DIAGNOSTIC_ONLY
- **Target host:** `db.zphpeynirstwzrzgvbct.supabase.co`
- **Supabase URL:** `https://zphpeynirstwzrzgvbct.supabase.co`
- **Final status:** BLOCKED
- **No false positive:** no success was simulated or inferred.
- **Mutation policy:** no application code, schema, migrations, mocks, or database rows were created or changed.

## Runtime escape result

A true validation outside the current execution sandbox could not be performed from this container because no external runtime escape facility is available. All commands below were executed as real diagnostics in the current runtime, and the reports preserve the exact failure point.

## Environment checks

- `DATABASE_URL`: **missing**
- `DIRECT_URL`: **missing**
- `SUPABASE_URL`: **missing**
- `SUPABASE_ANON_KEY`: **missing**
- `SUPABASE_SERVICE_ROLE_KEY`: **missing**
- Secret handling: all report fields are masked or record presence only; no raw secrets are persisted.

## Network tests

- `nslookup db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — resolver `172.30.5.163` refused DNS queries; no servers could be reached.
- `dig db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — no DNS servers could be reached.
- `host db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — resolver timed out/refused; no servers could be reached.
- `ping -c 4 db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — temporary failure in name resolution.
- `nc -vz db.zphpeynirstwzrzgvbct.supabase.co 5432`: **FAILED** — getaddrinfo temporary failure in name resolution.
- `nc -vz db.zphpeynirstwzrzgvbct.supabase.co 6543`: **FAILED** — getaddrinfo temporary failure in name resolution.
- `openssl s_client -connect db.zphpeynirstwzrzgvbct.supabase.co:5432`: **FAILED** — DNS lookup failed before handshake.
- `openssl s_client -connect db.zphpeynirstwzrzgvbct.supabase.co:6543`: **FAILED** — DNS lookup failed before handshake.
- `curl -I $SUPABASE_URL`: **FAILED** — `SUPABASE_URL` is missing, so curl rejected the empty URL.
- `curl -I https://zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — configured proxy returned HTTP 403 on CONNECT.

## Supabase REST tests

- REST with `SUPABASE_ANON_KEY`: **SKIPPED** — missing `SUPABASE_URL` or anon key in runtime environment.
- REST with `SUPABASE_SERVICE_ROLE_KEY`: **SKIPPED** — missing `SUPABASE_URL` or service-role key in runtime environment.
- Project ID detection: **PASS** — `zphpeynirstwzrzgvbct` extracted from the known Supabase host/project URL.
- API response verification: **FAILED** — explicit Supabase URL HEAD request failed through proxy with HTTP 403.
- Key authentication validation: **BLOCKED** — keys are not present in this runtime environment.

## PostgreSQL tests

- `psql $DATABASE_URL -c 'SELECT NOW();'`: **NOT RUN** — `psql` is not installed and `DATABASE_URL` is missing.
- `psql $DIRECT_URL -c 'SELECT NOW();'`: **NOT RUN** — `psql` is not installed and `DIRECT_URL` is missing.
- PostgreSQL handshake: **FAILED** — DNS lookup failed before TLS/PostgreSQL handshake on ports `5432` and `6543`.
- Latency: **NOT MEASURED** — no socket connection could be opened.
- IPv4 resolution: **FAILED** — `dig A` could not reach DNS server.
- IPv6 resolution: **FAILED** — `dig AAAA` could not reach DNS server.

## Drizzle and schema tests

- `pnpm --filter @workspace/db run push`: **FAILED** before DB mutation because `DATABASE_URL` is not configured.
- Financial schema validation: **FAILED/BLOCKED** because `DATABASE_URL` is not configured.
- Tables/enums/foreign keys: **BLOCKED** — database connection unavailable.

## CRUD and persistence tests

- Inserts/selects/updates for `actor_wallets`, `global_transactions`, `payment_attempts`, and `financial_ledger`: **BLOCKED**.
- Rollback transaction: **BLOCKED**.
- Real persistence validation: **false**.
- Reason: diagnostic-only rules prohibit database mutation, and no database connection is available.

## API tests

- `GET /v1/runtime/database`: **FAILED** — HTTP 503; databaseConfigured=false; databaseReachable=false.
- `GET /v1/financial/health`: **FAILED** — HTTP 503; databaseConfigured=false; databaseReachable=false.
- `GET /v1/financial/wallets`: **FAILED** — HTTP 503; databaseConfigured=false; databaseReachable=false.
- `GET /v1/financial/transactions`: **FAILED** — HTTP 503; databaseConfigured=false; databaseReachable=false.

## Root cause analysis

1. **Primary failure point:** DNS resolver `172.30.5.163` inside the current execution environment refuses/times out DNS queries.
2. **Secondary failure point:** outbound HTTPS via configured proxy returns CONNECT HTTP 403 for the Supabase project URL.
3. **Runtime configuration failure:** required Supabase/PostgreSQL environment variables are absent from the shell runtime.
4. **PostgreSQL client failure:** `psql` is not installed, so CLI PostgreSQL validation cannot run.

## Expected final status evaluation

- `ONLINE`: false
- `DEGRADED`: true for local API runtime only
- `BLOCKED`: true for Supabase/PostgreSQL connectivity and persistence validation

## Deliverables

- `RUNTIME_ESCAPE_REPORT.md`
- `SUPABASE_CONNECTIVITY_REPORT.json`
- `POSTGRES_CONNECTIVITY_REPORT.json`
- `DRIZZLE_VALIDATION_REPORT.json`
- `FINANCIAL_RUNTIME_REPORT.json`
