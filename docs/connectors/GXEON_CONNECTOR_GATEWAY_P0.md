# GXEON Connector Gateway P0

## Purpose

The Connector Gateway P0 foundation prepares GXEON QG for controlled, one-click style connector activation without activating real authentication flows yet. It covers GitHub, Vercel, Railway, Supabase, and Microsoft 365 in the required activation order.

## P0 boundary

- Frontend buttons are visual/control surfaces only.
- Buttons may show readiness, checklist, blocked, or preparation states.
- Buttons must not start OAuth, request tokens, call provider APIs, or write to Supabase.
- Real tokens must live only in provider dashboards or secure backend storage approved in a later phase.
- No credentials, tenant IDs, service role keys, refresh tokens, access tokens, or client secrets belong in frontend code or docs.

## Runtime model

Railway is the future connector runtime candidate. In a later phase, Railway may host server-side connector workers, scheduled jobs, health checks, and logs. P0 does not start workers or provision runtime services.

## State model

Supabase is the future connector state store candidate. In a later phase, it may store connector states, opportunity records, task records, execution records, validations, release gates, ledger entries, and metadata. P0 does not run migrations, does not write data, and does not expose service role keys.

## Communication model

Microsoft 365 is the future proposal, email, calendar, contacts, and OneDrive layer. P0 keeps Microsoft 365 manual-first: no OAuth callback, no Graph API request, no automated email, and no message sending without explicit human approval.

## Prohibited automation

GXEON Connector Gateway P0 does not scrape LinkedIn, Workana, or 99Freelas, does not automate messaging, and does not perform unauthorized collection or provider actions.
