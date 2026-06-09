# Microsoft 365 Backend-Only OAuth Policy

## Safety boundary

Microsoft 365 P0 is OAuth readiness only. The backend may read Microsoft identity OpenID configuration metadata and generate a consent URL. It must not call Microsoft Graph data endpoints for mail, calendar, contacts, files or directory resources in P0.

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

## Frontend policy

The frontend must not store or receive Microsoft access tokens, refresh tokens, auth codes or client secrets. There is no credential entry UI, no email viewer, no calendar editor, no contact viewer and no OneDrive file browser in P0.

## Manual-first rule

Proposal Center and Home Center Agents communication features remain manual-first. Any future personal-data read or token persistence must be designed with minimization, audit logging, operator approval and a backend-only callback flow.
