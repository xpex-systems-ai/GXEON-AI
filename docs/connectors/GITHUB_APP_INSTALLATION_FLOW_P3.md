# GitHub App Installation Flow P3

GXEON P3 replaces operator-managed personal access tokens with a GitHub App installation flow. The dashboard asks the Railway API server for a connect URL, redirects the browser to GitHub, and returns through the Railway callback. Secrets and short-lived installation tokens remain server-side only.

## Operator flow

1. Open GXEON dashboard at `/ops/connectors/github`.
2. Click **Connect GitHub**.
3. The dashboard calls `GET /api/connectors/github/connect-url` on the Railway API server.
4. The API server signs a short-lived state value and returns the official GitHub App installation URL.
5. GitHub asks the operator to install the app and select repository access.
6. GitHub redirects to `GET /api/connectors/github/callback` on the Railway API server.
7. The API server validates state, stores safe installation metadata, and redirects to `/ops/connectors/github?connected=github`.
8. The dashboard reads `GET /api/connectors/github/snapshot`; the backend mints an installation token on demand and reads repository data with read-only permissions.

## Backend routes

- `GET /api/connectors/github/connect-url` returns `{ url, provider, mode, stateIssuedAt }` and never returns secrets.
- `GET /api/connectors/github/callback` validates signed state and fails closed on invalid state.
- `GET /api/connectors/github/snapshot` prefers GitHub App installation state, falls back to the legacy backend token if present, or returns `READY` when not connected.
- `GET /api/connectors/github/diagnostics` returns safe readiness booleans and missing configuration codes only.

## Read-only permissions

Configure the GitHub App with only these repository permissions:

- Metadata: read
- Contents: read
- Pull requests: read
- Issues: read
- Commit statuses: read

Do not enable write permissions for contents, issues, pull requests, workflows, administration, members, secrets, or actions.

## State and tokens

The OAuth/installation state is HMAC signed, includes a nonce, issue timestamp, and intended return path, and expires quickly. Installation access tokens are minted only inside the Railway API server and are not stored in the browser or long-term connector state.
