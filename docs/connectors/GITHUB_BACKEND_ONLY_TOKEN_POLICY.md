# GitHub Backend-Only Token Policy

## Principle

The GitHub connector credential is a backend runtime secret. It must not appear in the dashboard source code, built frontend assets, browser storage, cookies or operator input fields.

## Required controls

1. Store the credential only in backend runtime environment settings.
2. Do not use frontend-public environment prefixes for the GitHub credential.
3. Do not pass provider credentials through API responses.
4. Do not log provider credentials or request headers.
5. Keep all GitHub traffic in backend connector modules.
6. Keep the dashboard limited to `/api/connectors/github/snapshot` for data reads.

## Verification

Run these checks before release:

```bash
rg -n "VITE_.*GITHUB|localStorage|sessionStorage|document\\.cookie|api\\.github\\.com|GITHUB_CONNECTOR_TOKEN" artifacts/gxeon-dashboard/src || true
rg -n "POST /api/connectors/github|issue_creation|pull_request_creation|branch_deletion|repository_writes" server artifacts/gxeon-dashboard/src || true
```

The GitHub connector service should only reference the internal snapshot route. Any frontend GitHub provider URL or credential reference is a release blocker.

## Rollback

Remove the backend runtime credential or disable the connector route deployment. The dashboard will return to `READY` with an empty safe snapshot when credentials are absent.
