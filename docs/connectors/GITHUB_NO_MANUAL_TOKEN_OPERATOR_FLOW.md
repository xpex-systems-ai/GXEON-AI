# GitHub No-Manual-Token Operator Flow

The preferred production flow is GitHub App installation. Operators do not paste tokens into the dashboard.

## Steps

1. Deploy the Railway API server with GitHub App variables.
2. Deploy the Vercel dashboard with only `VITE_GXEON_API_BASE_URL`.
3. Open the GitHub read-only connector page.
4. Confirm final diagnostics show backend reachability and a clear readiness code.
5. Click **Connect GitHub** and complete the official GitHub App installation.
6. Return to the dashboard and confirm connection mode is `github_app_installation`.
7. If no durable store exists, copy the safe `installation_id` metadata from diagnostics and set `GITHUB_APP_INSTALLATION_ID` in Railway, along with optional account login and repository selection metadata.

## Read-only snapshot behavior

- If installation metadata exists and `GITHUB_CONNECTOR_REPO` is set, the backend reads that repository.
- If installation metadata exists and no repo is set, the backend lists installation repositories and reads the first accessible repository.
- If the installation has no repositories, the backend returns `INSTALLATION_HAS_NO_REPOSITORIES`.
- If GitHub App token minting cannot start because the private key is missing, the backend returns `GITHUB_APP_PRIVATE_KEY_MISSING`.
- If the installation ID is invalid, the backend returns `GITHUB_APP_INSTALLATION_NOT_FOUND`.
- Backend token fallback remains available for emergency read-only runtime usage.

## Never do this

- Do not add any frontend GitHub-token environment variable to Vercel.
- Do not store GitHub access tokens in the dashboard.
- Do not store installation access tokens long-term.
- Do not request or add GitHub write permissions.
