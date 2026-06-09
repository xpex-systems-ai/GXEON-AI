# GXEON Supabase Connector P0 Report

## Status

Implemented Supabase Connector P0 in backend-only read-only mode.

## Backend deliverables

- Supabase connector config and safe booleans.
- Read-only client for REST, auth, storage and metadata readiness probes.
- In-memory activity ring buffer.
- Snapshot normalizer with health score and safety flags.
- API routes for diagnostics, snapshot and activity.

## Frontend deliverables

- Supabase connector service that calls only GXEON backend routes.
- Dedicated `/ops/connectors/supabase` page with status, health, readiness, runtime boundary, diagnostics, evidence timeline and activity log.
- Connector gateway override that marks Supabase connected only after backend confirms `CONNECTED_READONLY` or `PARTIAL_READONLY`.

## Secret policy

No Supabase service role key, DB URL, JWT, database password or credential value is exposed to the frontend. The dashboard does not use direct Supabase browser calls for this connector.

## P0 limitations

P0 returns metadata and readiness signals only. It does not return table rows, run migrations, alter RLS policies or create/update/delete Supabase resources.

## Operator steps after merge

1. Add `SUPABASE_URL` to Railway api-server variables.
2. Add `SUPABASE_ANON_KEY` to Railway api-server variables.
3. Optionally add `SUPABASE_SERVICE_ROLE_KEY` only to backend variables if storage metadata requires it.
4. Optionally add `SUPABASE_PROJECT_REF`.
5. Optionally add `SUPABASE_DB_URL` only to backend variables for metadata posture readiness.
6. Redeploy Railway api-server.
7. Open `/api/connectors/supabase/diagnostics`.
8. Open `/api/connectors/supabase/snapshot`.
9. Redeploy Vercel dashboard if needed.
10. Open `/ops/connectors/supabase`.
