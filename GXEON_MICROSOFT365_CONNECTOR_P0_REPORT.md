# GXEON Microsoft 365 Connector P0 Report

## Implemented

- Backend Microsoft 365 connector config, safe scope policy and environment presence diagnostics.
- Backend-only OAuth readiness client that validates redirect URI shape, probes Microsoft OpenID tenant metadata and generates authorize URLs server-side.
- In-memory sanitized activity ring buffer.
- Snapshot normalizer with `NOT_CONFIGURED`, `READY_FOR_CONSENT`, `CONNECTED_READONLY` and `FAILED` status support.
- API routes for diagnostics, snapshot, activity and connect-url.
- Dashboard service, dedicated `/ops/connectors/m365` page and connector gateway override.

## Final onboarding blocker

A personal Outlook account is not enough for GXEON App Registration onboarding when Azure portal reports the app is not contained in any directory. The operator must create or access a Microsoft Entra tenant/directory first, then create the GXEON OS Connector App Registration inside that directory.

Use this Web redirect URI exactly in the App Registration:

- `https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`

## Read-only guarantees

- No Microsoft Graph mail, calendar, contact or drive data endpoints are called.
- No email send/delete/move logic exists.
- No calendar/contact/file write logic exists.
- No Microsoft tokens or client secrets are stored in the frontend.
- No personal data is persisted in P0.

## Operator steps after merge

1. Create or access a Microsoft Entra tenant/directory.
2. Create the GXEON OS Connector App Registration inside that directory.
3. Configure supported account type.
4. Add backend Web redirect URI: `https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`.
5. Create a client secret and copy the secret value, not the Secret ID.
6. Add Railway/api-server runtime variables:
   - `MICROSOFT365_TENANT_ID`
   - `MICROSOFT365_CLIENT_ID`
   - `MICROSOFT365_CLIENT_SECRET`
   - `MICROSOFT365_REDIRECT_URI=https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`
   - `MICROSOFT365_SCOPES=offline_access User.Read`
7. Redeploy the API server.
8. Validate `/api/connectors/microsoft365/diagnostics`, `/api/connectors/microsoft365/snapshot`, `/api/connectors/microsoft365/activity`, `/api/connectors/microsoft365/connect-url` and `/ops/connectors/m365`.
9. Click Connect Microsoft 365 only after diagnostics reaches `READY_FOR_CONSENT`.

## Expected state progression

- `NOT_CONFIGURED`: tenant/app/secret/redirect/scope env vars are missing or incomplete.
- `READY_FOR_CONSENT`: tenant metadata probe succeeds, redirect URI is valid, scopes are safe and the backend consent URL is available.
- `CONNECTED_READONLY` future: reserved for a separately approved backend-only callback/token phase; not active in P0.

## Rollback

Unset Microsoft 365 backend runtime variables and redeploy. The connector returns `NOT_CONFIGURED` with no consent URL.
