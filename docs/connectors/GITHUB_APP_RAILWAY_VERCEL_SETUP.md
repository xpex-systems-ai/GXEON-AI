# GitHub App Railway + Vercel Setup

## Railway API server variables

Required for the GitHub App flow:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_SLUG`
- `GITHUB_OAUTH_STATE_SECRET`
- `GXEON_DASHBOARD_URL`
- `GXEON_API_PUBLIC_URL`

Optional repository target variables:

- `GITHUB_CONNECTOR_OWNER`
- `GITHUB_CONNECTOR_REPO`

If `GITHUB_CONNECTOR_REPO` is omitted and a GitHub App installation exists, the backend lists installation repositories and reads the first accessible repository safely.

Optional installation metadata fallback after successful installation:

- `GITHUB_APP_INSTALLATION_ID`
- `GITHUB_APP_ACCOUNT_LOGIN`
- `GITHUB_APP_REPOSITORY_SELECTION`

These optional fallback variables persist safe metadata across Railway restarts. They are not access tokens and are safe to expose in diagnostics as metadata.

## Vercel dashboard variables

Set only:

- `VITE_GXEON_API_BASE_URL`

This value must point to the Railway API public URL, for example `https://your-api.up.railway.app`. Do not add GitHub credentials to Vercel.

## Validation commands

```bash
curl -s "$API_URL/api/connectors/github/final-readiness"
curl -s "$API_URL/api/connectors/github/connect-url"
curl -s "$API_URL/api/connectors/github/snapshot"
```

The response should be JSON. If Vercel receives HTML for an API call, the dashboard reports `BACKEND_URL_MISCONFIGURED` and tells the operator to set `VITE_GXEON_API_BASE_URL` to the Railway API public URL and redeploy Vercel.
