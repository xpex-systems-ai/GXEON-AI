# GXEON Connector Security Model

## Security principles

1. Least privilege first: each provider starts with read-only or metadata-only scope where possible.
2. Backend-only secrets: credentials live only in provider dashboards or secure backend storage, never in the frontend.
3. Manual-first operations: the operator reviews readiness and approves any future activation step.
4. No accidental writes: P0 does not write to providers, Supabase, payment systems, or messaging systems.
5. No hidden network behavior: production UI must not call external APIs for connector activation during P0.

## Frontend boundary

The frontend may render cards, checklists, statuses, risks, activation order, and placeholder buttons. It must not render token inputs or embed environment values.

## Backend/runtime boundary

Future connector runtime belongs in a secure backend process. Railway may become that runtime only after a runtime review covers environment variables, worker boundaries, logs, cost controls, retry behavior, and kill switches.

## Storage boundary

Supabase may become the state store only after schema, RLS, auth, storage, audit, and service role boundaries are approved. Service role credentials must never cross into browser bundles.

## Provider-specific boundaries

- GitHub: prefer app/OAuth authorization with minimum repository permissions and read-only first.
- Vercel: read deployment and project status only after backend configuration is approved.
- Railway: host workers only after runtime/cost review.
- Supabase: persist connector state only after schema/RLS review.
- Microsoft 365: require least-privilege permissions and manual approval before emails are sent.
