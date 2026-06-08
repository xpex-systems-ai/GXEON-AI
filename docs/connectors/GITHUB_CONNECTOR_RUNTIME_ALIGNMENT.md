# GitHub Connector Runtime Alignment

## Root cause this fix is designed to reveal

If the dashboard shows `READY_BACKEND_UNAVAILABLE` after credentials were added, the browser is usually reaching the Vercel dashboard but not the Railway API server. The dashboard calls `/api/connectors/github/*` by default as same-origin URLs. When the frontend and API server are deployed separately, Vercel must be told where the Railway API server lives.

## Railway API server variables

Set these on the Railway service that runs `@workspace/api-server`, not on a static frontend-only service:

- `GITHUB_CONNECTOR_TOKEN` — backend-only GitHub fine-grained token or GitHub App token.
- `GITHUB_CONNECTOR_OWNER=xpex-systems-ai`
- `GITHUB_CONNECTOR_REPO=GXEON-AI`

Do not print, paste or commit token values in tickets, docs, logs or frontend variables.

## Vercel dashboard variable

If the dashboard is deployed separately from the API server, set only this public routing variable in Vercel:

- `VITE_GXEON_API_BASE_URL=https://YOUR-RAILWAY-API-SERVER-DOMAIN`

This value must point to the GXEON API server public domain. It must not point to GitHub, and it must not contain a GitHub token.

If the dashboard and API server are served from the same origin with a working `/api` route, leave `VITE_GXEON_API_BASE_URL` unset.

## Redeploy order

1. Deploy or redeploy the Railway API server after setting the GitHub connector variables.
2. Test Railway API routes directly.
3. Set or update `VITE_GXEON_API_BASE_URL` in Vercel only if frontend and API are separate.
4. Redeploy the Vercel dashboard.
5. Open `/ops/connectors/github` and verify the diagnostics panel.

## Direct API tests

Replace the host with the Railway API public domain when testing production:

```bash
curl -s https://YOUR-RAILWAY-API-SERVER-DOMAIN/api/connectors/github/diagnostics
curl -s https://YOUR-RAILWAY-API-SERVER-DOMAIN/api/connectors/github/status
curl -s https://YOUR-RAILWAY-API-SERVER-DOMAIN/api/connectors/github/snapshot
```

Expected diagnostics behavior:

- `routeStatus: "ONLINE"` confirms the route is reachable.
- `tokenPresent: true` confirms the API server runtime sees a token without exposing it.
- `ownerPresent: true` and `repoPresent: true` confirm repository targeting is present.
- `configured: true` means backend variables are present.

Expected snapshot behavior:

- `CONNECTED_READONLY` means GitHub reads succeeded.
- `READY` with `MISSING_TOKEN`, `MISSING_OWNER` or `MISSING_REPO` means backend config is incomplete.
- `FAILED` with `GITHUB_401`, `GITHUB_403`, `GITHUB_404`, `RATE_LIMITED` or `NETWORK_ERROR` means the backend is configured but GitHub reads did not succeed.

## Common fixes

- If diagnostics is unreachable from Vercel, set `VITE_GXEON_API_BASE_URL` to the Railway API server domain and redeploy Vercel.
- If diagnostics is reachable but `tokenPresent` is false, set `GITHUB_CONNECTOR_TOKEN` on the Railway API server service and redeploy Railway.
- If snapshot returns `GITHUB_401`, rotate or recreate the token.
- If snapshot returns `GITHUB_403`, verify read permissions and selected repository scope.
- If snapshot returns `GITHUB_404`, verify owner/repo names and token repository selection.
