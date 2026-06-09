# Railway Read-only Connector P0

## Purpose

The Railway connector gives GXEON a backend-only, read-only view of Railway runtime health. It is designed to mirror the existing GitHub and Vercel connector pattern: the frontend calls GXEON backend routes, the api-server reads provider metadata, and all output is normalized into a safe dashboard snapshot.

## Backend runtime variables

Configure these variables only in the api-server runtime environment:

- `RAILWAY_TOKEN` — required for live reads.
- `RAILWAY_TEAM_ID` — optional workspace/team hint.
- `RAILWAY_PROJECT_ID` — optional project selector. When omitted, the connector reads the project list and uses the first returned project for service detail.
- `RAILWAY_ENVIRONMENT_ID` — optional environment selector for future safe presence checks.
- `RAILWAY_API_BASE_URL` — optional; defaults to Railway GraphQL v2.

The diagnostics endpoint returns only safe presence booleans such as `tokenPresent`, `projectIdPresent`, and `environmentIdPresent`. It never returns variable values.

## Read-only boundary

The connector uses Railway GraphQL only for read operations that collect safe metadata:

- Viewer authorization probe.
- Project list or configured project read.
- Service metadata.
- Deployment metadata summaries.
- Domain counts and public hostnames already exposed by Railway metadata.
- Environment-variable presence boundary without returning values.

The connector does not write projects, services, domains, deployments, variables, or jobs. It does not trigger redeploys, restarts, commands, or workers.

## Validation URLs

After deployment, validate:

- `/api/connectors/railway/diagnostics`
- `/api/connectors/railway/snapshot`
- `/api/connectors/railway/activity`
- `/ops/connectors/railway`

Without `RAILWAY_TOKEN`, the expected snapshot is `READY`, `configured: false`, `lastErrorCode: MISSING_RAILWAY_TOKEN`, and zero project/service counts.

## Rollback

Rollback is safe because the connector is additive. Remove the Railway router registration and dashboard route, or revert the deployment. No Railway resources are modified by this connector.
