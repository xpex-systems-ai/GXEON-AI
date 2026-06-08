# GXEON GitHub Real Connection P2

## Status

GXEON now includes a backend-only GitHub read-only connector foundation for the `xpex-systems-ai/GXEON-AI` repository. The dashboard reads from internal same-origin endpoints and never talks directly to GitHub.

## Internal routes

- `GET /api/connectors/github/status`
- `GET /api/connectors/github/snapshot`

Both routes return safe JSON only. They do not return credentials, request headers, raw GitHub payloads or database write results.

## Runtime variables

Configure these only in the backend runtime provider, such as Railway, Vercel server runtime or another server-only secret manager:

- `GITHUB_CONNECTOR_TOKEN`: fine-grained GitHub credential with read-only access to the selected repository.
- `GITHUB_CONNECTOR_OWNER`: defaults to `xpex-systems-ai`.
- `GITHUB_CONNECTOR_REPO`: defaults to `GXEON-AI`.

Never use a public frontend prefix for the GitHub connector credential.

## Fail-closed behavior

When the backend credential is missing, `/api/connectors/github/snapshot` returns `READY` with an empty safe snapshot. When GitHub reads fail, the route returns `FAILED` and a normalized error message without sensitive values.

## Read-only boundary

Allowed reads:

- Repository metadata
- Branches
- Pull requests
- Issues
- Commits
- Commit status metadata where included by GitHub read permissions

Forbidden operations:

- Repository content mutation
- Issue creation or edits
- Pull request creation, merge or edits
- Branch deletion
- Repository settings changes
- Database writes
