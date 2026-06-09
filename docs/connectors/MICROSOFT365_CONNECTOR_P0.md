# Microsoft 365 Connector P0 — Backend-Only OAuth Readiness

This connector prepares Microsoft Graph OAuth consent for GXEON's Home Center Agents communication layer. P0 is manual-first and read-only: it generates readiness diagnostics and a backend-generated consent URL, but it does not exchange authorization codes, store Microsoft tokens, call Outlook/Calendar/Contacts/OneDrive data endpoints, or persist personal data.

## Azure / Microsoft Entra App Registration

1. Open Microsoft Entra admin center and create an App Registration.
2. Select the supported account type according to the operator decision.
3. Add the backend redirect URI exactly as configured in `MICROSOFT365_REDIRECT_URI`.
4. Create a client secret and store it only in the backend runtime environment.
5. Configure minimal delegated scopes for P0: `offline_access User.Read`.

## Backend environment variables

Set these only on the API server runtime (Railway or equivalent):

- `MICROSOFT365_TENANT_ID`
- `MICROSOFT365_CLIENT_ID`
- `MICROSOFT365_CLIENT_SECRET`
- `MICROSOFT365_REDIRECT_URI`
- `MICROSOFT365_SCOPES=offline_access User.Read`

Never create a `VITE_` Microsoft client secret. The dashboard calls only GXEON backend routes.

## Validation URLs

- `/api/connectors/microsoft365/diagnostics`
- `/api/connectors/microsoft365/snapshot`
- `/api/connectors/microsoft365/activity`
- `/api/connectors/microsoft365/connect-url`
- `/ops/connectors/m365`

## P0 expected states

Without backend environment variables the connector returns `NOT_CONFIGURED`, `configured=false`, `lastErrorCode=MISSING_MICROSOFT365_CONFIG`, and `connectUrlReady=false`.

With a valid tenant, client, secret, redirect URI and safe scopes, the connector probes Microsoft OpenID metadata and returns `READY_FOR_CONSENT` when the backend can generate a Microsoft consent URL.

## Rollback

Remove the Microsoft 365 backend environment variables and redeploy the API server. The connector will fail closed to `NOT_CONFIGURED`, and the dashboard will not expose a consent URL.
