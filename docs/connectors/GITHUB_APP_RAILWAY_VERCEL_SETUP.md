# GitHub App Railway and Vercel Setup

## Create the GitHub App

Create a GitHub App in GitHub developer settings for the GXEON connector.

Recommended app settings:

- Homepage URL: the GXEON dashboard URL.
- Callback URL: `https://YOUR-RAILWAY-API/api/connectors/github/callback`.
- Repository permissions: Metadata read, Contents read, Pull requests read, Issues read, Commit statuses read.
- Webhook: not required for P3 snapshot reads.

## Railway API server variables

Set these only on the Railway API server:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_APP_SLUG`
- `GITHUB_OAUTH_STATE_SECRET`
- `GXEON_DASHBOARD_URL`
- `GXEON_API_PUBLIC_URL`

Secret values must remain in Railway and must not be copied into Vercel or committed to the repository.

## Vercel dashboard variable

Set only this public variable in Vercel:

- `VITE_GXEON_API_BASE_URL=https://YOUR-RAILWAY-API`

Do not add GitHub tokens, GitHub private keys, GitHub client secrets, or installation tokens to Vercel.

## Deployment validation

After setting variables:

1. Redeploy the Railway API server.
2. Redeploy the Vercel dashboard.
3. Open `/ops/connectors/github`.
4. Click **Connect GitHub**.
5. Install the app and return to GXEON.
6. Confirm the dashboard reports `CONNECTED_READONLY` with connection mode `github_app_installation`.
