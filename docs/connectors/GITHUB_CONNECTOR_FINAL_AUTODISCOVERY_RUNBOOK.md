# GitHub Connector Final Autodiscovery Runbook

## Purpose

The GXEON GitHub connector uses a GitHub App as the primary read-only flow. After the app is installed, the API server can discover the installation from GitHub App credentials, mint short-lived installation access tokens server-side, and read repository data without a manual PAT.

## Secret boundary

- GitHub App credentials live only in the Railway `@workspace/api-server` runtime.
- The Vercel dashboard never stores GitHub tokens and never calls GitHub directly.
- Installation access tokens are minted on demand by the API server and are not persisted.
- Diagnostics and activity routes return safe metadata only; they do not expose private keys, JWTs, access tokens, OAuth secrets, authorization headers, or raw GitHub payloads.

## Required Railway variables

Set these on the Railway API server service:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_SLUG`
- `GITHUB_OAUTH_STATE_SECRET`
- `GITHUB_CALLBACK_URL`
- `GXEON_DASHBOARD_URL`
- `GXEON_API_PUBLIC_URL`

Optional repository targeting:

- `GITHUB_CONNECTOR_OWNER`
- `GITHUB_CONNECTOR_REPO`

Optional persistent installation fallback:

- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_ACCOUNT_LOGIN`
- `GITHUB_APP_REPOSITORY_SELECTION`

`GITHUB_APP_INSTALLATION_ID` is no longer required for normal operation. It remains useful as a persistent fallback if the operator wants the API server to skip autodiscovery after a redeploy.

## Required Vercel variable

Set this on the Vercel dashboard when the dashboard and API server are deployed on different origins:

- `VITE_GXEON_API_BASE_URL=https://gxeon-api-server-production.up.railway.app`

The dashboard uses this base URL for GXEON API routes only. It must not include GitHub credentials.

## Autodiscovery flow

1. `/api/connectors/github/snapshot` checks whether GitHub App credentials are complete.
2. If no installation state exists in memory or env, the API server calls GitHub App installations discovery using a server-side app JWT.
3. For each safe installation metadata record, the server mints a short-lived installation token and lists accessible repositories.
4. If `GITHUB_CONNECTOR_OWNER` and `GITHUB_CONNECTOR_REPO` are set, the resolver selects the installation that can read that repository.
5. If repository env targeting is absent, the resolver selects the first installation with at least one accessible repository.
6. The selected installation metadata is saved in memory with `stateSource=autodiscovered`.
7. The snapshot endpoint mints a fresh installation token and reads repository metadata, branches, pull requests, issues and commits.

## Validation URLs

Open these after redeploying Railway:

- `https://gxeon-api-server-production.up.railway.app/api/connectors/github/diagnostics`
- `https://gxeon-api-server-production.up.railway.app/api/connectors/github/final-readiness`
- `https://gxeon-api-server-production.up.railway.app/api/connectors/github/activity`
- `https://gxeon-api-server-production.up.railway.app/api/connectors/github/snapshot`

Expected results:

- Diagnostics `routeStatus` is `ONLINE`.
- Auth `missing` is `[]` when GitHub App credentials are complete.
- Final readiness reports `READY` or `READY_TO_DISCOVER_INSTALLATION` instead of backend unavailable when app credentials are complete.
- Snapshot reports `CONNECTED_READONLY` and `connectionMode=github_app_installation` after autodiscovery succeeds.
- Activity logs include safe events such as `diagnostics_checked`, `installation_autodiscovered`, `installation_token_minted`, and `repository_snapshot_read`.

## Getting the installation id if needed

The installation id can be read from safe response metadata after discovery:

- `diagnostics.connection.installationId`
- `snapshot.installation.installationId`
- `activity.events[].metadata.installationId`

If an operator wants a persistent fallback, copy that id into Railway as `GITHUB_APP_INSTALLATION_ID` and redeploy the API server.

## Safety guarantees

- No GitHub write operations are added.
- No browser token storage is added.
- No `VITE_GITHUB_TOKEN` is used.
- Legacy `GITHUB_CONNECTOR_TOKEN` remains a backend-only read fallback, not the primary flow.
