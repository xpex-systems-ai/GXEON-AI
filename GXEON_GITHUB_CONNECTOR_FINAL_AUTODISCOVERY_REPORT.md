# GXEON GitHub Connector Final Autodiscovery Report

## Final status

READY pending production redeploy and live GitHub App validation. Local API build and dashboard checks passed; API typecheck remains blocked by pre-existing monorepo project-reference/declaration issues outside this connector change.

## Root cause

The GitHub App callback saved `installation_id` only when GitHub redirected through the callback. After deploy, the API server memory state could be empty and no persistent `GITHUB_APP_INSTALLATION_ID` env fallback existed. Snapshot then treated the connector as not connected and fell back to the legacy backend token path, which produced `MISSING_TOKEN` even though GitHub App credentials were complete.

## Autodiscovery fix

The API server now lists GitHub App installations with a server-side app JWT, mints short-lived installation tokens, lists installation repositories, selects the configured repository (or the first accessible repository when no repo env target is set), and saves only safe installation metadata in memory as `stateSource=autodiscovered`.

## Files changed

- `artifacts/api-server/src/connectors/github/githubAppInstallationClient.ts`
- `artifacts/api-server/src/connectors/github/githubConnectorActivityLog.ts`
- `artifacts/api-server/src/connectors/github/githubConnectorStateStore.ts`
- `artifacts/api-server/src/connectors/github/githubConnectorTypes.ts`
- `artifacts/api-server/src/connectors/github/githubInstallationResolver.ts`
- `artifacts/api-server/src/connectors/github/githubReadonlyClient.ts`
- `artifacts/api-server/src/routes/connectors/github.ts`
- `artifacts/gxeon-dashboard/src/data/github-readonly-connector.ts`
- `artifacts/gxeon-dashboard/src/pages/GitHubReadonlyConnectorPage.tsx`
- `artifacts/gxeon-dashboard/src/services/githubConnectorService.ts`
- `docs/connectors/GITHUB_CONNECTOR_FINAL_AUTODISCOVERY_RUNBOOK.md`
- `GXEON_GITHUB_CONNECTOR_FINAL_AUTODISCOVERY_REPORT.md`

## Safety confirmations

- No secrets are exposed in diagnostics, activity logs, frontend data or documentation.
- No GitHub write operations were added.
- No frontend GitHub token variable or token storage was added.
- Installation access tokens are minted on demand and not persisted.
- Dashboard activity logs display only safe connector events and metadata.

## Validation results

- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/gxeon-dashboard run typecheck` passed.
- `pnpm --filter @workspace/gxeon-dashboard run build` passed with existing Vite sourcemap/chunk-size warnings.
- `git diff --check` passed.
- Security scan commands returned only documentation references to forbidden examples and the explicit `VITE_GITHUB_TOKEN` prohibition; no token values or GitHub write implementation was found.
- Local curl route smoke checks returned no payload because no API server was running on `localhost:3000` during validation.
- `pnpm --filter @workspace/api-server run typecheck` is blocked by pre-existing TypeScript errors in `src/routes/health.ts`, `src/services/financial/*`, and `src/tests/financialRuntimeSmoke.ts`, including missing built declarations for `lib/api-zod` / `lib/db` and implicit `any` parameters in financial runtime smoke tests.
