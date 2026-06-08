# GXEON Vercel Connector P0 Report

## Implemented

- Backend Vercel connector config reads `VERCEL_TOKEN` only from Railway api-server environment and exposes only safe boolean diagnostics.
- Backend read-only client supports Vercel project, deployment, deployment-detail, domain and alias reads with limits and normalized error codes.
- Snapshot normalizer returns `READY`, `CONNECTED_READONLY` or `FAILED`, including project totals, production readiness, recent failures, domain count, latest deployments, health score and safety flags.
- In-memory activity log records safe diagnostics, snapshot and read events without secrets.
- API routes are available at `/api/connectors/vercel/diagnostics`, `/api/connectors/vercel/snapshot` and `/api/connectors/vercel/activity`.
- Dashboard service fetches only GXEON backend routes using `VITE_GXEON_API_BASE_URL` and never calls Vercel directly.
- Dashboard page is wired at `/ops/connectors/vercel` with status, health, project/deployment/domain metrics, activity logs, evidence timeline and safety boundary.

## Safety confirmations

- No Vercel secret is exposed to the frontend.
- No `VITE_VERCEL_TOKEN` is introduced.
- No Vercel write operation is implemented.
- No redeploy trigger is implemented.
- No provider data is written to persistent storage.
- Logs are sanitized and avoid tokens, environment values, build logs and secrets.

## Operator steps after merge

1. Add `VERCEL_TOKEN` in Railway api-server variables.
2. Optionally add `VERCEL_TEAM_ID`.
3. Redeploy Railway api-server.
4. Open `/api/connectors/vercel/diagnostics`.
5. Open `/api/connectors/vercel/snapshot`.
6. Redeploy the Vercel dashboard.
7. Open `/ops/connectors/vercel`.
