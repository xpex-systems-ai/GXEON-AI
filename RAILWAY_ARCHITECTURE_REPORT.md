# RAILWAY_ARCHITECTURE_REPORT

## Status

The monorepo is configured for Railway's JavaScript monorepo flow with `pnpm@10.28.1` pinned at the repository root. Railway's current monorepo guidance says JavaScript monorepo imports create service-specific package deployments and detect `railway.json` / `railway.toml` at the package root. For that reason, each requested workspace now has its own `railway.json` beside its `package.json`.

> Railway dashboard requirement: keep each service connected to the matching workspace package. The generated config files do not execute a deploy by themselves; trigger a redeploy in Railway after this branch is merged.

## SERVICE: @workspace/api-server

ROLE: HTTP API service

ROOT_DIRECTORY: `artifacts/api-server` as the Railway package service; commands are still monorepo-aware through `pnpm --filter`.

BUILD_COMMAND: `pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build`

START_COMMAND: `pnpm --filter @workspace/api-server run start`

DEPENDENCIES:

- Internal: `@workspace/api-zod`, `@workspace/db`
- Runtime: `express`, `cors`, `cookie-parser`, `drizzle-orm`, `pino`, `pino-http`
- Railway/runtime variables: `PORT`

DEPLOYABLE: YES

RISK_LEVEL: MEDIUM

CONFIG_FILE: `artifacts/api-server/railway.json`

Notes:

- The API healthcheck is `/api/healthz`.
- The build explicitly compiles `@workspace/api-zod` before the API server so TypeScript project references and bundled imports have generated declarations available.

## SERVICE: @workspace/api-client-react

ROLE: Shared React API-client library with Railway health wrapper

ROOT_DIRECTORY: `lib/api-client-react` as the Railway package service; commands are monorepo-aware through `pnpm --filter`.

BUILD_COMMAND: `pnpm --filter @workspace/api-client-react run build`

START_COMMAND: Inline Node HTTP health server from `lib/api-client-react/railway.json`

DEPENDENCIES:

- Runtime/client library dependency: `@tanstack/react-query`
- Peer dependency: `react >=18`
- Railway/runtime variables: `PORT`

DEPLOYABLE: YES, as a lightweight health endpoint for the already-created Railway service. Functionally it remains a library and should be consumed by apps rather than called as a product API.

RISK_LEVEL: LOW

CONFIG_FILE: `lib/api-client-react/railway.json`

Notes:

- This service exists in Railway already, so the config gives it a valid process and healthcheck instead of letting Railway fail with no start command.
- No business logic was added to the package; the runtime is an inline health response in Railway config.

## SERVICE: @workspace/gxeon-dashboard

ROLE: Web dashboard service

ROOT_DIRECTORY: `artifacts/gxeon-dashboard` as the Railway package service; commands are monorepo-aware through `pnpm --filter`.

BUILD_COMMAND: `PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/api-client-react run build && PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard run serve`

DEPENDENCIES:

- Internal: `@workspace/api-client-react`
- Frontend/runtime: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `@tanstack/react-query`, `@supabase/supabase-js`
- Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`)

DEPLOYABLE: YES

RISK_LEVEL: MEDIUM

CONFIG_FILE: `artifacts/gxeon-dashboard/railway.json`

Notes:

- The workspace exposes `serve`, not `start`, so Railway must use the configured start command.
- `PORT` and `BASE_PATH` are supplied in the build/start command because the Vite config requires both while loading.

## SERVICE: @workspace/gxeon-dashboard-mobile

ROLE: Expo static-build service with Node static server

ROOT_DIRECTORY: `artifacts/gxeon-dashboard-mobile` as the Railway package service; commands are monorepo-aware through `pnpm --filter`.

BUILD_COMMAND: `BASE_PATH=${BASE_PATH:-/} EXPO_PUBLIC_DOMAIN=${EXPO_PUBLIC_DOMAIN:-$RAILWAY_PUBLIC_DOMAIN} pnpm --filter @workspace/gxeon-dashboard-mobile run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard-mobile run serve`

DEPENDENCIES:

- Expo/React Native stack: `expo`, `expo-router`, `react`, `react-dom`, `react-native`, `react-native-web`
- Runtime/static server: Node.js built-ins via `server/serve.js`
- Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`), `EXPO_PUBLIC_DOMAIN` or `RAILWAY_PUBLIC_DOMAIN`

DEPLOYABLE: YES

RISK_LEVEL: HIGH

CONFIG_FILE: `artifacts/gxeon-dashboard-mobile/railway.json`

Notes:

- The build starts Metro, downloads iOS/Android bundles, creates `static-build`, and then serves those generated assets.
- Configure `EXPO_PUBLIC_DOMAIN` explicitly if Railway does not expose `RAILWAY_PUBLIC_DOMAIN` during build.
- Local validation required unsetting proxy variables so the build could fetch Metro bundles from `localhost`; Railway normally does not inject the Codex proxy variables.

## SERVICE: @workspace/mockup-sandbox

ROLE: Vite mockup/sandbox web service

ROOT_DIRECTORY: `artifacts/mockup-sandbox` as the Railway package service; commands are monorepo-aware through `pnpm --filter`.

BUILD_COMMAND: `PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/mockup-sandbox run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/mockup-sandbox run preview -- --host 0.0.0.0`

DEPENDENCIES:

- Frontend/runtime: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`
- Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`)

DEPLOYABLE: YES

RISK_LEVEL: LOW

CONFIG_FILE: `artifacts/mockup-sandbox/railway.json`

Notes:

- The workspace exposes `preview`, not `start`, so Railway must use the configured start command.
- `PORT` and `BASE_PATH` are supplied in the build/start command because the Vite config requires both while loading.

## Files generated or updated

- `artifacts/api-server/railway.json`
- `lib/api-client-react/railway.json`
- `artifacts/gxeon-dashboard/railway.json`
- `artifacts/gxeon-dashboard-mobile/railway.json`
- `artifacts/mockup-sandbox/railway.json`
- `RAILWAY_ARCHITECTURE_REPORT.md`
- `artifacts/gxeon-dashboard-mobile/hooks/useColors.ts`

## Operational checklist to bring Railway online

1. Merge this branch.
2. In Railway, trigger a redeploy for each service card.
3. Ensure `BASE_PATH=/` is set for dashboard, mobile, and mockup services if not relying on command defaults.
4. Ensure mobile has `EXPO_PUBLIC_DOMAIN` or that Railway provides `RAILWAY_PUBLIC_DOMAIN` during build.
5. Remove or ignore any old custom config file paths pointing to `/.railway/...`; config files now live at package roots for monorepo auto-detection.
