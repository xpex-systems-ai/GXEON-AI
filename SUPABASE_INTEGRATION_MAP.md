# SUPABASE_INTEGRATION_MAP.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive integration verdict

**Status:** YELLOW — Supabase integration points are visible and mostly fail-soft, but schema and RLS are not fully aligned with the application.

## 2. Modules that depend on Supabase/Postgres

| Module | Dependency type | Required env | Current behavior |
|---|---|---|---|
| `server/runtime/supabaseRuntime.cjs` | Supabase readiness/status. | Supabase URL/key aliases. | Does not connect; reports/masks env readiness. |
| `scripts/supabase_env_check.cjs` | Local readiness report. | Supabase env aliases. | Writes `artifacts/supabase-runtime-report.json`; exits non-zero if missing. |
| `scripts/production_activation_check.cjs` | Production Supabase/Auth/Realtime/Storage/DB validation. | Supabase envs + `DATABASE_URL`. | Designed for activation gate; should not be run against real services in Mission 04. |
| `lib/db` | Drizzle PostgreSQL schema/client. | `DATABASE_URL`. | Throws if `DATABASE_URL` missing when imported. |
| `server/runtime/financialDb.cjs` | Runtime PostgreSQL persistence. | `DATABASE_URL`. | Uses `pg` pool; configured only if env exists. |
| `server/runtime/paymentRuntime.cjs` | Payment runtime storage selection. | `DATABASE_URL`. | Uses PostgreSQL when configured; otherwise local read-only fallback. |
| Web dashboard pages | Direct Supabase table reads and one `api_keys` update. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. | Warn/fail if env missing; unsafe until RLS exists. |
| Web dashboard topbar | Supabase table read + `postgres_changes`. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. | Subscribes to missing `transactions` table. |
| Mobile dashboard | Direct Supabase table reads. | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. | Client is `null` unless envs exist. |
| `supabase/` | CLI/project metadata. | Supabase CLI secrets out-of-band. | Contains non-secret project ref and enabled services. |

## 3. Environment variable map

| Variable | Classification | Consumers | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Server secret-store config, URL not secret. | Runtime status, production activation, backend aliases. | Project URL is non-secret; still manage through env for deployment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret. | Server/activation only. | Never expose to Vite/Expo. |
| `SUPABASE_ANON_KEY` | Public-ish anon key. | Backend alias, clients indirectly. | Safe only with RLS. |
| `SUPABASE_PUBLISHABLE_KEY` | Public-ish alias. | Backend alias. | Optional anon/publishable alternative. |
| `VITE_SUPABASE_URL` | Public web env. | Web dashboard. | URL only. |
| `VITE_SUPABASE_ANON_KEY` | Public web env. | Web dashboard. | Safe only with RLS. |
| `EXPO_PUBLIC_SUPABASE_URL` | Public mobile env. | Mobile app. | URL only. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public mobile env. | Mobile app. | Safe only with RLS. |
| `DATABASE_URL` | Secret. | Drizzle/server financial runtime. | Supabase Postgres URL must include real password only in secret store. |

## 4. Planned/observed Supabase calls

| Caller | Operation | Table/channel | Readiness |
|---|---|---|---|
| Dashboard page | `select`, count, filters. | `global_transactions`, `actors`, `api_keys`. | Partial: only `global_transactions` exists. |
| Transactions page | `select` with optional status filter. | `global_transactions`. | Table exists; RLS missing. |
| Health pages | head count. | `global_transactions`. | Table exists; RLS missing. |
| Commissions pages | `select`. | `actor_wallets`. | Table exists; RLS missing. |
| Revenue pages | `select`. | `revenue_events`. | Table missing. |
| Dataset pages | `select`. | `marketplace_datasets`, `dataset_purchases`. | Tables missing. |
| API keys pages | `select`, `update status`. | `api_keys`. | Table missing; direct update should move behind API or strict RLS. |
| Topbar | `select` and `postgres_changes`. | `transactions`. | Table missing/name mismatch. |
| Mobile Supabase helper | `createClient`. | N/A. | Correctly returns `null` if envs absent. |
| API server runtime endpoint | `GET /v1/runtime/supabase`. | N/A. | Does not connect; safe readiness report. |

## 5. Complete flow map

```text
Operator/browser/mobile
  -> public Supabase client (URL + anon key)
  -> direct reads from safe RLS-protected tables/views
  -> no direct privileged financial writes

Operator/browser/mobile
  -> GXEON API server
  -> financial/governance auth middleware for privileged routes
  -> runtime modules
  -> PostgreSQL/Supabase Postgres via DATABASE_URL when configured

Runtime events
  -> local persistence/events JSONL
  -> GXEON WebSocket gateway
  -> dashboard/operator realtime stream

Future safe Supabase Realtime
  -> only selected RLS-protected tables/views
  -> no raw ledger/webhook exposure
```

## 6. Integration blockers

1. Missing schema for `actors`, `api_keys`, `revenue_events`, `marketplace_datasets`, `dataset_purchases`, and `transactions`/compatibility view.
2. No RLS migration/policy set.
3. No Supabase login/session implementation.
4. No storage bucket/policy implementation.
5. Direct client update to `api_keys` must be moved behind API server or constrained by strong RLS/audit.
6. `DATABASE_URL`/Supabase env values are intentionally absent locally; this is correct for Mission 04.

## 7. Integration readiness score

**Integration score:** 62 / 100

- +15 env alias/readiness runtime exists
- +15 PostgreSQL financial runtime path exists
- +10 web/mobile clients are visible and mostly fail-soft
- +10 production activation script has Supabase validation sections
- +7 project metadata is versioned without secrets
- +5 local realtime gateway keeps runtime independent from Supabase
- -20 schema mismatch with clients
- -15 no RLS/auth session bridge
- -5 storage integration not implemented

**Decision:** YELLOW — integration map is clear, but production connection should wait for corrections.
