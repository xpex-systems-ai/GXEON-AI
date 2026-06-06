# GXEON Lean Stack Repository Audit

**Mission:** GXEON_LEAN_STACK_FOUNDATION  
**Operator:** Junior Sena  
**Execution date:** 2026-06-06  
**Status:** DEGRADED — repository is auditable and mostly operational, but Supabase runtime credentials are not present in this environment and legacy infrastructure references remain.

## Scope and rules confirmed

- No external paid services were connected.
- No Vercel, Codespaces, Replit, Railway, production deploy, or database mutation commands were executed.
- Environment variables were checked by name and availability only; no values were printed.
- Existing GXEON OS visual dashboard mode was preserved.
- Existing Drizzle financial schema, migration, and Supabase activation scripts were preserved.

## Monorepo structure

This repository is a pnpm workspace monorepo. The workspace definition includes:

- `artifacts/*` — runnable application artifacts and UI sandboxes.
- `lib/*` — shared libraries including API contracts, client packages, and database package.
- `lib/integrations/*` — reserved integration package scope.
- `scripts` — operational scripts package.

## Package manager

- Package manager: `pnpm@10.28.1`.
- Root `preinstall` enforces pnpm and removes npm/yarn lock files.
- Supply-chain guard: `minimumReleaseAge: 1440` in `pnpm-workspace.yaml`.

## Identified workspaces

| Workspace | Path | Role |
|---|---:|---|
| `@workspace/gxeon-dashboard` | `artifacts/gxeon-dashboard` | Primary GXEON OS dashboard app |
| `@workspace/api-server` | `artifacts/api-server` | API server app |
| `@workspace/gxeon-dashboard-mobile` | `artifacts/gxeon-dashboard-mobile` | Mobile dashboard artifact |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox` | Mockup/sandbox app |
| `@workspace/db` | `lib/db` | Drizzle/Postgres database package |
| `@workspace/api-zod` | `lib/api-zod` | API schema/contracts package |
| `@workspace/api-client-react` | `lib/api-client-react` | React API client package |
| `@workspace/api-spec` | `lib/api-spec` | API spec/orval package |
| `@workspace/scripts` | `scripts` | Operational script package |

## Dashboard app

- Dashboard package: `artifacts/gxeon-dashboard/package.json`.
- App entry audited: `artifacts/gxeon-dashboard/src/App.tsx`.
- Vite config: `artifacts/gxeon-dashboard/vite.config.ts`.
- Current dashboard route mode after stabilization: visual-first GXEON OS module routes plus professional placeholder routes; no real API route activation was added.

## API server app

- API server package: `artifacts/api-server/package.json`.
- Scripts identified: `dev`, `build`, `start`, `typecheck`, `smoke:financial`.
- Financial API runtime files exist under `artifacts/api-server/src/routes/financial.ts` and `artifacts/api-server/src/services/financial/*`.

## DB package

- DB package: `lib/db/package.json`.
- Drizzle config: `lib/db/drizzle.config.ts`.
- Schema export index: `lib/db/src/schema/index.ts`.
- Financial schema: `lib/db/src/schema/financial.ts`.
- Financial migration: `lib/db/drizzle/0000_financial_foundation.sql`.

## Supabase scripts

Supabase-related scripts and config identified:

- `scripts/supabase_env_check.cjs`
- `scripts/supabase_activation.cjs`
- `scripts/supabase_go_live.cjs`
- `supabase/README.md`
- `supabase/config.toml`

Root package scripts include:

- `supabase:check`
- `supabase:activate`
- `supabase:activate:push`
- `supabase:go-live`

Mutation/deploy-risk scripts were not run.

## Drizzle financial schema and migration

Expected financial tables were found in the Drizzle schema and SQL migration:

- `actor_wallets`
- `global_transactions`
- `payment_attempts`
- `financial_ledger`
- `payment_webhook_events`

Expected financial enums were found:

- `transaction_status`
- `payment_attempt_status`
- `wallet_status`
- `ledger_entry_type`
- `ledger_source_type`
- `webhook_processing_status`

## Existing migrations

- `lib/db/drizzle/0000_financial_foundation.sql` is the identified financial foundation migration.
- No migration command was executed.

## Financial runtime files

Primary financial runtime files identified:

- `artifacts/api-server/src/routes/financial.ts`
- `artifacts/api-server/src/services/financial/walletService.ts`
- `artifacts/api-server/src/services/financial/ledgerService.ts`
- `artifacts/api-server/src/services/financial/transactionService.ts`
- `artifacts/api-server/src/services/financial/databaseRuntime.ts`
- `artifacts/api-server/src/services/financial/metrics.ts`
- `artifacts/api-server/src/middlewares/financialAuth.ts`
- `artifacts/api-server/src/tests/financialRuntimeSmoke.ts`
- `server/runtime/financialDb.cjs`
- `server/runtime/paymentRuntime.cjs`
- `server/runtime/paymentOrchestrator.cjs`
- `server/runtime/mercadoPagoAdapter.cjs`
- `server/runtime/mercadoWebhookRuntime.cjs`

## Frontend mock/placeholder modules

Visual/mock/placeholder modules identified:

- `artifacts/gxeon-dashboard/src/pages/GxeonPlaceholderPage.tsx`
- `artifacts/gxeon-dashboard/src/pages/GxeonOSPage.tsx`
- `artifacts/mockup-sandbox`
- Professional placeholder routes in `artifacts/gxeon-dashboard/src/App.tsx` for transactions, commissions, actors, API keys, datasets, health, revenue, revenue engine, revenue streams, system logs, governance, conversion, live runtime, operational dashboard, and deploy engine.

## Build risks identified

| Risk | Severity | Status |
|---|---:|---|
| Duplicate imports in dashboard `App.tsx`, `GxeonOSPage.tsx`, `Sidebar.tsx`, and `Topbar.tsx` | High | Fixed |
| Duplicate routes in dashboard `App.tsx` | High | Fixed by retaining one visual-first route source |
| Duplicate/malformed JSX blocks in dashboard page/layout components | High | Fixed while preserving visual-only dashboard behavior |
| Broken route component references in dashboard `App.tsx` because concrete pages were referenced without imports | High | Fixed by preserving professional placeholder routes and removing unreachable duplicate route block |
| Root `typecheck:libs` depends on all referenced library project state | Medium | Validate with `pnpm run typecheck:libs` |
| Supabase/DB readiness requires env injection | Critical for live DB | Blocked in current environment because required env names are missing |
| Legacy platform configs remain | Medium | Classified in stack simplification report; no deletion performed |

## Dead or duplicated routes

Before stabilization, dashboard `App.tsx` contained duplicate entries for module routes and legacy routes, plus professional placeholder routes that shadowed later concrete routes for the same paths. The stabilized router now keeps:

- one `moduleRoutes` source for core GXEON OS modules;
- one `professionalPlaceholderRoutes` source for visual-only placeholder screens;
- explicit legacy dashboard/settings routes;
- a single `NotFound` fallback.

## Lean stack recommendation

Active lean stack should remain:

1. **ChatGPT** — command center and mission planning.
2. **Codex** — execution factory and repository change operator.
3. **GitHub** — source of truth, CI, audit trail, and pull requests.
4. **Supabase** — database/auth/storage layer after credentials are injected and migration/push commands are explicitly authorized.

Legacy platform files should remain untouched for now but treated as blocked/legacy unless the operator explicitly reactivates them.
