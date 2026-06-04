# RAILWAY SYSTEM MAP — GXEON SYSTEM SCANNER

- **Scan date:** 2026-06-04
- **Mode:** static repository scan with Railway configuration audit. No Railway API credentials or live deployment logs were present in the execution environment, so runtime crash/restart/log findings are marked as `not_observed_static_only`.
- **Primary backend:** `@workspace/api-server` in `artifacts/api-server`.
- **HTTP mount:** Express mounts all backend routes under `/api`.

## Railway services discovered

| Service | Railway config | Build command | Start command | Healthcheck | Status from static scan |
| --- | --- | --- | --- | --- | --- |
| API server | `artifacts/api-server/railway.json`, `.railway/api-server/railway.json` | `pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build` | `pnpm --filter @workspace/api-server run start` | `/api/healthz` | production-capable if `PORT`, `DATABASE_URL`, auth and Mercado Pago secrets are provisioned |
| Dashboard web | `artifacts/gxeon-dashboard/railway.json`, `.railway/gxeon-dashboard/railway.json` | builds API client and dashboard | `pnpm --filter @workspace/gxeon-dashboard run serve` | `/` | static/service UI candidate |
| Dashboard mobile web build | `artifacts/gxeon-dashboard-mobile/railway.json`, `.railway/gxeon-dashboard-mobile/railway.json` | Expo/mobile web build | `pnpm --filter @workspace/gxeon-dashboard-mobile run serve` | `/` | public UI candidate |
| Mockup sandbox | `artifacts/mockup-sandbox/railway.json`, `.railway/mockup-sandbox/railway.json` | Vite/mockup build | preview server | `/` | demo/sandbox candidate |

## Backend execution chain

1. `src/index.ts` requires `process.env.PORT`, validates that it is numeric and positive, and starts Express.
2. `src/app.ts` installs Pino HTTP logging, CORS, JSON/raw body capture, URL encoding, then mounts `src/routes/index.ts` at `/api`.
3. `src/routes/index.ts` composes health, governance, conversion, phase8, runtime and financial routers.
4. `src/routes/runtime.ts` loads CommonJS runtime modules from `server/runtime` using `createRequire`, so the deployed working directory must include `server/runtime` and build/watch paths must keep it available.

## Internal module dependency map

| Layer | Files | Responsibility |
| --- | --- | --- |
| Express bootstrap | `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/index.ts` | HTTP server, middleware, route mount and Railway `PORT` contract |
| Route layer | `artifacts/api-server/src/routes/*.ts` | public API, financial mutations, Mercado Pago webhook, governance views, observability views |
| Auth/security middleware | `artifacts/api-server/src/middlewares/financialAuth.ts`, `governanceAuth.ts` | token auth, scope checks, rate limits, idempotency, governance protection |
| Financial services | `artifacts/api-server/src/services/financial/*.ts` | database-backed wallet, transaction, ledger, metrics and DB health APIs |
| Runtime CJS modules | `server/runtime/*.cjs` | monetization, PIX, webhook processing, subscriptions, x-radar, scheduler-style manual jobs, local memory fallback |
| Database library | `lib/db/src/**`, `lib/db/drizzle/**` | Drizzle schema, Postgres pool and migration SQL |
| Validation scripts | `scripts/*.cjs` | environment, Railway platform, Supabase/Postgres and production readiness checks |

## Operational readiness summary

| Dimension | Score | Notes |
| --- | ---: | --- |
| Backend health | 82/100 | Strong route coverage and Railway healthcheck. External runtime modules are loaded dynamically and should be included in Railway watch/build context. |
| Runtime stability | 69/100 | `PORT` is enforced; live logs/restarts were not observable; scheduler jobs are manual endpoint-triggered rather than supervised workers. |
| Security posture | 71/100 | Financial mutations have bearer/token, scopes, rate limit and idempotency. Several read endpoints expose business/financial metadata without auth. |
| Monetization readiness | 86/100 | PIX checkout, subscriptions, credit packs, radar checkout and entitlement activation are mapped. Live secrets/payment validation remain gating items. |
| Architecture cohesion | 76/100 | Clear monorepo layers, but many runtime modules share mutable local memory fallback and static demo endpoints duplicate runtime concepts. |

## Immediate Railway actions

1. Provision required secrets listed in `ENVIRONMENT_VARIABLE_AUDIT.md`.
2. Verify `server/runtime/**` is available in the API Railway build context; add it to API watch patterns if not automatically included by Railway.
3. Run `pnpm run typecheck`, `pnpm run runtime:validate`, `pnpm run mercado:check`, and `pnpm run db:production:ready` with live secrets.
4. Exercise `/api/healthz`, `/api/v1/runtime/database`, `/api/v1/financial/health`, and a Mercado Pago sandbox webhook after deployment.
