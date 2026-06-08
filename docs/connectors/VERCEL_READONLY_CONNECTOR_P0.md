# Vercel Read-Only Connector P0

GXEON Vercel Connector P0 provides backend-only, read-only visibility into Vercel projects, deployments, domains and aliases.

## Railway api-server environment

Configure these variables only on the Railway `api-server` service:

- `VERCEL_TOKEN` — Vercel token used only by the backend runtime.
- `VERCEL_TEAM_ID` — optional team scope.
- `VERCEL_API_BASE_URL=https://api.vercel.com` — optional override; defaults to the official Vercel API base URL.

Do not create any `VITE_*` Vercel token variable. The Vercel dashboard frontend calls only GXEON backend routes.

## Read-only scope

The connector performs only these backend `GET` requests:

- `/v9/projects`
- `/v6/deployments?projectId={projectIdOrName}`
- `/v6/deployments?projectId={projectIdOrName}&target=production`
- `/v9/projects/{projectIdOrName}/domains`
- `/v4/aliases?projectId={projectIdOrName}`

The connector has no redeploy action and no provider write path.

## Validation URLs

After Railway redeploy:

- `https://gxeon-api-server-production.up.railway.app/api/connectors/vercel/diagnostics`
- `https://gxeon-api-server-production.up.railway.app/api/connectors/vercel/snapshot`
- `https://gxeon-api-server-production.up.railway.app/api/connectors/vercel/activity`

Dashboard route after Vercel dashboard redeploy:

- `/ops/connectors/vercel`

## Expected status

Without `VERCEL_TOKEN`, diagnostics returns `configured: false` and the snapshot remains `READY` with `lastErrorCode: MISSING_VERCEL_TOKEN`.

With `VERCEL_TOKEN`, the backend reads real Vercel data and the snapshot becomes `CONNECTED_READONLY` after successful read-only API calls, or `PARTIAL_READONLY` when projects load but optional deployment/domain/alias sections fail. If corrected reads still return 404, add `VERCEL_TEAM_ID` for team-owned projects.
