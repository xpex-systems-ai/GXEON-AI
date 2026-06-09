# Supabase Read-Only Connector P0

## Objective

The Supabase P0 connector gives GXEON Mission Control a backend-only, read-only view of Supabase readiness. It follows the GitHub, Vercel and Railway connector pattern: the dashboard calls only GXEON api-server routes, and api-server performs safe metadata probes.

## Backend-only environment setup

Configure these variables only in the Railway api-server runtime:

- `SUPABASE_URL` — required project API URL.
- `SUPABASE_ANON_KEY` — required anon key for safe REST metadata reachability.
- `SUPABASE_SERVICE_ROLE_KEY` — optional backend-only key for metadata endpoints that require elevated read authorization.
- `SUPABASE_PROJECT_REF` — optional presence signal; the value is never returned.
- `SUPABASE_DB_URL` — optional backend-only database URL presence signal for database metadata posture.

The connector exposes only booleans such as `urlPresent`, `anonKeyPresent`, `serviceRolePresent`, `projectRefPresent` and `dbUrlPresent`. It never returns key values, JWTs, database passwords or the database URL.

## Read-only probes

P0 uses only safe reads:

- REST metadata reachability through Supabase PostgREST metadata.
- Auth settings availability when safe.
- Storage bucket metadata counts when safe.
- Database metadata counts and RLS posture readiness signals only; no user table rows are returned.

If optional probes fail but the REST metadata probe succeeds, the connector reports `PARTIAL_READONLY`. If required backend config is absent, it reports `READY` with `MISSING_SUPABASE_CONFIG`.

## Safety boundary

P0 does not run SQL editors, schema changes, table creation, destructive operations or provider writes. The frontend has no credential UI and calls only `/api/connectors/supabase/*` on the GXEON backend.

## Validation URLs

After setting backend variables and redeploying api-server, validate:

- `/api/connectors/supabase/diagnostics`
- `/api/connectors/supabase/snapshot`
- `/api/connectors/supabase/activity`
- `/ops/connectors/supabase`

## Rollback

Remove the Supabase route registration from `artifacts/api-server/src/routes/index.ts`, revert the dashboard route to the generic connector page, and redeploy api-server and dashboard. No database state rollback is required because P0 performs no writes.
