# Supabase Backend-Only Secret Policy

## Non-negotiable rule

Supabase credentials for GXEON P0 live only in backend runtime variables. Do not create browser-exposed Supabase service role variables, do not embed database URLs in Vite variables, and do not paste credentials into dashboard UI.

## Anon key vs service role boundary

`SUPABASE_ANON_KEY` is required for backend metadata probes, but it is still handled by api-server rather than browser code. `SUPABASE_SERVICE_ROLE_KEY` is optional and must remain backend-only because it can bypass normal client authorization boundaries.

## Database URL boundary

`SUPABASE_DB_URL` may contain a database password. It is optional, backend-only and never returned by diagnostics, snapshots, activity logs or frontend services. P0 exposes only `dbUrlPresent` and safe database metadata readiness signals.

## RLS posture check

P0 reports RLS posture as safe metadata signals and counts only when available. It does not expose table rows and does not require table names in the dashboard.

## Disabled in P0

P0 disables provider writes, schema changes, SQL execution, migration controls, RLS policy changes and table row viewers. Any future writable scope must be reviewed as a separate release.
