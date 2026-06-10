# Microsoft 365 Connector P0 — Backend-Only OAuth Readiness

This connector prepares Microsoft Graph OAuth consent for GXEON's Home Center Agents communication layer. P0 is manual-first and read-only: it generates readiness diagnostics and a backend-generated consent URL, but it does not exchange authorization codes, store Microsoft tokens, call Outlook/Calendar/Contacts/OneDrive data endpoints, or persist personal data.

## Personal Outlook account is not enough for App Registration

A personal Outlook / Microsoft account can appear in Azure portal App registrations as "not contained in any directory." That state is a blocker for GXEON onboarding because Microsoft App Registration creation must happen inside a Microsoft Entra tenant/directory.

Before creating the GXEON OS Connector App Registration, the operator must create or access a valid Microsoft Entra tenant. Once inside that tenant/directory, create the App Registration, capture the Application (client) ID and Directory (tenant) ID, then create the client secret value for backend-only storage.

## Azure / Microsoft Entra App Registration

1. Open Microsoft Entra admin center from a valid tenant/directory.
2. Create the GXEON OS Connector App Registration inside that directory.
3. Select the supported account type according to the operator decision.
4. Add this Web redirect URI exactly:
   - `https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`
5. Create a client secret and store the secret **value** only in the backend runtime environment. Do not use the Secret ID as the runtime value.
6. Configure minimal delegated scopes for P0: `offline_access User.Read`.

## Railway backend environment checklist

Set these only on the API server runtime (Railway or equivalent):

- `MICROSOFT365_TENANT_ID` — Directory tenant ID from Microsoft Entra.
- `MICROSOFT365_CLIENT_ID` — Application client ID from the App Registration.
- `MICROSOFT365_CLIENT_SECRET` — Client secret value, not the Secret ID.
- `MICROSOFT365_REDIRECT_URI` — `https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`
- `MICROSOFT365_SCOPES` — `offline_access User.Read`

Never create a `VITE_` Microsoft client secret. The dashboard calls only GXEON backend routes and must never receive Microsoft tokens or secrets.

## Validation URLs

- `/api/connectors/microsoft365/diagnostics`
- `/api/connectors/microsoft365/snapshot`
- `/api/connectors/microsoft365/activity`
- `/api/connectors/microsoft365/connect-url`
- `/ops/connectors/m365`

## P0 expected states

- `NOT_CONFIGURED`: backend environment variables are missing or incomplete. Diagnostics should show which presence checks are false and provide the tenant guidance before App Registration.
- `READY_FOR_CONSENT`: a valid tenant, client, secret, redirect URI and safe scope policy are configured; Microsoft tenant metadata is reachable; the backend can generate the consent URL.
- `CONNECTED_READONLY` future: reserved for a later backend-only callback/token-storage phase after explicit approval. P0 does not exchange codes, persist tokens or read Microsoft Graph personal data.

If the tenant metadata probe returns HTTP `400` or `404`, check the tenant ID and confirm the directory exists and is available to the operator account.

## Rollback

Remove the Microsoft 365 backend environment variables and redeploy the API server. The connector will fail closed to `NOT_CONFIGURED`, and the dashboard will not expose a consent URL.
