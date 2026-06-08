# GitHub Connector Finalization Runbook

Status: production-ready read-only connector path for GitHub App installation or backend token fallback.

## Normal no-token operator flow

1. Configure the Railway API server variables listed in `GITHUB_APP_RAILWAY_VERCEL_SETUP.md`.
2. Configure only `VITE_GXEON_API_BASE_URL` in Vercel. Do not configure GitHub credentials in Vercel.
3. Open the dashboard GitHub connector page.
4. Click **Connect GitHub**. The dashboard asks the backend for `/api/connectors/github/connect-url` and redirects to the official GitHub App installation page.
5. Complete the GitHub installation. GitHub redirects to `/api/connectors/github/callback`.
6. The backend validates signed state and stores only installation metadata: `installation_id`, account login when known, repository selection, connected time and state source.
7. The backend mints a short-lived installation access token only when reading snapshots. The token is not stored long-term.

## Required runtime checks

Use the Railway API public URL as `$API_URL`.

```bash
curl -s "$API_URL/api/connectors/github/final-readiness"
curl -s "$API_URL/api/connectors/github/connect-url"
curl -s "$API_URL/api/connectors/github/snapshot"
curl -s "$API_URL/api/connectors/github/diagnostics"
```

Expected behavior:

- `/final-readiness` returns JSON with `apiRuntime.online`, safe auth diagnostics, connector diagnostics, connection state, selected connection mode and missing config codes.
- `/connect-url` returns a GitHub App installation URL when GitHub App variables and signed state are ready.
- `/snapshot` uses GitHub App installation metadata when present; otherwise it uses backend token fallback if configured.
- `/diagnostics` exposes safe metadata only. It never returns tokens, private keys or client secrets.

## Installation metadata persistence

If no approved database persistence layer exists, set the optional Railway variables after a successful installation:

- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_ACCOUNT_LOGIN`
- `GITHUB_APP_REPOSITORY_SELECTION`

The installation ID is metadata, not a token. The backend uses these values as an env fallback after Railway redeploys and marks the state source as `env`. In-memory callback state is still used immediately after installation and is marked as `memory`.

## Troubleshooting dashboard data

- `BACKEND_URL_MISCONFIGURED`: set `VITE_GXEON_API_BASE_URL` to the Railway API public URL and redeploy Vercel.
- `CONFIG_MISSING`: configure only the missing variable names returned by `/final-readiness`.
- `GITHUB_APP_PRIVATE_KEY_MISSING`: configure `GITHUB_APP_PRIVATE_KEY` in Railway.
- `GITHUB_APP_INSTALLATION_NOT_FOUND`: confirm `GITHUB_APP_INSTALLATION_ID` matches the installed app.
- `INSTALLATION_HAS_NO_REPOSITORIES`: authorize at least one repository for the GitHub App.

## Security boundary

- No frontend GitHub token variable is used.
- No GitHub access token is stored in the frontend or long-term backend state.
- No GitHub write permissions or mutation routes are added.
- All failures return safe JSON diagnostics instead of raw HTML or secret values.
