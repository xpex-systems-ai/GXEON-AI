# RAILWAY_ARCHITECTURE_REPORT

## Scope

This architecture maps the deployability of the requested PNPM workspaces and provides Railway config-as-code files for the deployable services.

Railway config-as-code is evaluated per deployment/service. Because this repository is a shared PNPM monorepo, each Railway service should keep **Root Directory** set to `/` and should point **Custom Config File** to the matching service config below:

| Railway service | Custom Config File |
| --- | --- |
| `workspace-api-server` | `/.railway/api-server/railway.json` |
| `workspace-gxo-dashboard` | `/.railway/gxeon-dashboard/railway.json` |
| `workspace-gxo-dashboard-mobile` | `/.railway/gxeon-dashboard-mobile/railway.json` |
| `workspace-mockup-sandbox` | `/.railway/mockup-sandbox/railway.json` |

`@workspace/api-client-react` is intentionally not assigned a Railway config because it is a library package with no runtime start command.

## SERVICE: @workspace/api-server

ROLE: HTTP API service

ROOT_DIRECTORY: `/`

BUILD_COMMAND: `pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build`

START_COMMAND: `pnpm --filter @workspace/api-server run start`

DEPENDENCIES:

- Internal: `@workspace/api-zod`, `@workspace/db`
- Runtime: `express`, `cors`, `cookie-parser`, `drizzle-orm`, `pino`, `pino-http`
- Required Railway/runtime variable: `PORT`

DEPLOYABLE: YES

RISK_LEVEL: MEDIUM

Notes:

- Deployable as a Node HTTP API.
- Must be built from monorepo root so `workspace:*` dependencies resolve.
- Healthcheck path is `/api/healthz`.
- Risk is medium because the service depends on internal workspace packages and requires a valid `PORT` at runtime.

## SERVICE: @workspace/api-client-react

ROLE: Shared React API-client library

ROOT_DIRECTORY: `/`

BUILD_COMMAND: `pnpm --filter @workspace/api-client-react run build`

START_COMMAND: N/A

DEPENDENCIES:

- Runtime/client library dependency: `@tanstack/react-query`
- Peer dependency: `react >=18`

DEPLOYABLE: NO

RISK_LEVEL: LOW

Notes:

- This workspace has `build` and `typecheck` scripts only.
- It has no `start`, `serve`, or `preview` script and should not be configured as a Railway service.
- It is consumed by `@workspace/gxeon-dashboard`.

## SERVICE: @workspace/gxeon-dashboard

ROLE: Web dashboard service

ROOT_DIRECTORY: `/`

BUILD_COMMAND: `PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/api-client-react run build && PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard run serve`

DEPENDENCIES:

- Internal: `@workspace/api-client-react`
- Frontend/runtime: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `@tanstack/react-query`, `@supabase/supabase-js`
- Required Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`)

DEPLOYABLE: YES

RISK_LEVEL: MEDIUM

Notes:

- Deployable as a Vite preview web service.
- The workspace has `serve`, not `start`, so Railway must use the explicit start command above.
- `vite.config.ts` requires both `PORT` and `BASE_PATH` to be defined when the config loads.

## SERVICE: @workspace/gxeon-dashboard-mobile

ROLE: Expo static-build service with Node static server

ROOT_DIRECTORY: `/`

BUILD_COMMAND: `BASE_PATH=${BASE_PATH:-/} EXPO_PUBLIC_DOMAIN=${EXPO_PUBLIC_DOMAIN:-$RAILWAY_PUBLIC_DOMAIN} pnpm --filter @workspace/gxeon-dashboard-mobile run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/gxeon-dashboard-mobile run serve`

DEPENDENCIES:

- Expo/React Native stack: `expo`, `expo-router`, `react`, `react-dom`, `react-native`, `react-native-web`
- Runtime/static server: Node.js built-ins via `server/serve.js`
- Required Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`), `EXPO_PUBLIC_DOMAIN` or `RAILWAY_PUBLIC_DOMAIN`

DEPLOYABLE: YES

RISK_LEVEL: HIGH

Notes:

- Deployable, but higher risk than the Vite services because the build starts Metro, downloads iOS/Android bundles, writes `static-build`, and requires a public deployment domain.
- On Railway, configure `EXPO_PUBLIC_DOMAIN` explicitly if `RAILWAY_PUBLIC_DOMAIN` is unavailable during build.
- The build script searches upward for `pnpm-workspace.yaml`, so Root Directory must remain `/`.

## SERVICE: @workspace/mockup-sandbox

ROLE: Vite mockup/sandbox web service

ROOT_DIRECTORY: `/`

BUILD_COMMAND: `PORT=${PORT:-3000} BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/mockup-sandbox run build`

START_COMMAND: `PORT=$PORT BASE_PATH=${BASE_PATH:-/} pnpm --filter @workspace/mockup-sandbox run preview -- --host 0.0.0.0`

DEPENDENCIES:

- Frontend/runtime: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`
- Required Railway/runtime variables: `PORT`, `BASE_PATH` (recommended `/`)

DEPLOYABLE: YES

RISK_LEVEL: LOW

Notes:

- Deployable as a Vite preview web service.
- The workspace has `preview`, not `start`; Railway must use the explicit start command above.
- `vite.config.ts` requires both `PORT` and `BASE_PATH` to be defined when the config loads.

## Architecture risks

- Railway root directory is a service setting, not encoded in these config files. Keep it as `/` for all deployable services because the workspaces share PNPM lockfile, catalog, and internal packages.
- The repository now pins `pnpm@10.28.1`, but Railway must honor the root `packageManager` field during install.
- `@workspace/api-client-react` should not be deployed as a service because it has no runtime command.
- The dashboard and mockup services use Vite configs that require `PORT` and `BASE_PATH` during build/config loading.
- The mobile service requires `EXPO_PUBLIC_DOMAIN` or a usable `RAILWAY_PUBLIC_DOMAIN` during build.

## Files generated

- `.railway/api-server/railway.json`
- `.railway/gxeon-dashboard/railway.json`
- `.railway/gxeon-dashboard-mobile/railway.json`
- `.railway/mockup-sandbox/railway.json`
- `RAILWAY_ARCHITECTURE_REPORT.md`
