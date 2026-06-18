# GXEON Audit OS Repository Baseline Report

- Branch observed by `git status --short --branch`: `work`.
- Initial working tree: not clean after mission files were added in this execution; no production mutation commands were run.
- Package manager: `pnpm@10.28.1` from root `package.json`.
- Workspace packages: `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`.
- Database source of truth: `lib/db/src/schema/index.ts`, now exporting `financial`, `r100OperationalState`, and `audit`.
- `apps/` contains only `apps/README.md`; active runnable applications remain under `artifacts/`.
- Active inspected applications: `artifacts/api-server` and `artifacts/gxeon-dashboard`.

## Safety-sensitive scripts identified

- Database/Supabase: `db:validate:financial`, `db:production:validate`, `db:production:ready`, `supabase:check`, `supabase:activate`, `supabase:activate:push`, `supabase:go-live`, `@workspace/db push`, `@workspace/db push-force`.
- Production/deploy/activation: `production:activate`, `deploy:railway:auto`, `predeploy:validate`, `build:all`.
- Financial validation: `mercado:check`, `db:validate:financial`, `smoke:financial`.

## Commands explicitly not executed for safety

- `pnpm --filter @workspace/db run push`
- `pnpm run supabase:activate`
- `pnpm run supabase:activate:push`
- `pnpm run supabase:go-live`
- `pnpm run production:activate`
