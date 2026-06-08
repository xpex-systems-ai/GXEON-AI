# GXEON GitHub Connector Runtime Alignment Report

## Final status

READY_FOR_RUNTIME_VERIFICATION

The code now exposes safe runtime diagnostics and lets the Vercel dashboard route GitHub connector reads to a separately deployed Railway API server through `VITE_GXEON_API_BASE_URL`.

## Changed files

- `artifacts/api-server/src/connectors/github/githubConnectorTypes.ts`
- `artifacts/api-server/src/connectors/github/githubConnectorConfig.ts`
- `artifacts/api-server/src/connectors/github/githubReadonlyClient.ts`
- `artifacts/api-server/src/connectors/github/githubReadonlyNormalizer.ts`
- `artifacts/api-server/src/routes/connectors/github.ts`
- `artifacts/gxeon-dashboard/src/data/github-readonly-connector.ts`
- `artifacts/gxeon-dashboard/src/services/githubConnectorService.ts`
- `artifacts/gxeon-dashboard/src/pages/GitHubReadonlyConnectorPage.tsx`
- `docs/connectors/GITHUB_CONNECTOR_RUNTIME_ALIGNMENT.md`
- `GXEON_GITHUB_CONNECTOR_RUNTIME_ALIGNMENT_REPORT.md`

## Likely root cause

The symptom `READY_BACKEND_UNAVAILABLE` means the frontend could not reach the backend snapshot route. The most likely deployment mismatch is a Vercel frontend calling same-origin `/api/connectors/github/snapshot` while the real API server is hosted on Railway without a Vercel proxy or `VITE_GXEON_API_BASE_URL` pointing to Railway.

## Railway environment variables

Set these on the Railway API server service:

- `GITHUB_CONNECTOR_TOKEN`
- `GITHUB_CONNECTOR_OWNER=xpex-systems-ai`
- `GITHUB_CONNECTOR_REPO=GXEON-AI`

## Vercel environment variables

Set this only when Vercel hosts the dashboard separately from the API server:

- `VITE_GXEON_API_BASE_URL=https://YOUR-RAILWAY-API-SERVER-DOMAIN`

Do not put GitHub tokens in Vercel frontend variables.

## Security confirmations

- No secrets were added or printed.
- The diagnostics endpoint returns only booleans for token/owner/repo presence and safe non-secret owner/repo values.
- The frontend does not call GitHub directly.
- No GitHub write operations were added.
- No database writes were added.

## Validation results

- `pnpm --filter @workspace/api-server run typecheck`: passed after `pnpm run typecheck:libs` built referenced workspace declarations.
- `pnpm --filter @workspace/api-server run build`: passed.
- `pnpm --filter @workspace/gxeon-dashboard run typecheck`: passed.
- `pnpm --filter @workspace/gxeon-dashboard run build`: passed with existing Vite sourcemap and chunk-size warnings.
- `git diff --check`: passed.
- Frontend/API/docs scan: warning only; it matched pre-existing docs and governance auth comments outside this GitHub runtime alignment change.
- `curl -s http://localhost:3000/api/connectors/github/diagnostics`: passed against local API server and returned `routeStatus: ONLINE`, `tokenPresent: false`, safe owner/repo and `MISSING_TOKEN` without exposing any token value.
- `curl -s http://localhost:3000/api/connectors/github/status`: passed against local API server and returned safe `READY`/`MISSING_TOKEN` status.
- `curl -s http://localhost:3000/api/connectors/github/snapshot`: passed against local API server and returned safe empty `READY` snapshot with `lastErrorCode: MISSING_TOKEN`.
