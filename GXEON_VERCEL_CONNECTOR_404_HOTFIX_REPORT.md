# GXEON Vercel Connector 404 Hotfix Report

## Root cause

The backend route was online and `VERCEL_TOKEN` could be present, but the connector used a non-working deployments path for Vercel project deployments. A 404 in that state indicates endpoint/resource/team mismatch rather than missing Railway routing. If the corrected endpoints still return 404, the token may be scoped to a Vercel team workspace and Railway should also define `VERCEL_TEAM_ID`.

## Corrected read-only endpoints

The hotfix keeps all provider calls GET-only and uses these Vercel endpoints:

- `GET /v9/projects?limit=25`
- `GET /v6/deployments?projectId={projectIdOrName}&limit=20`
- `GET /v6/deployments?projectId={projectIdOrName}&target=production&limit=1`
- `GET /v9/projects/{projectIdOrName}/domains?limit=20`
- `GET /v4/aliases?projectId={projectIdOrName}&limit=50`

When `VERCEL_TEAM_ID` is present, `teamId` is appended to every Vercel request.

## Partial snapshot behavior

Only the projects list is fail-closed for the whole snapshot. Once projects load, deployments, domains and aliases are best-effort sections. If one of those sections fails, the connector returns `PARTIAL_READONLY` with safe section errors: `projectsError`, `deploymentsError`, `domainsError` and `aliasesError`.

## Diagnostics improvements

Diagnostics now includes safe runtime-only values and a projects read probe:

- `teamIdPresent`
- `apiBaseUrl`
- `readProbe.ok`, `readProbe.status`, `readProbe.code`, `readProbe.projectCount`
- hints for invalid token (`401`), insufficient scope (`403`) and route/team/project mismatch (`404` without team ID)

The token value is never returned.

## Safety confirmations

- No frontend Vercel token variable was added.
- No Vercel token value is logged or returned.
- No provider write operation was added.
- No redeploy trigger was added.
- No domains, projects, env vars or deployments are mutated.

## Validation results

- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/gxeon-dashboard run typecheck` passed.
- `pnpm --filter @workspace/gxeon-dashboard run build` passed.
- `git diff --check` passed.
- Local curl checks returned safe READY output without a token and diagnostics included `apiBaseUrl` plus a read probe object.
- Backend scan showed only expected environment reads/sanitizer text and no Vercel write method implementation.
- Frontend scan found no Vercel token exposure patterns.
