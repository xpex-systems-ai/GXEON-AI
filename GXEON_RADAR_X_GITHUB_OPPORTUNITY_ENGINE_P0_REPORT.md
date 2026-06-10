# GXEON Radar X GitHub Opportunity Engine P0 Report

## Implementation summary

Radar X now supports two P0 preview modes:

1. Manual Intake Preview: unchanged operator-submitted intake, no persistence and no automation.
2. GitHub Opportunity Preview: backend-only read-only GitHub REST API search with preview scoring and strict runtime boundaries.

## Files changed

- `artifacts/api-server/src/radar/githubOpportunityTypes.ts`
- `artifacts/api-server/src/radar/githubOpportunityClient.ts`
- `artifacts/api-server/src/radar/githubOpportunityScoring.ts`
- `artifacts/api-server/src/radar/radarManualIntake.ts`
- `artifacts/api-server/src/routes/radar.ts`
- `artifacts/gxeon-dashboard/src/services/radarService.ts`
- `artifacts/gxeon-dashboard/src/pages/RadarXOperationalPage.tsx`
- `docs/radar/RADAR_X_GITHUB_OPPORTUNITY_ENGINE_P0.md`

## Safety posture

- GitHub discovery runs only on the backend.
- GitHub HTML scraping is not used.
- GitHub writes are not implemented.
- Browser code calls only GXEON backend routes.
- P0 responses are preview-only and include no persistence path.
- External contact and marketplace automation remain disabled.

## API validation URLs

- `GET /api/radar/status`
- `GET /api/radar/github/status`
- `POST /api/radar/github/search-preview`
- `POST /api/radar/github/score-preview`

## Expected runtime behavior

Without a backend token, the API performs public GitHub REST API search with a stricter default cap. If GitHub rate-limits the request, the route fails closed with a normalized diagnostic.

With a backend token from `GITHUB_TOKEN`, `GITHUB_READONLY_TOKEN` or the existing `GITHUB_CONNECTOR_TOKEN`, the API can return up to ten preview-only scored candidates.

## Follow-up hardening

After the production heartbeat confirmed `authenticated: false`, the preview response was hardened with explicit public-mode diagnostics: `normalizedQuery`, `effectiveLimit`, `authenticated` and REST endpoint metadata. Repository metadata enrichment is best-effort so one public repository metadata read failure does not discard the entire issue-search preview response.
