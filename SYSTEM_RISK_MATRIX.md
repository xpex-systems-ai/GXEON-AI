# SYSTEM RISK MATRIX — GXEON RAILWAY BACKEND

## Critical risks

| ID | Risk | Affected area | Impact | Recommended fix |
| --- | --- | --- | --- | --- |
| CRIT-001 | Financial read endpoints are unauthenticated | `/api/v1/financial/wallets`, `/api/v1/financial/transactions` | Public exposure of wallet, transaction and ledger data | Add read auth middleware or restrict to internal network/admin token |
| CRIT-002 | Webhook idempotency is non-durable without `DATABASE_URL` | Mercado Pago webhook | Duplicate/lost payment processing after restart | Block production payment mode unless DB health is healthy |
| CRIT-003 | Worker jobs have no always-on supervisor | task queue, PIX followups, x-radar cycles | Paid work can silently stop | Add Railway worker/cron and alerts |
| CRIT-004 | Required secrets cannot be confirmed in static scan | Railway production | Runtime may deploy but fail monetization path | Run env validation in Railway with live secrets |

## High risks

| ID | Risk | Affected area | Impact | Recommended fix |
| --- | --- | --- | --- | --- |
| HIGH-001 | Duplicate route definitions | `/api/v1/runtime/production`, `/api/v1/runtime/alerts` | Shadowed handlers and confusing API contracts | Consolidate into one route owner |
| HIGH-002 | Dynamic CJS runtime loading outside API artifact | `server/runtime/*.cjs` | Railway build may miss runtime files if context/watch excludes them | Include `server/runtime/**` in Railway watch/build contract |
| HIGH-003 | Open runtime/business intelligence endpoints | many `/runtime`, `/conversion`, `/revenue` GET endpoints | Competitive/business data exposure | Classify public vs internal and add auth to internal routes |
| HIGH-004 | No durable retry/backoff observed for paid jobs | schedulers/followups | SLA failure for paid tasks | Persist job attempts and retry schedule in Postgres |

## Medium risks

| ID | Risk | Affected area | Impact | Recommended fix |
| --- | --- | --- | --- | --- |
| MED-001 | Local filesystem/memory fallback | runtime memory/snapshots | State loss on Railway restarts | Make Postgres/Supabase mandatory in production |
| MED-002 | Static demo data mixed with production API namespace | conversion/phase8 routes | Misleading production metrics | Label demo routes or move behind demo namespace |
| MED-003 | Observability envs are optional | Sentry/OTEL/alerts | Lower incident visibility | Require at least one alert sink for production |
| MED-004 | Checkout status endpoint is open | `/revenue-engine/checkout/:id/status` | Potential metadata leakage | Use opaque IDs and limit returned fields |

## Low risks

| ID | Risk | Affected area | Impact | Recommended fix |
| --- | --- | --- | --- | --- |
| LOW-001 | Many reports in repo root | documentation | Discoverability overhead | Move generated audits into `docs/audits/` over time |
| LOW-002 | Runtime modules are CJS while API is ESM TypeScript | backend architecture | Mixed module ergonomics | Gradually migrate or document boundary |
| LOW-003 | Broad default financial scope for valid token | financial auth | Operational blast radius if token leaks | Set narrow `FINANCIAL_AUTH_SCOPES` in Railway |
