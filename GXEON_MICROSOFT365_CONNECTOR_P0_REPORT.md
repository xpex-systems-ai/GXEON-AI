# GXEON Microsoft 365 Connector P0 Report

## Implemented

- Backend Microsoft 365 connector config, safe scope policy and environment presence diagnostics.
- Backend-only OAuth readiness client that validates redirect URI shape, probes Microsoft OpenID tenant metadata and generates authorize URLs server-side.
- In-memory sanitized activity ring buffer.
- Snapshot normalizer with `NOT_CONFIGURED`, `READY_FOR_CONSENT`, `CONNECTED_READONLY` and `FAILED` status support.
- API routes for diagnostics, snapshot, activity and connect-url.
- Dashboard service, dedicated `/ops/connectors/m365` page and connector gateway override.

## Read-only guarantees

- No Microsoft Graph mail, calendar, contact or drive data endpoints are called.
- No email send/delete/move logic exists.
- No calendar/contact/file write logic exists.
- No Microsoft tokens or client secrets are stored in the frontend.
- No personal data is persisted in P0.

## Operator steps after merge

1. Create Microsoft Entra App Registration.
2. Configure supported account type.
3. Add backend redirect URI.
4. Add backend runtime variables: `MICROSOFT365_TENANT_ID`, `MICROSOFT365_CLIENT_ID`, `MICROSOFT365_CLIENT_SECRET`, `MICROSOFT365_REDIRECT_URI`, `MICROSOFT365_SCOPES=offline_access User.Read`.
5. Redeploy the API server.
6. Validate `/api/connectors/microsoft365/diagnostics`, `/api/connectors/microsoft365/snapshot`, `/api/connectors/microsoft365/activity`, `/api/connectors/microsoft365/connect-url` and `/ops/connectors/m365`.

## Rollback

Unset Microsoft 365 backend runtime variables and redeploy. The connector returns `NOT_CONFIGURED` with no consent URL.
