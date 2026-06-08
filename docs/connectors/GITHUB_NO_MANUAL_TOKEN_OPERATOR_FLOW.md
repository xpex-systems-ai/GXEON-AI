# GitHub No-Manual-Token Operator Flow

Normal operation no longer asks the operator to copy or paste a GitHub token.

## Primary flow

1. The operator opens `/ops/connectors/github`.
2. The operator clicks **Connect GitHub**.
3. GXEON redirects to GitHub using a backend-generated connect URL.
4. The operator installs the GitHub App and chooses allowed repositories.
5. GitHub returns to the Railway API callback.
6. GXEON dashboard shows the connected read-only state after the backend confirms snapshot access.

## What the frontend never receives

- GitHub App client secret
- GitHub App private key
- GitHub installation access token
- Legacy backend token
- Any credential value that can call GitHub directly

The only Vercel dashboard variable required for the frontend is `VITE_GXEON_API_BASE_URL`, which points to the Railway API server.

## Emergency fallback

The legacy backend token remains supported only as an emergency server-side fallback. If no GitHub App installation state exists and the Railway API server has the old backend token configured, snapshots may still read the configured repository. This fallback is not exposed in the dashboard as a credential form and should not be the primary operator flow.
