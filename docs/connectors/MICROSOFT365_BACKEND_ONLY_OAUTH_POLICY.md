# Microsoft 365 Backend-Only OAuth Policy

## Safety boundary

Microsoft 365 P0 is OAuth readiness only. The backend may read Microsoft identity OpenID configuration metadata and generate a consent URL. It must not call Microsoft Graph data endpoints for mail, calendar, contacts, files or directory resources in P0.

## Personal Outlook account is not enough for App Registration

A personal Outlook / Microsoft account that is not contained in any directory cannot complete GXEON Microsoft 365 connector onboarding by itself. The operator must create or access a Microsoft Entra tenant/directory first, then create the GXEON OS Connector App Registration inside that directory.

The backend diagnostics may safely hint that the tenant is missing or unavailable, but they must never include client secret values, access tokens or refresh tokens. For tenant metadata `400` / `404` failures, the safe operator action is to check the tenant ID or directory availability.

## Minimal scopes

Recommended P0 scopes:

- `offline_access`
- `User.Read`

Future read-only scopes require explicit operator approval before use:

- `Mail.ReadBasic`
- `Calendars.Read`
- `Contacts.Read`
- `Files.Read.All`

## Forbidden scopes

The connector fails closed if these scopes are requested:

- `Mail.Send`
- `Mail.ReadWrite`
- `Calendars.ReadWrite`
- `Contacts.ReadWrite`
- `Files.ReadWrite`
- `Files.ReadWrite.All`
- `Directory.ReadWrite.All`
- `User.ReadWrite`
- `Group.ReadWrite.All`

## Backend runtime configuration

Required Railway/api-server environment variables:

- `MICROSOFT365_TENANT_ID`
- `MICROSOFT365_CLIENT_ID`
- `MICROSOFT365_CLIENT_SECRET`
- `MICROSOFT365_REDIRECT_URI=https://gxeon-api-server-production.up.railway.app/api/connectors/microsoft365/callback`
- `MICROSOFT365_SCOPES=offline_access User.Read`

## Expected state progression

1. `NOT_CONFIGURED` — backend env vars are absent/incomplete or tenant ID has not been configured yet.
2. `READY_FOR_CONSENT` — tenant metadata is reachable, redirect URI is valid, scopes are safe and the backend can generate the Microsoft consent URL.
3. `CONNECTED_READONLY` future — reserved for a separately approved backend-only token/callback phase; it is not activated in P0.

## Frontend policy

The frontend must not store or receive Microsoft access tokens, refresh tokens, auth codes or client secrets. There is no credential entry UI, no email viewer, no calendar editor, no contact viewer and no OneDrive file browser in P0.

## Manual-first rule

Proposal Center and Home Center Agents communication features remain manual-first. Any future personal-data read or token persistence must be designed with minimization, audit logging, operator approval and a backend-only callback flow.
