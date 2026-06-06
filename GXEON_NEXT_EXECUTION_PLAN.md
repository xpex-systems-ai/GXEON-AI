# GXEON Next Execution Plan

**Current mission:** GXEON_LEAN_STACK_FOUNDATION  
**Current status:** DEGRADED  
**Reason:** Repository and dashboard are stabilized for audit/build flow, but Supabase live readiness is blocked by missing environment variables in the current environment.

## Confirmed facts

- pnpm workspace monorepo is present.
- Dashboard app is `@workspace/gxeon-dashboard` at `artifacts/gxeon-dashboard`.
- API server app is `@workspace/api-server` at `artifacts/api-server`.
- DB package is `@workspace/db` at `lib/db`.
- Drizzle financial schema and financial foundation migration exist.
- Supabase activation/check/go-live scripts exist.
- Vercel, Replit, and Railway references/configs remain in the repo and are classified as blocked/legacy for lean-stack mode.
- Codespaces-specific configuration was not found.
- Required Supabase/Postgres environment variables are missing in this execution environment.
- No database mutation or production deploy was executed.

## Critical blockers

1. **Supabase env injection missing:** `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are not available.
2. **Legacy infrastructure references remain:** they should not be activated under the lean-stack policy.
3. **DB push and Supabase activation are intentionally gated:** they require explicit operator confirmation and a secure environment.

## Recommended next mission

**Mission name:** `GXEON_SUPABASE_NON_MUTATING_VALIDATION`

### Goal

Verify Supabase/Postgres connectivity and Drizzle readiness without mutating the database.

### Tasks

1. Securely inject required Supabase/Postgres environment variables.
2. Run non-mutating env validation.
3. Run financial schema validation.
4. Run API server typecheck/build.
5. Run dashboard typecheck/build.
6. Produce a go/no-go report for a later explicit migration/push mission.

### Commands allowed in next mission without DB mutation

```bash
pnpm run supabase:check
pnpm --filter @workspace/db run validate:financial
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/gxeon-dashboard run typecheck
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build
```

### Commands still requiring explicit confirmation

```bash
pnpm --filter @workspace/db run push
pnpm run supabase:activate:push
pnpm run supabase:go-live
```

## Success criteria for next mission

- Environment variable availability confirmed without printing values.
- Financial schema validation passes.
- Dashboard and API builds pass.
- No provider outside ChatGPT/Codex/GitHub/Supabase is activated.
- No production deployment occurs.
