# GitHub Fine-Grained Read-Only Setup

## Operator setup

1. Open GitHub fine-grained personal token settings or the selected GitHub App installation settings.
2. Select only `xpex-systems-ai/GXEON-AI` for repository access.
3. Grant read-only permissions for metadata, contents, pull requests and issues.
4. Do not grant write permissions.
5. Copy the credential into the backend runtime secret named `GITHUB_CONNECTOR_TOKEN`.
6. Set `GITHUB_CONNECTOR_OWNER=xpex-systems-ai` in backend runtime settings when overriding defaults.
7. Set `GITHUB_CONNECTOR_REPO=GXEON-AI` in backend runtime settings when overriding defaults.
8. Redeploy the backend runtime.
9. Open `/ops/connectors/github` and confirm the status changes from `READY` to `CONNECTED_READONLY`.

## Expected dashboard behavior

- `READY`: backend route exists, but runtime credential is missing.
- `CONNECTED_READONLY`: backend successfully read repository metadata, branches, pull requests, issues and commits.
- `FAILED`: backend credential exists, but a GitHub read failed or was rate-limited.

## Verification commands

```bash
curl -I http://localhost:3000/api/connectors/github/status || true
curl -I http://localhost:3000/api/connectors/github/snapshot || true
```

Responses should include short-lived cache headers and must not include secret values.
