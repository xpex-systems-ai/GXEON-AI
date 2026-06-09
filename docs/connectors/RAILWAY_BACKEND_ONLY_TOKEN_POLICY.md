# Railway Backend-only Token Policy

## Policy

`RAILWAY_TOKEN` must exist only in the backend runtime that serves the GXEON api-server. It must not be added to Vite variables, browser bundles, local storage, session storage, cookies, screenshots, logs, or dashboard forms.

## Allowed frontend behavior

The dashboard may call only GXEON backend routes:

- `/api/connectors/railway/diagnostics`
- `/api/connectors/railway/snapshot`
- `/api/connectors/railway/activity`

The dashboard must not call Railway APIs directly and must not send an Authorization header to Railway.

## Safe output

Safe fields include counts, status labels, timestamps, public domains, provider error classes, and variable presence booleans. Unsafe fields include token values, environment variable values, request headers, raw build logs, cookies, and secret-like names.

## Operator setup

1. Add `RAILWAY_TOKEN` to the Railway api-server variables.
2. Optionally add `RAILWAY_TEAM_ID`.
3. Optionally add `RAILWAY_PROJECT_ID` for the production project.
4. Optionally add `RAILWAY_ENVIRONMENT_ID` for the production environment.
5. Redeploy the api-server.
6. Open diagnostics and snapshot URLs to confirm read-only status.

## Incident response

If a token is accidentally exposed, rotate it in Railway immediately, redeploy the api-server, invalidate cached logs or artifacts containing it, and verify the dashboard bundle contains no Railway token variable names or values.
